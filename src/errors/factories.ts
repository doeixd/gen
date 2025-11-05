/**
 * Error Factories
 * Type-safe error creation functions
 */

import type { ErrorCode, ErrorInstance, ErrorBase } from './types'
import { ErrorRegistry, BaseError, ValidationError, DatabaseError, PermissionError, NotFoundError, AuthenticationError, AuthorizationError, NetworkError, ConfigurationError, RuntimeError, CodeGenerationError, TemplateError, SchemaError, FileSystemError } from './registry'
import { getErrorDefinition } from './catalog'

/**
 * Create a base error
 */
export function createBaseError(
  code?: ErrorCode,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  return new BaseError(code, message, context, cause) as ErrorBase
}

/**
 * Create a validation error
 */
export function createValidationError(
  code: ErrorCode = 'VALIDATION_DATA_INVALID' as ErrorCode,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  const definition = getErrorDefinition(code)
  return new ValidationError(code, message || definition?.message, context, cause) as ErrorBase
}

/**
 * Create a database error
 */
export function createDatabaseError(
  code: ErrorCode = 'DB_FOREIGN_KEY_VIOLATION' as ErrorCode,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  const definition = getErrorDefinition(code)
  return new DatabaseError(code, message || definition?.message, context, cause) as ErrorBase
}

/**
 * Create a permission error
 */
export function createPermissionError(
  code: ErrorCode = 'PERMISSION_DENIED' as ErrorCode,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  const definition = getErrorDefinition(code)
  return new PermissionError(code, message || definition?.message, context, cause) as ErrorBase
}

/**
 * Create a not found error
 */
export function createNotFoundError(
  code: ErrorCode = 'FILE_NOT_FOUND' as ErrorCode,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  const definition = getErrorDefinition(code)
  return new NotFoundError(code, message || definition?.message, context, cause) as ErrorBase
}

/**
 * Create an authentication error
 */
export function createAuthenticationError(
  code: ErrorCode = 'AUTH_INVALID_CREDENTIALS' as ErrorCode,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  const definition = getErrorDefinition(code)
  return new AuthenticationError(code, message || definition?.message, context, cause) as ErrorBase
}

/**
 * Create an authorization error
 */
export function createAuthorizationError(
  code: ErrorCode = 'AUTH_UNAUTHORIZED' as ErrorCode,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  const definition = getErrorDefinition(code)
  return new AuthorizationError(code, message || definition?.message, context, cause) as ErrorBase
}

/**
 * Create a network error
 */
export function createNetworkError(
  code: ErrorCode = 'NETWORK_CONNECTION_FAILED' as ErrorCode,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  const definition = getErrorDefinition(code)
  return new NetworkError(code, message || definition?.message, context, cause) as ErrorBase
}

/**
 * Create a configuration error
 */
export function createConfigurationError(
  code: ErrorCode = 'CONFIG_INVALID' as ErrorCode,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  const definition = getErrorDefinition(code)
  return new ConfigurationError(code, message || definition?.message, context, cause) as ErrorBase
}

/**
 * Create a runtime error
 */
export function createRuntimeError(
  code: ErrorCode = 'RUNTIME_UNEXPECTED_ERROR' as ErrorCode,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  const definition = getErrorDefinition(code)
  return new RuntimeError(code, message || definition?.message, context, cause) as ErrorBase
}

/**
 * Create a code generation error
 */
export function createCodeGenerationError(
  code: ErrorCode = 'GENERATION_TEMPLATE_ERROR' as ErrorCode,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  const definition = getErrorDefinition(code)
  return new CodeGenerationError(code, message || definition?.message, context, cause) as ErrorBase
}

/**
 * Create a template error
 */
export function createTemplateError(
  code: ErrorCode = 'GENERATION_TEMPLATE_ERROR' as ErrorCode,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  const definition = getErrorDefinition(code)
  return new TemplateError(code, message || definition?.message, context, cause) as ErrorBase
}

/**
 * Create a schema error
 */
export function createSchemaError(
  code: ErrorCode = 'VALIDATION_SCHEMA_INVALID' as ErrorCode,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  const definition = getErrorDefinition(code)
  return new SchemaError(code, message || definition?.message, context, cause) as ErrorBase
}

/**
 * Create a file system error
 */
export function createFileSystemError(
  code: ErrorCode = 'FILE_NOT_FOUND' as ErrorCode,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  const definition = getErrorDefinition(code)
  return new FileSystemError(code, message || definition?.message, context, cause) as ErrorBase
}

/**
 * Generic error factory - creates error based on code
 */
export function createError(
  code: ErrorCode,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  return ErrorRegistry.createFromCatalog(code, context, cause)
}

/**
 * Create error from unknown error
 */
export function createFromError(
  error: unknown,
  code: ErrorCode = 'RUNTIME_UNEXPECTED_ERROR' as ErrorCode,
  context?: Record<string, any>
): ErrorBase {
  if (error instanceof Error && 'code' in error) {
    // Already a structured error
    return error as ErrorBase
  }

  const message = error instanceof Error ? error.message : 'Unknown error'
  const cause = error instanceof Error ? error : undefined

  return createError(code, message, { ...context, originalError: error }, cause)
}

/**
 * Create error with additional context
 */
export function withContext(
  error: ErrorBase,
  additionalContext: Record<string, any>
): ErrorBase {
  if ('withContext' in error && typeof error.withContext === 'function') {
    return error.withContext(additionalContext)
  }

  // Fallback for errors without withContext method
  return createBaseError(
    error.code,
    error.message,
    { ...error.context, ...additionalContext },
    error as Error
  )
}

/**
 * Create error chain - add cause to existing error
 */
export function withCause(
  error: ErrorBase,
  cause: Error
): ErrorBase {
  return createBaseError(
    error.code,
    error.message,
    error.context,
    cause
  )
}

/**
 * Batch error creation for multiple items
 */
export function createBatchErrors<T>(
  items: T[],
  createErrorFn: (item: T, index: number) => ErrorBase | null
): { errors: ErrorBase[], validItems: T[] } {
  const errors: ErrorBase[] = []
  const validItems: T[] = []

  items.forEach((item, index) => {
    const error = createErrorFn(item, index)
    if (error) {
      errors.push(error)
    } else {
      validItems.push(item)
    }
  })

  return { errors, validItems }
}

/**
 * Conditional error creation
 */
export function createConditionalError(
  condition: boolean,
  errorFactory: () => ErrorBase
): ErrorBase | null {
  return condition ? errorFactory() : null
}

/**
 * Error builder pattern
 */
export class ErrorBuilder {
  private code?: ErrorCode
  private message?: string
  private context: Record<string, any> = {}
  private cause?: Error

  withCode(code: ErrorCode): this {
    this.code = code
    return this
  }

  withMessage(message: string): this {
    this.message = message
    return this
  }

  withContext(context: Record<string, any>): this {
    this.context = { ...this.context, ...context }
    return this
  }

  withCause(cause: Error): this {
    this.cause = cause
    return this
  }

  addContext(key: string, value: any): this {
    this.context[key] = value
    return this
  }

  build(): ErrorBase {
    if (!this.code) {
      throw createConfigurationError(
        'CONFIG_MISSING_REQUIRED' as ErrorCode,
        'Error code is required for ErrorBuilder'
      )
    }

    return createError(this.code, this.message, this.context, this.cause)
  }
}

/**
 * Create error using builder pattern
 */
export function buildError(): ErrorBuilder {
  return new ErrorBuilder()
}

// Export commonly used factory functions
export const errors = {
  base: createBaseError,
  validation: createValidationError,
  database: createDatabaseError,
  permission: createPermissionError,
  notFound: createNotFoundError,
  auth: createAuthenticationError,
  authz: createAuthorizationError,
  network: createNetworkError,
  config: createConfigurationError,
  runtime: createRuntimeError,
  generation: createCodeGenerationError,
  template: createTemplateError,
  schema: createSchemaError,
  filesystem: createFileSystemError,
  from: createFromError,
  withContext,
  withCause,
  create: createError,
  build: buildError
} as const
