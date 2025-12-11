import React, { useState } from 'react'
import { z } from 'zod'
import { useAppForm } from './form-factory'

// Zod validation schema

const UserSchema = z.object({
  email: z.string().min(1, 'email is required'),
  name: z.string().min(1, 'name is required'),
  age: z.optional(z.number()),
  bio: z.optional(z.string()),
  isActive: z.boolean(),
})

type UserFormData = z.infer<typeof UserSchema>

// Main form component
export interface UserFormProps {
  initialData?: Partial<UserFormData>
  onSuccess?: (data: UserFormData & { id: string }) => void
  onCancel?: () => void
}

export function UserForm({ initialData, onSuccess, onCancel }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useAppForm({
    defaultValues: {
      email: "",
      name: "",
      age: 0,
      bio: "",
      isActive: true,
      ...initialData,
    } as UserFormData,
    validators: {
      onChange: UserSchema,
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true)
      setSubmitError(null)

      try {
        // TODO: Replace with your backend API call
        // Example: const result = await fetch('/api/users', { method: initialData?.id ? 'PUT' : 'POST', body: JSON.stringify(value) })

        // For now, simulate success and pass the data to onSuccess callback
        const result = { ...value, id: initialData?.id || 'new-id' } as UserFormData & { id: string }

        onSuccess?.(result)
      } catch (error) {

        console.error('Form submission error:', error)
        setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred')

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

          <form.AppField
            name="email"
            children={(field) => (
              <field.TextField
                label="Email"
                type="text"
                required={true}
              />
            )}
          />

          <form.AppField
            name="name"
            children={(field) => (
              <field.TextField
                label="Name"
                type="text"
                required={true}
              />
            )}
          />

          <form.AppField
            name="age"
            children={(field) => (
              <field.NumberField
                label="Age"
                required={false}
              />
            )}
          />

          <div className="sm:col-span-2">
            <form.AppField
              name="bio"
              children={(field) => (
                <field.TextArea
                  label="Bio"
                  required={false}
                />
              )}
            />
          </div>

          <div className="sm:col-span-2">
            <form.AppField
              name="isActive"
              children={(field) => (
                <field.Checkbox
                  label="IsActive"
                />
              )}
            />
          </div>
        </div>

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