/**
 * Error System
 * Comprehensive, type-safe error handling for the mapping system
 */

// Core types
export type {
  ErrorBase,
  ErrorConstructor,
  ErrorTypes,
  AllErrorTypes,
  ErrorCategory,
  ErrorSeverity,
  RecoveryAction,
  ErrorRecovery,
  ErrorDefinition,
  ErrorInstance,
  ErrorFactory,
  ErrorRegistryEntry,
  ErrorCatalogVersion,
  EntityErrorConfig,
  ErrorGenerationContext
} from './types'

// Constants (no magic strings!)
export {
  ErrorCodes,
  ErrorCategories,
  ErrorSeverities,
  RecoveryActions
} from './catalog'

export type {
  ErrorCode,
  ErrorCategoryType,
  ErrorSeverityType,
  RecoveryActionType
} from './catalog'

// Catalog and definitions
export {
  ErrorCatalog,
  ErrorCatalogV100,
  getErrorDefinition,
  getErrorCodesByCategory,
  isValidErrorCode,
  getErrorCategories,
  getAllErrorCodes,
  getErrorSeverity,
  getErrorRecovery,
  entityErrors,
  databaseErrors,
  validationErrors,
  permissionErrors,
  authErrors,
  networkErrors,
  filesystemErrors,
  configErrors,
  generationErrors,
  runtimeErrors
} from './catalog'

// Registry for custom error types
export {
  ErrorRegistry,
  BaseError,
  ValidationError,
  DatabaseError,
  PermissionError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  ConfigurationError,
  RuntimeError,
  CodeGenerationError,
  TemplateError,
  SchemaError,
  FileSystemError
} from './registry'

// Factory functions for creating errors
export {
  createBaseError,
  createValidationError,
  createDatabaseError,
  createPermissionError,
  createNotFoundError,
  createAuthenticationError,
  createAuthorizationError,
  createNetworkError,
  createConfigurationError,
  createRuntimeError,
  createCodeGenerationError,
  createTemplateError,
  createSchemaError,
  createFileSystemError,
  createError,
  createFromError,
  withContext,
  withCause,
  createBatchErrors,
  createConditionalError,
  ErrorBuilder,
  buildError,
  errors
} from './factories'

// Error handling utilities
export {
  isErrorBase,
  isStructuredError,
  isErrorCode,
  isErrorCategory,
  getRecoveryForError,
  formatErrorForLogging,
  formatErrorForAPI,
  withErrorBoundary,
  withAsyncErrorBoundary,
  toResult,
  toAsyncResult,
  aggregateErrors,
  groupErrorsByCategory,
  filterErrorsBySeverity,
  withRetry,
  executeRecovery,
  setupGlobalErrorHandler,
  createErrorMiddleware,
  getHttpStatusCode,
  getErrorChain,
  deduplicateErrors,
  errorUtils
} from './handlers'
