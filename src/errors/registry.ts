/**
 * Error Registry
 * Registry for user-defined error types and classes
 */

import type {
  ErrorConstructor,
  ErrorTypes,
  AllErrorTypes,
  ErrorRegistryEntry,
  ErrorFactory,
  ErrorCode,
  ErrorDefinition
} from './types'
import { ErrorCodes, getErrorDefinition } from './catalog'

/**
 * Default base error class when none is registered
 */
class DefaultError extends Error implements ErrorBase {
  public readonly code?: string
  public readonly context?: Record<string, any>
  public readonly timestamp: Date | number

  constructor(
    codeOrMessage?: string,
    messageOrContext?: string | Record<string, any>,
    contextOrCause?: Record<string, any> | Error,
    cause?: Error
  ) {
    // Handle flexible constructor arguments
    let code: string | undefined
    let message: string | undefined
    let context: Record<string, any> | undefined
    let errorCause: Error | undefined

    if (typeof codeOrMessage === 'string' && typeof messageOrContext === 'string') {
      // Standard signature: (code, message, context?, cause?)
      code = codeOrMessage
      message = messageOrContext
      if (contextOrCause && typeof contextOrCause === 'object' && !(contextOrCause instanceof Error)) {
        context = contextOrCause
      }
      errorCause = cause || (contextOrCause instanceof Error ? contextOrCause : undefined)
    } else if (typeof codeOrMessage === 'string') {
      // Alternative: (code, context?, cause?)
      code = codeOrMessage
      if (messageOrContext && typeof messageOrContext === 'object') {
        context = messageOrContext
      }
      errorCause = cause || (contextOrCause instanceof Error ? contextOrCause : undefined)
    } else if (typeof codeOrMessage === 'string' || typeof messageOrContext === 'string') {
      // Simple: (message) or (code) or (message, context)
      message = typeof messageOrContext === 'string' ? messageOrContext : codeOrMessage
      code = typeof codeOrMessage === 'string' && typeof messageOrContext !== 'string' ? codeOrMessage : undefined
      if (contextOrCause && typeof contextOrCause === 'object') {
        context = contextOrCause
      }
    }

    super(message)
    this.name = 'DefaultError'
    this.code = code
    this.context = context
    this.timestamp = Date.now()
    if (errorCause) {
      this.cause = errorCause
    }
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    }
  }

  /**
   * Create a copy with additional context
   */
  withContext(additionalContext: Record<string, any>): this {
    const Constructor = this.constructor as any
    return new Constructor(
      this.code,
      this.message,
      { ...this.context, ...additionalContext },
      this.cause
    )
  }

  /**
   * Check if error matches code
   */
  is(code: ErrorCode): boolean {
    return this.code === code
  }

  /**
   * Get error definition from catalog
   */
  get definition(): ErrorDefinition | undefined {
    return this.code ? getErrorDefinition(this.code as ErrorCode) : undefined
  }

  /**
   * Get recovery suggestions
   */
  get recovery() {
    return this.definition?.recovery || []
  }
}

/**
 * Validation error class
 */
class DefaultValidationError extends DefaultError {
  constructor(
    code = ErrorCodes.VALIDATION_DATA_INVALID,
    message = 'Validation failed',
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(code, message, context, cause)
    this.name = 'ValidationError'
  }
}

/**
 * Database error class
 */
class DefaultDatabaseError extends DefaultError {
  constructor(
    code = ErrorCodes.DB_FOREIGN_KEY_VIOLATION,
    message = 'Database operation failed',
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(code, message, context, cause)
    this.name = 'DatabaseError'
  }
}

/**
 * Permission error class
 */
class DefaultPermissionError extends DefaultError {
  constructor(
    code = ErrorCodes.PERMISSION_DENIED,
    message = 'Permission denied',
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(code, message, context, cause)
    this.name = 'PermissionError'
  }
}

/**
 * Not found error class
 */
class DefaultNotFoundError extends DefaultError {
  constructor(
    code = ErrorCodes.FILE_NOT_FOUND,
    message = 'Resource not found',
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(code, message, context, cause)
    this.name = 'NotFoundError'
  }
}

/**
 * Authentication error class
 */
class DefaultAuthenticationError extends DefaultError {
  constructor(
    code = ErrorCodes.AUTH_INVALID_CREDENTIALS,
    message = 'Authentication failed',
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(code, message, context, cause)
    this.name = 'AuthenticationError'
  }
}

/**
 * Authorization error class
 */
class DefaultAuthorizationError extends DefaultError {
  constructor(
    code = ErrorCodes.AUTH_UNAUTHORIZED,
    message = 'Unauthorized access',
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(code, message, context, cause)
    this.name = 'AuthorizationError'
  }
}

/**
 * Network error class
 */
class DefaultNetworkError extends DefaultError {
  constructor(
    code = ErrorCodes.NETWORK_CONNECTION_FAILED,
    message = 'Network error',
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(code, message, context, cause)
    this.name = 'NetworkError'
  }
}

/**
 * Configuration error class
 */
class DefaultConfigurationError extends DefaultError {
  constructor(
    code = ErrorCodes.CONFIG_INVALID,
    message = 'Configuration error',
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(code, message, context, cause)
    this.name = 'ConfigurationError'
  }
}

/**
 * Runtime error class
 */
class DefaultRuntimeError extends DefaultError {
  constructor(
    code = ErrorCodes.RUNTIME_UNEXPECTED_ERROR,
    message = 'Runtime error',
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(code, message, context, cause)
    this.name = 'RuntimeError'
  }
}

/**
 * Code generation error class
 */
class DefaultCodeGenerationError extends DefaultError {
  constructor(
    code = ErrorCodes.GENERATION_TEMPLATE_ERROR,
    message = 'Code generation failed',
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(code, message, context, cause)
    this.name = 'CodeGenerationError'
  }
}

/**
 * Template error class
 */
class DefaultTemplateError extends DefaultError {
  constructor(
    code = ErrorCodes.GENERATION_TEMPLATE_ERROR,
    message = 'Template processing failed',
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(code, message, context, cause)
    this.name = 'TemplateError'
  }
}

/**
 * Schema error class
 */
class DefaultSchemaError extends DefaultError {
  constructor(
    code = ErrorCodes.VALIDATION_SCHEMA_INVALID,
    message = 'Schema validation failed',
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(code, message, context, cause)
    this.name = 'SchemaError'
  }
}

/**
 * File system error class
 */
class DefaultFileSystemError extends DefaultError {
  constructor(
    code = ErrorCodes.FILE_NOT_FOUND,
    message = 'File system error',
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(code, message, context, cause)
    this.name = 'FileSystemError'
  }
}

/**
 * Error Registry - Register custom error classes
 *
 * @example
 * ```typescript
 * // Register custom error classes
 * ErrorRegistry.registerBulk({
 *   BaseError: MyAppError,
 *   ValidationError: MyValidationError,
 *   DatabaseError: MyDatabaseError
 * })
 *
 * // Use registered errors
 * const error = ErrorRegistry.create('ValidationError', 'INVALID_INPUT', 'Invalid input provided')
 * ```
 */
export class ErrorRegistry {
  private static registry = new Map<string, ErrorRegistryEntry>()
  private static initialized = false

  /**
   * Initialize with default error classes
   */
  private static initializeDefaults(): void {
    if (this.initialized) return

    this.registerBulk({
      BaseError: DefaultError,
      ValidationError: DefaultValidationError,
      DatabaseError: DefaultDatabaseError,
      PermissionError: DefaultPermissionError,
      NotFoundError: DefaultNotFoundError,
      AuthenticationError: DefaultAuthenticationError,
      AuthorizationError: DefaultAuthorizationError,
      NetworkError: DefaultNetworkError,
      ConfigurationError: DefaultConfigurationError,
      RuntimeError: DefaultRuntimeError,
      CodeGenerationError: DefaultCodeGenerationError,
      TemplateError: DefaultTemplateError,
      SchemaError: DefaultSchemaError,
      FileSystemError: DefaultFileSystemError
    })

    this.initialized = true
  }

  /**
   * Register a single error class
   */
  static register<K extends keyof AllErrorTypes>(
    name: K,
    constructor: AllErrorTypes[K],
    factory?: ErrorFactory<AllErrorTypes[K]>
  ): void {
    this.initializeDefaults()

    this.registry.set(name as string, {
      constructor: constructor as ErrorConstructor,
      factory: factory as ErrorFactory | undefined
    })
  }

  /**
   * Register multiple error classes at once
   */
  static registerBulk(types: Partial<AllErrorTypes>): void {
    this.initializeDefaults()

    Object.entries(types).forEach(([name, constructor]) => {
      if (constructor) {
        this.register(name as keyof AllErrorTypes, constructor)
      }
    })
  }

  /**
   * Get a registered error constructor
   */
  static get<K extends keyof AllErrorTypes>(name: K): AllErrorTypes[K] | undefined {
    this.initializeDefaults()
    const entry = this.registry.get(name as string)
    return entry?.constructor as AllErrorTypes[K] | undefined
  }

  /**
   * Get a registered error factory
   */
  static getFactory<K extends keyof AllErrorTypes>(name: K): ErrorFactory<AllErrorTypes[K]> | undefined {
    this.initializeDefaults()
    const entry = this.registry.get(name as string)
    return entry?.factory as ErrorFactory<AllErrorTypes[K]> | undefined
  }

  /**
   * Create an error instance using registered constructor
   */
  static create<K extends keyof AllErrorTypes>(
    name: K,
    ...args: ConstructorParameters<AllErrorTypes[K]>
  ): InstanceType<AllErrorTypes[K]> {
    const Constructor = this.get(name)
    if (!Constructor) {
      throw new DefaultError(
        ErrorCodes.RUNTIME_UNEXPECTED_ERROR,
        `Error type '${name}' not registered`,
        { errorType: name }
      )
    }

    return new Constructor(...args)
  }

  /**
   * Create an error using factory if available, otherwise constructor
   */
  static createWithFactory<K extends keyof AllErrorTypes>(
    name: K,
    ...args: Parameters<ErrorFactory<AllErrorTypes[K]>>
  ): InstanceType<AllErrorTypes[K]> {
    const factory = this.getFactory(name)
    if (factory) {
      return factory(...args)
    }

    // Fall back to constructor with same args
    return this.create(name, ...(args as ConstructorParameters<AllErrorTypes[K]>))
  }

  /**
   * Check if an error type is registered
   */
  static has(name: keyof AllErrorTypes): boolean {
    this.initializeDefaults()
    return this.registry.has(name as string)
  }

  /**
   * Get all registered error type names
   */
  static getAll(): string[] {
    this.initializeDefaults()
    return Array.from(this.registry.keys())
  }

  /**
   * List all registered error type names (alias for getAll)
   */
  static list(): string[] {
    return this.getAll()
  }

  /**
   * Clear all registered error types (except defaults will be re-initialized)
   */
  static clear(): void {
    this.registry.clear()
    this.initialized = false
  }

  /**
   * Get registry entry for a type
   */
  static getEntry<K extends keyof AllErrorTypes>(name: K): ErrorRegistryEntry | undefined {
    this.initializeDefaults()
    return this.registry.get(name as string)
  }

  /**
   * Create error from catalog definition
   */
  static createFromCatalog(
    code: ErrorCode,
    context?: Record<string, any>,
    cause?: Error
  ): ErrorBase {
    const definition = getErrorDefinition(code)
    if (!definition) {
      return new DefaultError(
        ErrorCodes.RUNTIME_UNEXPECTED_ERROR,
        `Unknown error code: ${code}`,
        { code }
      )
    }

    // Map error category to default error type
    const errorTypeMap: Record<string, keyof AllErrorTypes> = {
      entity: 'RuntimeError',
      database: 'DatabaseError',
      validation: 'ValidationError',
      permission: 'PermissionError',
      authentication: 'AuthenticationError',
      authorization: 'AuthorizationError',
      network: 'NetworkError',
      filesystem: 'FileSystemError',
      configuration: 'ConfigurationError',
      generation: 'CodeGenerationError',
      runtime: 'RuntimeError'
    }

    const errorType = errorTypeMap[definition.category] || 'BaseError'

    return this.create(errorType, code, definition.message, context, cause)
  }
}

// Export default error classes for direct use
export {
  DefaultError as BaseError,
  DefaultValidationError as ValidationError,
  DefaultDatabaseError as DatabaseError,
  DefaultPermissionError as PermissionError,
  DefaultNotFoundError as NotFoundError,
  DefaultAuthenticationError as AuthenticationError,
  DefaultAuthorizationError as AuthorizationError,
  DefaultNetworkError as NetworkError,
  DefaultConfigurationError as ConfigurationError,
  DefaultRuntimeError as RuntimeError,
  DefaultCodeGenerationError as CodeGenerationError,
  DefaultTemplateError as TemplateError,
  DefaultSchemaError as SchemaError,
  DefaultFileSystemError as FileSystemError
}

// Export global types for convenience
export type { ErrorBase, ErrorConstructor, ErrorTypes, AllErrorTypes }
