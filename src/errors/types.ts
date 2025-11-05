/**
 * Error System Types
 * Type-safe error definitions and interfaces
 */

// Global type declarations - augment this with your custom error classes
export {} // Ensure this is a module

declare global {
  /**
   * Base error class interface - minimal requirements for all errors
   */
  interface ErrorBase {
    code?: string
    message?: string
    context?: Record<string, any>
    timestamp?: Date | number
    stack?: string
  }

  /**
   * Error class constructor type - flexible to accommodate different error class signatures
   */
  type ErrorConstructor = new (...args: any[]) => ErrorBase

  /**
   * User-registered error types
   */
  interface ErrorTypes {
    // Core error types
    BaseError?: ErrorConstructor
    ValidationError?: ErrorConstructor
    DatabaseError?: ErrorConstructor
    PermissionError?: ErrorConstructor
    NotFoundError?: ErrorConstructor
    AuthenticationError?: ErrorConstructor
    AuthorizationError?: ErrorConstructor
    NetworkError?: ErrorConstructor
    ConfigurationError?: ErrorConstructor
    RuntimeError?: ErrorConstructor

    // Generator-specific errors
    CodeGenerationError?: ErrorConstructor
    TemplateError?: ErrorConstructor
    SchemaError?: ErrorConstructor
    FileSystemError?: ErrorConstructor

    // Custom user errors can be added here
    [key: string]: ErrorConstructor | undefined
  }

  /**
   * All available error types (built-in + custom)
   */
  type AllErrorTypes = Required<ErrorTypes>
}

/**
 * Error severity levels
 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical'

/**
 * Error categories for organization
 */
export type ErrorCategory =
  | 'entity'
  | 'database'
  | 'validation'
  | 'permission'
  | 'authentication'
  | 'authorization'
  | 'network'
  | 'filesystem'
  | 'configuration'
  | 'generation'
  | 'runtime'
  | 'custom'

/**
 * Recovery action types
 */
export type RecoveryAction =
  | 'retry'
  | 'reconfigure'
  | 'fallback'
  | 'escalate'
  | 'ignore'
  | 'custom'

/**
 * Error recovery suggestion
 */
export interface ErrorRecovery {
  action: RecoveryAction
  description: string
  code?: string // Code snippet for recovery
  docs?: string // Documentation link
}

/**
 * Error definition in the catalog
 */
export interface ErrorDefinition {
  code: string
  category: ErrorCategory
  severity: ErrorSeverity
  message: string
  description?: string
  recovery?: ErrorRecovery[]
  deprecated?: boolean
  since?: string // Version introduced
  until?: string // Version deprecated
}

/**
 * Error instance with metadata
 */
export interface ErrorInstance extends ErrorBase {
  code: string
  category: ErrorCategory
  severity: ErrorSeverity
  cause?: Error
  context?: Record<string, any>
  timestamp: Date | number
  fingerprint?: string // For error deduplication
}

/**
 * Error factory function type
 */
export type ErrorFactory<T extends ErrorConstructor = ErrorConstructor> = (
  ...args: ConstructorParameters<T>
) => InstanceType<T>

/**
 * Error registry entry
 */
export interface ErrorRegistryEntry {
  constructor: ErrorConstructor
  factory?: ErrorFactory
  definition?: ErrorDefinition
}

/**
 * Error catalog version info
 */
export interface ErrorCatalogVersion {
  version: string
  extends?: string // Previous version this extends
  errors: Record<string, ErrorDefinition>
  deprecated?: Record<string, string> // code -> reason
}

/**
 * Error configuration for entities
 */
export interface EntityErrorConfig {
  types?: Partial<ErrorTypes>
  mappings?: Record<string, keyof AllErrorTypes>
  catalog?: string // Catalog version to use
}

/**
 * Error generation context
 */
export interface ErrorGenerationContext {
  entityId: string
  target: 'api' | 'frontend' | 'database' | 'graphql'
  framework?: string // 'express', 'fastify', 'nextjs', etc.
  language?: 'typescript' | 'javascript'
}

// Export global types for convenience
export type { ErrorBase, ErrorConstructor, ErrorTypes, AllErrorTypes, ErrorCode }

// Re-export for convenience
export type { ErrorBase, ErrorConstructor }
