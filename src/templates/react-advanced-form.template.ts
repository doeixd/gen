/**
 * Advanced React Form Template
 * Based on old/generate-forms.ts patterns with TanStack Form, neverthrow, and permissions
 */

import type { Entity } from '../entity'
import { getFieldNames } from '../utils'

export interface ReactAdvancedFormTemplateOptions {
  entity: Entity<any>
  includePermissions: boolean
  includeValidation: boolean
  includeErrorHandling: boolean
  useConvex?: boolean
}

export function generateReactAdvancedFormComponent(options: ReactAdvancedFormTemplateOptions): string {
  const {
    entity,
    includePermissions = true,
    includeValidation = true,
    includeErrorHandling = true,
    useConvex = false
  } = options

  const entityName = entity.name.singular
  const pluralName = entity.name.plural
  const fields = getFieldNames(entity)

  const imports = `import { z } from 'zod'
import { useState } from 'react'
import type { Collection } from '@tanstack/db'
import { fromPromise } from 'neverthrow'
import { Match, Option } from 'effect'

import { useAppForm } from '@/hooks/demo.form'
import {
  TextField,
  NumberField,
  Checkbox,
  Select,
  TextArea,
} from '@/components/demo.FormComponents'
import { Errors, type AppResult } from '@/lib/errors'
import { toast } from '@/lib/toast'
import { logger } from '@/lib/logger'
${includePermissions ? "import { permissionUtils } from '../../../scripts/field-mappings.config'" : ''}`

  const componentProps = `/**
 * Props for ${entityName}Form component
 */
export interface ${entityName}FormProps {
  collection: Collection<${entityName}>
  initialData?: ${entityName}
  onSuccess?: () => void
  onCancel?: () => void
  userRoles?: string[]
  isOwner?: boolean
}`

  const zodSchema = `/**
 * Zod validation schema for ${entityName}
 */
const ${entityName.toLowerCase()}Schema = z.object({
${fields.map(f => `  ${String(f)}: z.string(), // TODO: Use actual validators from entity.fields`).join('\n')}
})`

  const formComponent = `/**
 * ${entityName} Form Component
 *
 * Auto-generated form for ${entityName} table with TanStack Form + TanStack DB integration
 */
export function ${entityName}Form({
  collection,
  initialData,
  onSuccess,
  onCancel,
  userRoles = ['user'],
  isOwner = false,
}: ${entityName}FormProps) {
  const [submitError, setSubmitError] = useState<Option.Option<string>>(Option.none())
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useAppForm({
    defaultValues: initialData
      ? {
${fields.map(f => `          ${String(f)}: initialData.${String(f)},`).join('\n')}
        }
      : {
${fields.map(f => `          ${String(f)}: '',`).join('\n')}
        },
    validators: {
      onBlur: ${entityName.toLowerCase()}Schema,
    },
    onSubmit: async ({ value }) => {
      logger.trackAction(initialData ? 'update_${entityName.toLowerCase()}' : 'create_${entityName.toLowerCase()}', {
        id: initialData?.id,
      })

      setIsSubmitting(true)
      setSubmitError(Option.none())

      const endTimer = logger.time(initialData ? 'update_${entityName.toLowerCase()}' : 'create_${entityName.toLowerCase()}')

      const id = initialData?.id || crypto.randomUUID()
      const result = await fromPromise(
        collection.insert({ id, ...value } as ${entityName}).isPersisted.promise,
        (error) => {
          // Map validation errors from Zod
          if (error instanceof z.ZodError) {
            return Errors.validation(
              'form',
              error.errors.map(e => ({
                path: e.path.map(String),
                message: e.message,
                code: e.code,
              })),
              'Form validation failed'
            )
          }

          return Errors.database(
            initialData ? 'update' : 'insert',
            \`Failed to \${initialData ? 'update' : 'create'} ${entityName.toLowerCase()}\`,
            { id, originalError: error }
          )
        }
      )

      endTimer()

      result.match(
        () => {
          setIsSubmitting(false)
          logger.info(\`${entityName} \${initialData ? 'updated' : 'created'} successfully\`, { id })
          toast.success(
            initialData ? '${entityName} updated' : '${entityName} created',
            initialData ? 'Your changes have been saved' : '${entityName} has been created successfully'
          )
          onSuccess?.()
        },
        (error) => {
          setIsSubmitting(false)
          logger.logAppError(error, \`Failed to \${initialData ? 'update' : 'create'} ${entityName.toLowerCase()}\`)
          toast.fromError(error, initialData ? 'Update failed' : 'Create failed')
          const errorMessage = Match.value(error).pipe(
            Match.when({ _tag: 'ValidationError' }, (e) => {
              const firstIssue = e.issues[0]
              return \`\${firstIssue.path.join('.')}: \${firstIssue.message}\`
            }),
            Match.when({ _tag: 'DatabaseError' }, (e) => \`Database error: \${e.message}\`),
            Match.when({ _tag: 'UnauthorizedError' }, () => 'You are not authorized to perform this action'),
            Match.when({ _tag: 'ForbiddenError' }, () => 'You do not have permission to perform this action'),
            Match.when({ _tag: 'ConflictError' }, (e) => e.conflictingField
              ? \`A ${entityName.toLowerCase()} with this \${e.conflictingField} already exists\`
              : e.message),
            Match.orElse((e) => e.message)
          )
          setSubmitError(Option.some(errorMessage))
        }
      )
    },
  })

  // Form fields configuration with permissions
  const formFields = [
${fields.map(f => `    {
      name: '${String(f)}',
      label: '${String(f).charAt(0).toUpperCase() + String(f).slice(1)}',
      component: 'TextField', // TODO: Determine from entity field config
      permissions: ${includePermissions ? `{
        read: ['admin', 'user'],
        write: ['admin', 'user'],
      }` : 'undefined'},
    },`).join('\n')}
  ]

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4 text-white"
      style={{
        backgroundImage:
          'radial-gradient(50% 50% at 5% 40%, #add8e6 0%, #0000ff 70%, #00008b 100%)',
      }}
    >
      <div className="w-full max-w-2xl p-8 rounded-xl backdrop-blur-md bg-black/50 shadow-xl border-8 border-black/10">
        <h2 className="text-3xl font-bold mb-6">
          {initialData ? 'Edit' : 'Create'} ${entityName}
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-6"
          aria-label={\`\${initialData ? 'Edit' : 'Create'} ${entityName} form\`}
        >
{formFields.map((field) => {
  ${includePermissions ? `// Check field permissions dynamically
  const canEdit${field.name.charAt(0).toUpperCase() + field.name.slice(1)} = permissionUtils.canAccessField(userRoles, field.permissions, '${initialData ? 'update' : 'create'}', isOwner)
  if (!canEdit${field.name.charAt(0).toUpperCase() + field.name.slice(1)}) return null` : ''}

  return (
    <form.Field
      key={field.name}
      name={field.name}
      children={(fieldApi) => (
        <field.component
          label={field.label}
          error={fieldApi.state.meta.errors[0]}
          {...fieldApi.getInputProps()}
        />
      )}
    />
  )
})}

          {Option.isSome(submitError) && (
            <div
              className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              <p className="font-semibold">Error</p>
              <p className="text-sm">{submitError.value}</p>
            </div>
          )}

          <div className="flex justify-end gap-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
            )}
            <form.Subscribe
              selector={(state) => [state.canSubmit]}
              children={([canSubmit]) => (
                <button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={initialData ? \`Update \${entityName}\` : \`Create \${entityName}\`}
                  aria-busy={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : (initialData ? 'Update' : 'Create')}
                </button>
              )}
            />
          </div>
        </form>
      </div>
    </div>
  )
}`

  return `${imports}

${componentProps}

${zodSchema}

${formComponent}
}`
}