/**
 * Error System Types
 * Type-safe error definitions and interfaces
 */

export interface ErrorBase {
  code?: string
  message?: string
  context?: Record<string, any>
  timestamp?: Date | number
  stack?: string
}

export type ErrorCode = string

export type ErrorClass<T extends ErrorBase = ErrorBase> = new (...args: any[]) => T

export interface ErrorTypes {
  BaseError?: ErrorClass
  ValidationError?: ErrorClass
  DatabaseError?: ErrorClass
  PermissionError?: ErrorClass
  NotFoundError?: ErrorClass
  AuthenticationError?: ErrorClass
  AuthorizationError?: ErrorClass
  NetworkError?: ErrorClass
  ConfigurationError?: ErrorClass
  RuntimeError?: ErrorClass
  CodeGenerationError?: ErrorClass
  TemplateError?: ErrorClass
  SchemaError?: ErrorClass
  FileSystemError?: ErrorClass
  [key: string]: ErrorClass | undefined
}

export type AllErrorTypes = Required<ErrorTypes>

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical'

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

export type RecoveryAction = 'retry' | 'reconfigure' | 'fallback' | 'escalate' | 'ignore' | 'custom'

export interface ErrorRecovery {
  action: RecoveryAction
  description: string
  code?: string
  docs?: string
}

export interface ErrorDefinition {
  code: string
  category: ErrorCategory
  severity: ErrorSeverity
  message: string
  description?: string
  recovery?: ErrorRecovery[]
  deprecated?: boolean
  since?: string
  until?: string
}

export interface ErrorInstance extends ErrorBase {
  code: string
  category: ErrorCategory
  severity: ErrorSeverity
  cause?: Error
  context?: Record<string, any>
  timestamp: Date | number
  fingerprint?: string
}

export type ErrorFactory<T extends ErrorClass = ErrorClass> = (
  ...args: ConstructorParameters<T>
) => InstanceType<T>

export interface ErrorRegistryEntry {
  constructor: ErrorClass
  factory?: ErrorFactory
  definition?: ErrorDefinition
}

export interface ErrorCatalogVersion {
  version: string
  extends?: string
  errors: Record<string, ErrorDefinition>
  deprecated?: Record<string, string>
}

export interface EntityErrorConfig {
  types?: Partial<ErrorTypes>
  mappings?: Record<string, keyof AllErrorTypes>
  catalog?: string
}

export interface ErrorGenerationContext {
  entityId: string
  target: 'api' | 'frontend' | 'database' | 'graphql'
  framework?: string
  language?: 'typescript' | 'javascript'
}
