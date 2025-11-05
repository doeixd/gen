/**
 * React Form Template
 * Template for generating React form components
 */

import type { Entity } from '../entity'
import { getFieldNames, getEditableFields } from '../utils'
import { html, conditional, map } from '../tags'

export interface ReactFormTemplateOptions {
  entity: Entity<any>
  mode: 'create' | 'edit'
}

export function generateReactFormComponent(options: ReactFormTemplateOptions): string {
  const { entity, mode } = options
  const entityName = entity.name.singular
  const fields = getEditableFields(entity)

  return html`
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export interface ${entityName}FormProps {
  initialData?: Partial<${entityName}>
  onSuccess?: (data: ${entityName}) => void
  onCancel?: () => void
}

export function ${entityName}Form({ initialData, onSuccess, onCancel }: ${entityName}FormProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<Partial<${entityName}>>(initialData || {
${map(fields, (f) => `    ${String(f)}: ${JSON.stringify(entity.fields[f].defaultValue || '')},`)}
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: async (data: Partial<${entityName}>) => {
      // TODO: Implement API call
      ${mode === 'create' ? 'return await api.create(data)' : 'return await api.update(data.id, data)'}
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['${entity.db.table.name}'] })
      onSuccess?.(data)
    },
  })

  const handleChange = (field: keyof ${entityName}, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field as string]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[field as string]
        return next
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // TODO: Add validation logic based on entity.fields[field].standardSchema
${map(fields, (f) => {
  const field = entity.fields[f]
  if (!field.optional) {
    return `    if (!formData.${String(f)}) {
      newErrors.${String(f)} = '${String(f)} is required'
    }`
  }
  return ''
})}

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    mutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold">
        ${mode === 'create' ? `Create ${entityName}` : `Edit ${entityName}`}
      </h2>

${map(fields, (f) => {
  const field = entity.fields[f]
  const fieldName = String(f)
  const fieldType = field.jsType || 'string'
  const inputComponent = field.inputComponent as string

  if (inputComponent === 'TextField' || inputComponent === 'TextArea') {
    return `
      <div>
        <label className="block text-sm font-medium mb-1">
          ${fieldName}${field.optional ? '' : ' *'}
        </label>
        <${inputComponent === 'TextArea' ? 'textarea' : 'input'}
          type="${fieldType === 'number' ? 'number' : 'text'}"
          value={formData.${fieldName} || ''}
          onChange={(e) => handleChange('${fieldName}', ${fieldType === 'number' ? 'Number(e.target.value)' : 'e.target.value'})}
          className="w-full px-3 py-2 border rounded-lg"
          ${inputComponent === 'TextArea' ? 'rows={4}' : ''}
        />
        {errors.${fieldName} && (
          <p className="mt-1 text-sm text-red-600">{errors.${fieldName}}</p>
        )}
      </div>`
  } else if (inputComponent === 'NumberField') {
    return `
      <div>
        <label className="block text-sm font-medium mb-1">
          ${fieldName}${field.optional ? '' : ' *'}
        </label>
        <input
          type="number"
          value={formData.${fieldName} || 0}
          onChange={(e) => handleChange('${fieldName}', Number(e.target.value))}
          className="w-full px-3 py-2 border rounded-lg"
        />
        {errors.${fieldName} && (
          <p className="mt-1 text-sm text-red-600">{errors.${fieldName}}</p>
        )}
      </div>`
  } else if (inputComponent === 'Checkbox') {
    return `
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={formData.${fieldName} || false}
          onChange={(e) => handleChange('${fieldName}', e.target.checked)}
          className="mr-2"
        />
        <label className="text-sm font-medium">${fieldName}</label>
      </div>`
  } else {
    return `
      <div>
        <label className="block text-sm font-medium mb-1">
          ${fieldName}${field.optional ? '' : ' *'}
        </label>
        <input
          type="text"
          value={formData.${fieldName} || ''}
          onChange={(e) => handleChange('${fieldName}', e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
        {errors.${fieldName} && (
          <p className="mt-1 text-sm text-red-600">{errors.${fieldName}}</p>
        )}
      </div>`
  }
})}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving...' : '${mode === 'create' ? 'Create' : 'Update'}'}
        </button>
        ${conditional(!!onCancel, `
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Cancel
        </button>`)}
      </div>

      {mutation.isError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          Error: {mutation.error?.message || 'Failed to save'}
        </div>
      )}
    </form>
  )
}
`
}
