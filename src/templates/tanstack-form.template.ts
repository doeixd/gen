/**
 * TanStack Form Template
 * Template for generating advanced forms with TanStack Form and validation
 */

import type { Entity } from '../entity'
import { getEditableFields } from '../utils'
import { ts, conditional, map } from '../tags'

export interface TanStackFormTemplateOptions {
  entity: Entity<any>
  includeValidation?: boolean
  includeErrorHandling?: boolean
}

export function generateTanStackForm(options: TanStackFormTemplateOptions): string {
  const { entity, includeValidation = true, includeErrorHandling = true } = options
  const entityName = entity.name.singular
  const pluralName = entity.name.plural
  const tableName = entity.db.table.name
  const editableFields = getEditableFields(entity)

  return ts`
import { useForm, useAppForm } from '@tanstack/react-form'
import { useField, Field, FieldInfo } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { z } from 'zod'
import pluralize from 'pluralize'

// Import collection
import { ${pluralize.singular(tableName)}Collection } from '~/lib/collections'

// Zod validation schema
${conditional(includeValidation, `
const ${entityName}Schema = z.object({
${map(editableFields, (field) => {
  const fieldDef = entity.fields[field]
  const fieldName = String(field)
  const fieldType = fieldDef.jsType || 'string'
  const isOptional = fieldDef.optional

  let zodType: string
  switch (fieldType) {
    case 'string':
      zodType = 'z.string()'
      break
    case 'number':
      zodType = 'z.number()'
      break
    case 'boolean':
      zodType = 'z.boolean()'
      break
    default:
      zodType = 'z.any()'
  }

  if (!isOptional) {
    zodType += `.min(1, '${fieldName} is required')`
  }

  return `  ${fieldName}: ${isOptional ? `z.optional(${zodType})` : zodType},`
})}
})
`)}
type ${entityName}FormData = z.infer<typeof ${entityName}Schema>

// Form field components
function TextField({ name, label, type = 'text', placeholder, required }: {
  name: string
  label: string
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <Field
      name={name}
      validators={{
        onChange: includeValidation ? ${entityName}Schema.shape[name as keyof typeof ${entityName}Schema] : undefined,
      }}
      children={(field) => (
        <div className="space-y-2">
          <label htmlFor={name} className="block text-sm font-medium text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <input
            id={name}
            name={name}
            type={type}
            placeholder={placeholder}
            value={field.state.value || ''}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            className={\`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent \${
              field.state.meta.errors.length > 0
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300'
            }\`}
          />
          {field.state.meta.errors.length > 0 && (
            <p className="text-sm text-red-600">{field.state.meta.errors[0]}</p>
          )}
        </div>
      )}
    />
  )
}

function NumberField({ name, label, placeholder, required, min, max }: {
  name: string
  label: string
  placeholder?: string
  required?: boolean
  min?: number
  max?: number
}) {
  return (
    <Field
      name={name}
      validators={{
        onChange: includeValidation ? ${entityName}Schema.shape[name as keyof typeof ${entityName}Schema] : undefined,
      }}
      children={(field) => (
        <div className="space-y-2">
          <label htmlFor={name} className="block text-sm font-medium text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <input
            id={name}
            name={name}
            type="number"
            placeholder={placeholder}
            min={min}
            max={max}
            value={field.state.value || ''}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(Number(e.target.value) || 0)}
            className={\`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent \${
              field.state.meta.errors.length > 0
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300'
            }\`}
          />
          {field.state.meta.errors.length > 0 && (
            <p className="text-sm text-red-600">{field.state.meta.errors[0]}</p>
          )}
        </div>
      )}
    />
  )
}

function TextArea({ name, label, placeholder, required, rows = 4 }: {
  name: string
  label: string
  placeholder?: string
  required?: boolean
  rows?: number
}) {
  return (
    <Field
      name={name}
      validators={{
        onChange: includeValidation ? ${entityName}Schema.shape[name as keyof typeof ${entityName}Schema] : undefined,
      }}
      children={(field) => (
        <div className="space-y-2">
          <label htmlFor={name} className="block text-sm font-medium text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <textarea
            id={name}
            name={name}
            rows={rows}
            placeholder={placeholder}
            value={field.state.value || ''}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            className={\`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent \${
              field.state.meta.errors.length > 0
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300'
            }\`}
          />
          {field.state.meta.errors.length > 0 && (
            <p className="text-sm text-red-600">{field.state.meta.errors[0]}</p>
          )}
        </div>
      )}
    />
  )
}

function Checkbox({ name, label }: {
  name: string
  label: string
}) {
  return (
    <Field
      name={name}
      children={(field) => (
        <div className="flex items-center space-x-2">
          <input
            id={name}
            name={name}
            type="checkbox"
            checked={field.state.value || false}
            onChange={(e) => field.handleChange(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor={name} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        </div>
      )}
    />
  )
}

function Select({ name, label, options, required }: {
  name: string
  label: string
  options: { value: string; label: string }[]
  required?: boolean
}) {
  return (
    <Field
      name={name}
      validators={{
        onChange: includeValidation ? ${entityName}Schema.shape[name as keyof typeof ${entityName}Schema] : undefined,
      }}
      children={(field) => (
        <div className="space-y-2">
          <label htmlFor={name} className="block text-sm font-medium text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <select
            id={name}
            name={name}
            value={field.state.value || ''}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            className={\`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent \${
              field.state.meta.errors.length > 0
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300'
            }\`}
          >
            <option value="">Select an option</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {field.state.meta.errors.length > 0 && (
            <p className="text-sm text-red-600">{field.state.meta.errors[0]}</p>
          )}
        </div>
      )}
    />
  )
}

// Main form component
export interface ${entityName}FormProps {
  initialData?: Partial<${entityName}FormData>
  onSuccess?: (data: ${entityName}FormData & { id: string }) => void
  onCancel?: () => void
}

export function ${entityName}Form({ initialData, onSuccess, onCancel }: ${entityName}FormProps) {
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
${map(editableFields, (field) => {
  const fieldDef = entity.fields[field]
  const defaultValue = fieldDef.defaultValue
  const fieldType = fieldDef.jsType || 'string'

  let defaultVal: string
  switch (fieldType) {
    case 'string':
      defaultVal = defaultValue ? `"${defaultValue}"` : '""'
      break
    case 'number':
      defaultVal = String(defaultValue || 0)
      break
    case 'boolean':
      defaultVal = String(defaultValue || false)
      break
    default:
      defaultVal = 'undefined'
  }

  return `      ${String(field)}: ${defaultVal},`
})}
      ...initialData,
    } as ${entityName}FormData,
    onSubmit: async ({ value }) => {
      setIsSubmitting(true)
      setSubmitError(null)

      try {
        let result
        if (initialData?.id) {
          // Update existing
          const tx = ${pluralize.singular(tableName)}Collection.update(initialData.id, value)
          result = await tx.isPersisted.promise
        } else {
          // Create new
          const tx = ${pluralize.singular(tableName)}Collection.insert(value)
          result = await tx.isPersisted.promise
        }

        onSuccess?.(result)
      } catch (error) {
${conditional(includeErrorHandling, `
        console.error('Form submission error:', error)
        setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred')
`)}
      } finally {
        setIsSubmitting(false)
      }
    },
  })

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
${map(editableFields, (field) => {
  const fieldDef = entity.fields[field]
  const fieldName = String(field)
  const fieldType = fieldDef.jsType || 'string'
  const inputComponent = fieldDef.inputComponent as string
  const isRequired = !fieldDef.optional

  if (inputComponent === 'TextArea') {
    return `
          <div className="sm:col-span-2">
            <TextArea
              name="${fieldName}"
              label="${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}"
              required={${isRequired}}
            />
          </div>`
  } else if (inputComponent === 'NumberField') {
    return `
          <NumberField
            name="${fieldName}"
            label="${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}"
            required={${isRequired}}
          />`
  } else if (inputComponent === 'Checkbox') {
    return `
          <div className="sm:col-span-2">
            <Checkbox
              name="${fieldName}"
              label="${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}"
            />
          </div>`
  } else if (inputComponent === 'Select') {
    // For select, we'd need options - this is a placeholder
    return `
          <Select
            name="${fieldName}"
            label="${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}"
            options={[]} // TODO: Add options
            required={${isRequired}}
          />`
  } else {
    return `
          <TextField
            name="${fieldName}"
            label="${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}"
            type="${fieldType === 'number' ? 'number' : 'text'}"
            required={${isRequired}}
          />`
  }
})}
        </div>

${conditional(includeErrorHandling, `
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{submitError}</p>
                </div>
              </div>
            </div>
          </div>
        )}
`)}
        <div className="flex justify-end space-x-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isFormSubmitting]) => (
              <button
                type="submit"
                disabled={!canSubmit || isFormSubmitting || isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : initialData ? 'Update ${entityName}' : 'Create ${entityName}'}
              </button>
            )}
          />
        </div>
      </form>
    </div>
  )
}
`
}
