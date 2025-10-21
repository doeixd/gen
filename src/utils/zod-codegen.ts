/**
 * Zod Code Generation Utilities
 *
 * Convert field configurations to Zod schema code strings
 */

import type { ParsedField } from './schema-parser'
import { GeneratorError, GeneratorErrorCode } from './errors'
import { Result, ok, err } from 'neverthrow'

export interface ZodCodegenOptions {
  includeErrorMessages?: boolean
  useStandardSchema?: boolean
}

/**
 * Convert a parsed field to Zod schema code
 */
export function zodToCode(
  field: ParsedField,
  options: ZodCodegenOptions = {}
): Result<string, GeneratorError> {
  try {
    const { includeErrorMessages = true, useStandardSchema = false } = options

    let zodCode = ''

    // Base type
    switch (field.type) {
      case 'string':
        zodCode = 'z.string()'
        if (field.config?.maxLength) {
          zodCode += `.max(${field.config.maxLength}${includeErrorMessages ? `, "Must be at most ${field.config.maxLength} characters"` : ''})`
        }
        if (field.config?.minLength) {
          zodCode += `.min(${field.config.minLength}${includeErrorMessages ? `, "Must be at least ${field.config.minLength} characters"` : ''})`
        }
        if (field.config?.pattern) {
          zodCode += `.regex(${field.config.pattern}${includeErrorMessages ? ', "Invalid format"' : ''})`
        }
        break

      case 'number':
        zodCode = 'z.number()'
        if (field.config?.minimum !== undefined) {
          zodCode += `.min(${field.config.minimum}${includeErrorMessages ? `, "Must be at least ${field.config.minimum}"` : ''})`
        }
        if (field.config?.maximum !== undefined) {
          zodCode += `.max(${field.config.maximum}${includeErrorMessages ? `, "Must be at most ${field.config.maximum}"` : ''})`
        }
        if (field.config?.integer) {
          zodCode += `.int(${includeErrorMessages ? '"Must be an integer"' : ''})`
        }
        break

      case 'boolean':
        zodCode = 'z.boolean()'
        break

      case 'date':
        zodCode = 'z.date()'
        break

      case 'id':
        zodCode = 'z.string().uuid()'
        break

      case 'email':
        zodCode = `z.string().email(${includeErrorMessages ? '"Invalid email address"' : ''})`
        break

      case 'url':
        zodCode = `z.string().url(${includeErrorMessages ? '"Invalid URL"' : ''})`
        break

      default:
        zodCode = 'z.any()'
    }

    // Optional/nullable
    if (field.isOptional) {
      zodCode += '.optional()'
    }

    // Default value
    if (field.config?.default !== undefined) {
      const defaultVal = typeof field.config.default === 'string'
        ? `"${field.config.default}"`
        : field.config.default
      zodCode += `.default(${defaultVal})`
    }

    // Transform to StandardSchema if requested
    if (useStandardSchema) {
      zodCode = `(${zodCode}) as StandardSchema<${getTypeScriptType(field)}>`
    }

    return ok(zodCode)
  } catch (error) {
    return err(
      new GeneratorError(
        GeneratorErrorCode.CODE_GENERATION_ERROR,
        `Failed to generate Zod code for field ${field.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { fieldName: field.name },
        error instanceof Error ? error : undefined
      )
    )
  }
}

/**
 * Generate TypeScript type from field
 */
function getTypeScriptType(field: ParsedField): string {
  let tsType: string
  switch (field.type) {
    case 'string':
    case 'id':
    case 'email':
    case 'url':
      tsType = 'string'
      break
    case 'number':
      tsType = 'number'
      break
    case 'boolean':
      tsType = 'boolean'
      break
    case 'date':
      tsType = 'Date'
      break
    default:
      tsType = 'any'
  }

  if (field.isOptional) {
    tsType += ' | undefined'
  }

  return tsType
}

/**
 * Generate complete Zod schema for multiple fields
 */
export function generateZodSchema(
  fields: ParsedField[],
  options: ZodCodegenOptions & { schemaName?: string } = {}
): Result<string, GeneratorError> {
  try {
    const { schemaName = 'GeneratedSchema', ...zodOptions } = options

    const fieldSchemas: string[] = []

    for (const field of fields) {
      const zodResult = zodToCode(field, zodOptions)
      if (zodResult.isErr()) {
        return err(zodResult.error)
      }
      fieldSchemas.push(`  ${field.name}: ${zodResult.value},`)
    }

    const schemaCode = `export const ${schemaName} = z.object({
${fieldSchemas.join('\n')}
})`

    return ok(schemaCode)
  } catch (error) {
    return err(
      new GeneratorError(
        GeneratorErrorCode.CODE_GENERATION_ERROR,
        `Failed to generate Zod schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error instanceof Error ? error : undefined
      )
    )
  }
}

/**
 * Generate form validation schema
 */
export function generateFormValidationSchema(
  fields: ParsedField[],
  options: ZodCodegenOptions = {}
): Result<string, GeneratorError> {
  const schemaResult = generateZodSchema(fields, {
    ...options,
    schemaName: 'FormValidationSchema'
  })

  if (schemaResult.isErr()) {
    return err(schemaResult.error)
  }

  const formCode = `${schemaResult.value}

// Export inferred type
export type FormData = z.infer<typeof FormValidationSchema>

// Validation helper
export function validateFormData(data: unknown): Result<FormData, string> {
  const result = FormValidationSchema.safeParse(data)
  if (result.success) {
    return ok(result.data)
  } else {
    return err(result.error.errors.map(e => \`\${e.path.join('.')}: \${e.message}\`).join(', '))
  }
}`

  return ok(formCode)
}