/**
 * Error Factories
 * Type-safe error creation functions
 */

import type { ErrorBase } from './types'
import { ErrorRegistry, BaseError, ValidationError, DatabaseError, PermissionError, NotFoundError, AuthenticationError, AuthorizationError, NetworkError, ConfigurationError, RuntimeError, CodeGenerationError, TemplateError, SchemaError, FileSystemError } from './registry'
import { getErrorDefinition, ErrorCodes, type ErrorCode } from './catalog'

type ErrorCtor = new (
  code?: ErrorCode,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
) => ErrorBase

function createTypedError(
  Ctor: ErrorCtor,
  code: ErrorCode,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  const definition = getErrorDefinition(code)
  return new Ctor(code, message || definition?.message, context, cause)
}

/**
 * Create a base error
 */
export function createBaseError(
  code?: string,
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
  code: ErrorCode = ErrorCodes.VALIDATION_DATA_INVALID,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  return createTypedError(ValidationError as unknown as ErrorCtor, code, message, context, cause)
}

/**
 * Create a database error
 */
export function createDatabaseError(
  code: ErrorCode = ErrorCodes.DB_FOREIGN_KEY_VIOLATION,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  return createTypedError(DatabaseError as unknown as ErrorCtor, code, message, context, cause)
}

/**
 * Create a permission error
 */
export function createPermissionError(
  code: ErrorCode = ErrorCodes.PERMISSION_DENIED,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  return createTypedError(PermissionError as unknown as ErrorCtor, code, message, context, cause)
}

/**
 * Create a not found error
 */
export function createNotFoundError(
  code: ErrorCode = ErrorCodes.FILE_NOT_FOUND,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  return createTypedError(NotFoundError as unknown as ErrorCtor, code, message, context, cause)
}

/**
 * Create an authentication error
 */
export function createAuthenticationError(
  code: ErrorCode = ErrorCodes.AUTH_INVALID_CREDENTIALS,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  return createTypedError(AuthenticationError as unknown as ErrorCtor, code, message, context, cause)
}

/**
 * Create an authorization error
 */
export function createAuthorizationError(
  code: ErrorCode = ErrorCodes.AUTH_UNAUTHORIZED,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  return createTypedError(AuthorizationError as unknown as ErrorCtor, code, message, context, cause)
}

/**
 * Create a network error
 */
export function createNetworkError(
  code: ErrorCode = ErrorCodes.NETWORK_CONNECTION_FAILED,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  return createTypedError(NetworkError as unknown as ErrorCtor, code, message, context, cause)
}

/**
 * Create a configuration error
 */
export function createConfigurationError(
  code: ErrorCode = ErrorCodes.CONFIG_INVALID,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  return createTypedError(ConfigurationError as unknown as ErrorCtor, code, message, context, cause)
}

/**
 * Create a runtime error
 */
export function createRuntimeError(
  code: ErrorCode = ErrorCodes.RUNTIME_UNEXPECTED_ERROR,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  return createTypedError(RuntimeError as unknown as ErrorCtor, code, message, context, cause)
}

/**
 * Create a code generation error
 */
export function createCodeGenerationError(
  code: ErrorCode = ErrorCodes.GENERATION_TEMPLATE_ERROR,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  return createTypedError(CodeGenerationError as unknown as ErrorCtor, code, message, context, cause)
}

/**
 * Create a template error
 */
export function createTemplateError(
  code: ErrorCode = ErrorCodes.GENERATION_TEMPLATE_ERROR,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  return createTypedError(TemplateError as unknown as ErrorCtor, code, message, context, cause)
}

/**
 * Create a schema error
 */
export function createSchemaError(
  code: ErrorCode = ErrorCodes.VALIDATION_SCHEMA_INVALID,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  return createTypedError(SchemaError as unknown as ErrorCtor, code, message, context, cause)
}

/**
 * Create a file system error
 */
export function createFileSystemError(
  code: ErrorCode = ErrorCodes.FILE_NOT_FOUND,
  message?: string,
  context?: Record<string, any>,
  cause?: Error
): ErrorBase {
  return createTypedError(FileSystemError as unknown as ErrorCtor, code, message, context, cause)
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
  code: ErrorCode = ErrorCodes.RUNTIME_UNEXPECTED_ERROR,
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
        ErrorCodes.CONFIG_MISSING_REQUIRED,
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
