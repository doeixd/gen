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
  const tableName = entity.db.table.name
  const editableFields = getEditableFields(entity)

  return ts`
import React, { useState } from 'react'
import { z } from 'zod'
import { useAppForm } from './form-factory'

// Zod validation schema
${conditional(includeValidation, `
const ${entityName}Schema = z.object({
${map(editableFields, (field) => {
    const fieldName = String(field)
    const fieldDef = entity.fields[fieldName]
    const fieldType = fieldDef.jsType || 'string'
    const isOptional = fieldDef.optional

    let zodType: string
    switch (fieldType) {
      case 'string':
        zodType = 'z.string()'
        if (!isOptional) {
          zodType += `.min(1, '${fieldName} is required')`
        }
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

    return `  ${fieldName}: ${isOptional ? `z.optional(${zodType})` : zodType},`
})}
})
`)}
type ${entityName}FormData = z.infer<typeof ${entityName}Schema>

// Main form component
export interface ${entityName}FormProps {
  initialData?: Partial<${entityName}FormData>
  onSuccess?: (data: ${entityName}FormData & { id: string }) => void
  onCancel?: () => void
}

export function ${entityName}Form({ initialData, onSuccess, onCancel }: ${entityName}FormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useAppForm({
    defaultValues: {
${map(editableFields, (field) => {
        const fieldName = String(field)
        const fieldDef = entity.fields[fieldName]
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
    validators: {
      onChange: ${includeValidation ? `${entityName}Schema` : 'undefined'},
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true)
      setSubmitError(null)

      try {
        // TODO: Replace with your backend API call
        // Example: const result = await fetch('/api/${tableName}', { method: initialData?.id ? 'PUT' : 'POST', body: JSON.stringify(value) })

        // For now, simulate success and pass the data to onSuccess callback
        const result = { ...value, id: initialData?.id || 'new-id' } as ${entityName}FormData & { id: string }

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
              const fieldName = String(field)
              const fieldDef = entity.fields[fieldName]
              const fieldType = fieldDef.jsType || 'string'
              // Extract component name if it's a ComponentWithProps, otherwise use the component type directly
              const inputComponent = typeof fieldDef.inputComponent === 'object' && fieldDef.inputComponent !== null && 'component' in fieldDef.inputComponent
                ? String(fieldDef.inputComponent.component)
                : String(fieldDef.inputComponent || 'TextField')
              const isRequired = !fieldDef.optional

              if (inputComponent === 'TextArea') {
                return `
          <div className="sm:col-span-2">
            <form.AppField
              name="${fieldName}"
              children={(field) => (
                <field.TextArea
                  label="${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}"
                  required={${isRequired}}
                />
              )}
            />
          </div>`
              } else if (inputComponent === 'NumberField') {
                return `
          <form.AppField
            name="${fieldName}"
            children={(field) => (
              <field.NumberField
                label="${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}"
                required={${isRequired}}
              />
            )}
          />`
              } else if (inputComponent === 'Checkbox') {
                return `
          <div className="sm:col-span-2">
            <form.AppField
              name="${fieldName}"
              children={(field) => (
                <field.Checkbox
                  label="${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}"
                />
              )}
            />
          </div>`
              } else if (inputComponent === 'Select') {
                return `
          <form.AppField
            name="${fieldName}"
            children={(field) => (
              <field.Select
                label="${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}"
                options={[]} // TODO: Add options
                required={${isRequired}}
              />
            )}
          />`
              } else {
                return `
          <form.AppField
            name="${fieldName}"
            children={(field) => (
              <field.TextField
                label="${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}"
                type="${fieldType === 'number' ? 'number' : 'text'}"
                required={${isRequired}}
              />
            )}
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
                disabled={!canSubmit || isFormSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFormSubmitting ? 'Submitting...' : initialData?.id ? 'Update' : 'Create'}
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
