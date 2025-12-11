import React from 'react'

// Generic Field Component Props
// TanStack Form passes the field API as props to registered field components
// These match the TanStack Form v5 field component API

interface FieldMeta {
  errors: string[]
  errorMap: Record<string, string>
  isValid: boolean
  isDirty: boolean
  isTouched: boolean
  isValidating: boolean
  isPristine: boolean
}

interface FieldProps {
  // TanStack Form field API (passed automatically)
  state: {
    value: any
    meta: FieldMeta
  }
  handleChange: (value: any) => void
  handleBlur: () => void
  name: string

  // Custom props (specified by user)
  label?: string
  placeholder?: string
  type?: string
  required?: boolean
}

export function TextField({ state, handleChange, handleBlur, name, label, placeholder, type = 'text', required }: FieldProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={state.value || ''}
        onBlur={handleBlur}
        onChange={(e) => handleChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          state.meta.errors.length > 0
            ? 'border-red-300 focus:ring-red-500'
            : 'border-gray-300'
        }`}
      />
      {state.meta.errors.length > 0 && (
        <p className="text-sm text-red-600">{state.meta.errors[0]}</p>
      )}
    </div>
  )
}

export function NumberField({ state, handleChange, handleBlur, name, label, placeholder, required, min, max }: FieldProps & { min?: number, max?: number }) {
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type="number"
        placeholder={placeholder}
        min={min}
        max={max}
        value={state.value || ''}
        onBlur={handleBlur}
        onChange={(e) => handleChange(Number(e.target.value))}
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          state.meta.errors.length > 0
            ? 'border-red-300 focus:ring-red-500'
            : 'border-gray-300'
        }`}
      />
      {state.meta.errors.length > 0 && (
        <p className="text-sm text-red-600">{state.meta.errors[0]}</p>
      )}
    </div>
  )
}

export function TextArea({ state, handleChange, handleBlur, name, label, placeholder, required, rows = 4 }: FieldProps & { rows?: number }) {
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        rows={rows}
        placeholder={placeholder}
        value={state.value || ''}
        onBlur={handleBlur}
        onChange={(e) => handleChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          state.meta.errors.length > 0
            ? 'border-red-300 focus:ring-red-500'
            : 'border-gray-300'
        }`}
      />
      {state.meta.errors.length > 0 && (
        <p className="text-sm text-red-600">{state.meta.errors[0]}</p>
      )}
    </div>
  )
}

export function Checkbox({ state, handleChange, handleBlur, name, label }: FieldProps) {
  return (
    <div className="flex items-center space-x-2">
      <input
        id={name}
        name={name}
        type="checkbox"
        checked={state.value || false}
        onChange={(e) => handleChange(e.target.checked)}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
      />
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label}
      </label>
    </div>
  )
}

export function Select({ state, handleChange, handleBlur, name, label, options, required }: FieldProps & { options: { value: string; label: string }[] }) {
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={state.value || ''}
        onBlur={handleBlur}
        onChange={(e) => handleChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          state.meta.errors.length > 0
            ? 'border-red-300 focus:ring-red-500'
            : 'border-gray-300'
        }`}
      >
        <option value="">Select an option</option>
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {state.meta.errors.length > 0 && (
        <p className="text-sm text-red-600">{state.meta.errors[0]}</p>
      )}
    </div>
  )
}

export function SubmitButton({ disabled, isSubmitting, children }: { disabled?: boolean, isSubmitting?: boolean, children?: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={disabled || isSubmitting}
      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children || (isSubmitting ? 'Submitting...' : 'Submit')}
    </button>
  )
}