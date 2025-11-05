/**
 * Error Catalog
 * Comprehensive catalog of all possible errors in the system
 */

import type { ErrorDefinition, ErrorCatalogVersion, ErrorCategory, ErrorSeverity, RecoveryAction } from './types'

/**
 * Error code constants to avoid magic strings
 */
export const ErrorCodes = {
  // Entity errors
  ENTITY_MISSING_ID: 'ENTITY_MISSING_ID',
  ENTITY_INVALID_NAME: 'ENTITY_INVALID_NAME',
  ENTITY_DUPLICATE_FIELD: 'ENTITY_DUPLICATE_FIELD',

  // Database errors
  DB_INVALID_COLUMN_TYPE: 'DB_INVALID_COLUMN_TYPE',
  DB_MISSING_PRIMARY_KEY: 'DB_MISSING_PRIMARY_KEY',
  DB_FOREIGN_KEY_VIOLATION: 'DB_FOREIGN_KEY_VIOLATION',

  // Validation errors
  VALIDATION_SCHEMA_INVALID: 'VALIDATION_SCHEMA_INVALID',
  VALIDATION_DATA_INVALID: 'VALIDATION_DATA_INVALID',
  VALIDATION_MISSING_REQUIRED: 'VALIDATION_MISSING_REQUIRED',

  // Permission errors
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  PERMISSION_INSUFFICIENT_ROLE: 'PERMISSION_INSUFFICIENT_ROLE',
  PERMISSION_OWNERSHIP_REQUIRED: 'PERMISSION_OWNERSHIP_REQUIRED',

  // Auth errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',

  // Network errors
  NETWORK_CONNECTION_FAILED: 'NETWORK_CONNECTION_FAILED',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_SERVICE_UNAVAILABLE: 'NETWORK_SERVICE_UNAVAILABLE',

  // Filesystem errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_PERMISSION_DENIED: 'FILE_PERMISSION_DENIED',
  DIRECTORY_CREATE_FAILED: 'DIRECTORY_CREATE_FAILED',

  // Config errors
  CONFIG_INVALID: 'CONFIG_INVALID',
  CONFIG_MISSING_REQUIRED: 'CONFIG_MISSING_REQUIRED',
  CONFIG_VERSION_MISMATCH: 'CONFIG_VERSION_MISMATCH',

  // Generation errors
  GENERATION_TEMPLATE_ERROR: 'GENERATION_TEMPLATE_ERROR',
  GENERATION_INVALID_TARGET: 'GENERATION_INVALID_TARGET',
  GENERATION_DEPENDENCY_MISSING: 'GENERATION_DEPENDENCY_MISSING',

  // Runtime errors
  RUNTIME_UNEXPECTED_ERROR: 'RUNTIME_UNEXPECTED_ERROR',
  RUNTIME_RESOURCE_EXHAUSTED: 'RUNTIME_RESOURCE_EXHAUSTED'
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

/**
 * Recovery action constants
 */
export const RecoveryActions = {
  RETRY: 'retry',
  RECONFIGURE: 'reconfigure',
  FALLBACK: 'fallback',
  ESCALATE: 'escalate',
  IGNORE: 'ignore',
  CUSTOM: 'custom'
} as const

export type RecoveryActionType = typeof RecoveryActions[keyof typeof RecoveryActions]

/**
 * Error category constants
 */
export const ErrorCategories = {
  ENTITY: 'entity',
  DATABASE: 'database',
  VALIDATION: 'validation',
  PERMISSION: 'permission',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  NETWORK: 'network',
  FILESYSTEM: 'filesystem',
  CONFIGURATION: 'configuration',
  GENERATION: 'generation',
  RUNTIME: 'runtime',
  CUSTOM: 'custom'
} as const

export type ErrorCategoryType = typeof ErrorCategories[keyof typeof ErrorCategories]

/**
 * Error severity constants
 */
export const ErrorSeverities = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
} as const

export type ErrorSeverityType = typeof ErrorSeverities[keyof typeof ErrorSeverities]

/**
 * Helper function to create error definition
 */
function createError(
  code: ErrorCode,
  category: ErrorCategoryType,
  severity: ErrorSeverityType,
  message: string,
  options: Partial<Omit<ErrorDefinition, 'code' | 'category' | 'severity' | 'message'>> = {}
): ErrorDefinition {
  return {
    code,
    category,
    severity,
    message,
    ...options
  }
}

/**
 * All error definitions combined
 */
const allErrorDefinitions: Record<ErrorCode, ErrorDefinition> = {
  // Entity Definition Errors
  [ErrorCodes.ENTITY_MISSING_ID]: createError(
    ErrorCodes.ENTITY_MISSING_ID,
    ErrorCategories.ENTITY,
    ErrorSeverities.ERROR,
    'Entity must have an ID',
    {
      description: 'Every entity definition must have a unique identifier',
      recovery: [{
        action: RecoveryActions.RECONFIGURE,
        description: 'Add an "id" field to your entity definition',
        code: 'id: "myEntity"'
      }]
    }
  ),
  [ErrorCodes.ENTITY_INVALID_NAME]: createError(
    ErrorCodes.ENTITY_INVALID_NAME,
    ErrorCategories.ENTITY,
    ErrorSeverities.ERROR,
    'Entity name is invalid',
    {
      description: 'Entity names must be valid identifiers',
      recovery: [{
        action: RecoveryActions.RECONFIGURE,
        description: 'Use a valid identifier for the entity name',
        code: 'name: { singular: "User", plural: "Users" }'
      }]
    }
  ),
  [ErrorCodes.ENTITY_DUPLICATE_FIELD]: createError(
    ErrorCodes.ENTITY_DUPLICATE_FIELD,
    ErrorCategories.ENTITY,
    ErrorSeverities.ERROR,
    'Duplicate field name in entity',
    {
      description: 'Field names within an entity must be unique',
      recovery: [{
        action: RecoveryActions.RECONFIGURE,
        description: 'Rename one of the duplicate fields'
      }]
    }
  ),

  // Database Schema Errors
  [ErrorCodes.DB_INVALID_COLUMN_TYPE]: createError(
    ErrorCodes.DB_INVALID_COLUMN_TYPE,
    ErrorCategories.DATABASE,
    ErrorSeverities.ERROR,
    'Invalid database column type',
    {
      description: 'The specified column type is not supported by the target database',
      recovery: [{
        action: RecoveryActions.RECONFIGURE,
        description: 'Use a supported column type or change database target'
      }]
    }
  ),
  [ErrorCodes.DB_MISSING_PRIMARY_KEY]: createError(
    ErrorCodes.DB_MISSING_PRIMARY_KEY,
    ErrorCategories.DATABASE,
    ErrorSeverities.ERROR,
    'Table must have a primary key',
    {
      description: 'All database tables require a primary key definition',
      recovery: [{
        action: RecoveryActions.RECONFIGURE,
        description: 'Add a primary key to your table definition',
        code: 'primaryKey: ["id"]'
      }]
    }
  ),
  [ErrorCodes.DB_FOREIGN_KEY_VIOLATION]: createError(
    ErrorCodes.DB_FOREIGN_KEY_VIOLATION,
    ErrorCategories.DATABASE,
    ErrorSeverities.ERROR,
    'Foreign key constraint violation',
    {
      description: 'Referenced record does not exist or foreign key is invalid',
      recovery: [{
        action: RecoveryActions.RETRY,
        description: 'Ensure referenced records exist before creating relationships'
      }]
    }
  ),

  // Validation Errors
  [ErrorCodes.VALIDATION_SCHEMA_INVALID]: createError(
    ErrorCodes.VALIDATION_SCHEMA_INVALID,
    ErrorCategories.VALIDATION,
    ErrorSeverities.ERROR,
    'Validation schema is invalid',
    {
      description: 'The provided validation schema has syntax or logical errors',
      recovery: [{
        action: RecoveryActions.RECONFIGURE,
        description: 'Fix the validation schema syntax or logic'
      }]
    }
  ),
  [ErrorCodes.VALIDATION_DATA_INVALID]: createError(
    ErrorCodes.VALIDATION_DATA_INVALID,
    ErrorCategories.VALIDATION,
    ErrorSeverities.WARNING,
    'Data validation failed',
    {
      description: 'Input data does not match the expected schema',
      recovery: [{
        action: RecoveryActions.RECONFIGURE,
        description: 'Provide data that matches the validation schema'
      }]
    }
  ),
  [ErrorCodes.VALIDATION_MISSING_REQUIRED]: createError(
    ErrorCodes.VALIDATION_MISSING_REQUIRED,
    ErrorCategories.VALIDATION,
    ErrorSeverities.ERROR,
    'Required field is missing',
    {
      description: 'A required field was not provided in the input data',
      recovery: [{
        action: RecoveryActions.RECONFIGURE,
        description: 'Provide all required fields in your data'
      }]
    }
  ),

  // Permission Errors
  [ErrorCodes.PERMISSION_DENIED]: createError(
    ErrorCodes.PERMISSION_DENIED,
    ErrorCategories.PERMISSION,
    ErrorSeverities.ERROR,
    'Permission denied',
    {
      description: 'User does not have required permissions for this operation',
      recovery: [{
        action: RecoveryActions.ESCALATE,
        description: 'Request appropriate permissions or contact administrator'
      }]
    }
  ),
  [ErrorCodes.PERMISSION_INSUFFICIENT_ROLE]: createError(
    ErrorCodes.PERMISSION_INSUFFICIENT_ROLE,
    ErrorCategories.PERMISSION,
    ErrorSeverities.ERROR,
    'Insufficient role permissions',
    {
      description: 'User role does not have the required permissions',
      recovery: [{
        action: RecoveryActions.ESCALATE,
        description: 'Request role upgrade or contact administrator'
      }]
    }
  ),
  [ErrorCodes.PERMISSION_OWNERSHIP_REQUIRED]: createError(
    ErrorCodes.PERMISSION_OWNERSHIP_REQUIRED,
    ErrorCategories.PERMISSION,
    ErrorSeverities.ERROR,
    'Ownership permission required',
    {
      description: 'Operation requires ownership of the resource',
      recovery: [{
        action: RecoveryActions.ESCALATE,
        description: 'Only the resource owner can perform this operation'
      }]
    }
  ),

  // Authentication/Authorization Errors
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: createError(
    ErrorCodes.AUTH_INVALID_CREDENTIALS,
    ErrorCategories.AUTHENTICATION,
    ErrorSeverities.ERROR,
    'Invalid authentication credentials',
    {
      description: 'The provided username/password or token is invalid',
      recovery: [{
        action: RecoveryActions.RETRY,
        description: 'Check credentials and try again'
      }]
    }
  ),
  [ErrorCodes.AUTH_TOKEN_EXPIRED]: createError(
    ErrorCodes.AUTH_TOKEN_EXPIRED,
    ErrorCategories.AUTHENTICATION,
    ErrorSeverities.WARNING,
    'Authentication token has expired',
    {
      description: 'The authentication token is no longer valid',
      recovery: [{
        action: RecoveryActions.RETRY,
        description: 'Refresh token or re-authenticate'
      }]
    }
  ),
  [ErrorCodes.AUTH_UNAUTHORIZED]: createError(
    ErrorCodes.AUTH_UNAUTHORIZED,
    ErrorCategories.AUTHORIZATION,
    ErrorSeverities.ERROR,
    'Unauthorized access',
    {
      description: 'User is not authorized to access this resource',
      recovery: [{
        action: RecoveryActions.ESCALATE,
        description: 'Contact administrator for access permissions'
      }]
    }
  ),

  // Network/Communication Errors
  [ErrorCodes.NETWORK_CONNECTION_FAILED]: createError(
    ErrorCodes.NETWORK_CONNECTION_FAILED,
    ErrorCategories.NETWORK,
    ErrorSeverities.ERROR,
    'Network connection failed',
    {
      description: 'Unable to establish connection to required service',
      recovery: [{
        action: RecoveryActions.RETRY,
        description: 'Check network connectivity and try again'
      }]
    }
  ),
  [ErrorCodes.NETWORK_TIMEOUT]: createError(
    ErrorCodes.NETWORK_TIMEOUT,
    ErrorCategories.NETWORK,
    ErrorSeverities.WARNING,
    'Network request timed out',
    {
      description: 'Request took too long to complete',
      recovery: [{
        action: RecoveryActions.RETRY,
        description: 'Try the request again or increase timeout'
      }]
    }
  ),
  [ErrorCodes.NETWORK_SERVICE_UNAVAILABLE]: createError(
    ErrorCodes.NETWORK_SERVICE_UNAVAILABLE,
    ErrorCategories.NETWORK,
    ErrorSeverities.ERROR,
    'Service temporarily unavailable',
    {
      description: 'The target service is currently unavailable',
      recovery: [{
        action: RecoveryActions.RETRY,
        description: 'Wait and try again later'
      }]
    }
  ),

  // File System Errors
  [ErrorCodes.FILE_NOT_FOUND]: createError(
    ErrorCodes.FILE_NOT_FOUND,
    ErrorCategories.FILESYSTEM,
    ErrorSeverities.ERROR,
    'File not found',
    {
      description: 'The requested file does not exist',
      recovery: [{
        action: RecoveryActions.RECONFIGURE,
        description: 'Check file path and ensure file exists'
      }]
    }
  ),
  [ErrorCodes.FILE_PERMISSION_DENIED]: createError(
    ErrorCodes.FILE_PERMISSION_DENIED,
    ErrorCategories.FILESYSTEM,
    ErrorSeverities.ERROR,
    'File permission denied',
    {
      description: 'Insufficient permissions to access the file',
      recovery: [{
        action: RecoveryActions.ESCALATE,
        description: 'Check file permissions or run with appropriate privileges'
      }]
    }
  ),
  [ErrorCodes.DIRECTORY_CREATE_FAILED]: createError(
    ErrorCodes.DIRECTORY_CREATE_FAILED,
    ErrorCategories.FILESYSTEM,
    ErrorSeverities.ERROR,
    'Failed to create directory',
    {
      description: 'Unable to create the required directory',
      recovery: [{
        action: RecoveryActions.RECONFIGURE,
        description: 'Check parent directory permissions and available space'
      }]
    }
  ),

  // Configuration Errors
  [ErrorCodes.CONFIG_INVALID]: createError(
    ErrorCodes.CONFIG_INVALID,
    ErrorCategories.CONFIGURATION,
    ErrorSeverities.ERROR,
    'Configuration is invalid',
    {
      description: 'The provided configuration contains errors',
      recovery: [{
        action: RecoveryActions.RECONFIGURE,
        description: 'Fix configuration syntax and values'
      }]
    }
  ),
  [ErrorCodes.CONFIG_MISSING_REQUIRED]: createError(
    ErrorCodes.CONFIG_MISSING_REQUIRED,
    ErrorCategories.CONFIGURATION,
    ErrorSeverities.ERROR,
    'Required configuration missing',
    {
      description: 'A required configuration value is not provided',
      recovery: [{
        action: RecoveryActions.RECONFIGURE,
        description: 'Add the missing required configuration'
      }]
    }
  ),
  [ErrorCodes.CONFIG_VERSION_MISMATCH]: createError(
    ErrorCodes.CONFIG_VERSION_MISMATCH,
    ErrorCategories.CONFIGURATION,
    ErrorSeverities.WARNING,
    'Configuration version mismatch',
    {
      description: 'Configuration version does not match expected version',
      recovery: [{
        action: RecoveryActions.RECONFIGURE,
        description: 'Update configuration to match expected version'
      }]
    }
  ),

  // Code Generation Errors
  [ErrorCodes.GENERATION_TEMPLATE_ERROR]: createError(
    ErrorCodes.GENERATION_TEMPLATE_ERROR,
    ErrorCategories.GENERATION,
    ErrorSeverities.ERROR,
    'Template processing failed',
    {
      description: 'Error occurred while processing code template',
      recovery: [{
        action: RecoveryActions.RECONFIGURE,
        description: 'Check template syntax and variables'
      }]
    }
  ),
  [ErrorCodes.GENERATION_INVALID_TARGET]: createError(
    ErrorCodes.GENERATION_INVALID_TARGET,
    ErrorCategories.GENERATION,
    ErrorSeverities.ERROR,
    'Invalid generation target',
    {
      description: 'The specified generation target is not supported',
      recovery: [{
        action: RecoveryActions.RECONFIGURE,
        description: 'Use a supported generation target'
      }]
    }
  ),
  [ErrorCodes.GENERATION_DEPENDENCY_MISSING]: createError(
    ErrorCodes.GENERATION_DEPENDENCY_MISSING,
    ErrorCategories.GENERATION,
    ErrorSeverities.ERROR,
    'Required dependency missing',
    {
      description: 'A required dependency for generation is not available',
      recovery: [{
        action: RecoveryActions.CUSTOM,
        description: 'Install missing dependencies'
      }]
    }
  ),

  // Runtime Errors
  [ErrorCodes.RUNTIME_UNEXPECTED_ERROR]: createError(
    ErrorCodes.RUNTIME_UNEXPECTED_ERROR,
    ErrorCategories.RUNTIME,
    ErrorSeverities.CRITICAL,
    'Unexpected runtime error',
    {
      description: 'An unexpected error occurred during execution',
      recovery: [{
        action: RecoveryActions.ESCALATE,
        description: 'Report this error to the development team'
      }]
    }
  ),
  [ErrorCodes.RUNTIME_RESOURCE_EXHAUSTED]: createError(
    ErrorCodes.RUNTIME_RESOURCE_EXHAUSTED,
    ErrorCategories.RUNTIME,
    ErrorSeverities.ERROR,
    'Resource exhausted',
    {
      description: 'System resource limit has been reached',
      recovery: [{
        action: RecoveryActions.RETRY,
        description: 'Wait for resources to become available and retry'
      }]
    }
  )
}

/**
 * The combined error definitions (same as allErrorDefinitions above)
 */
const allErrors = allErrorDefinitions

/**
 * Error catalog version 1.0.0
 */
export const ErrorCatalogV100: ErrorCatalogVersion = {
  version: '1.0.0',
  errors: allErrors
}

/**
 * Current error catalog (latest version)
 */
export const ErrorCatalog = ErrorCatalogV100

/**
 * Get error definition by code
 */
export function getErrorDefinition(code: ErrorCode): ErrorDefinition | undefined {
  return ErrorCatalog.errors[code]
}

/**
 * Get all error codes for a category
 */
export function getErrorCodesByCategory(category: ErrorCategoryType): ErrorCode[] {
  return (Object.keys(ErrorCatalog.errors) as ErrorCode[]).filter(code =>
    ErrorCatalog.errors[code].category === category
  )
}

/**
 * Check if error code exists
 */
export function isValidErrorCode(code: string): code is ErrorCode {
  return code in ErrorCatalog.errors
}

/**
 * Get error categories
 */
export function getErrorCategories(): ErrorCategoryType[] {
  const categories = new Set<ErrorCategoryType>()
  Object.values(ErrorCatalog.errors).forEach(error => {
    categories.add(error.category as ErrorCategoryType)
  })
  return Array.from(categories)
}

/**
 * Get all error codes
 */
export function getAllErrorCodes(): ErrorCode[] {
  return Object.keys(ErrorCatalog.errors) as ErrorCode[]
}

/**
 * Get error severity for a code
 */
export function getErrorSeverity(code: ErrorCode): ErrorSeverityType | undefined {
  const definition = getErrorDefinition(code)
  return definition?.severity
}

/**
 * Get recovery suggestions for an error
 */
export function getErrorRecovery(code: ErrorCode) {
  const definition = getErrorDefinition(code)
  return definition?.recovery || []
}

// Export error definitions grouped by category for easy access
export const entityErrors = Object.fromEntries(
  Object.entries(allErrorDefinitions).filter(([, def]) => def.category === ErrorCategories.ENTITY)
) as Record<ErrorCode, ErrorDefinition>

export const databaseErrors = Object.fromEntries(
  Object.entries(allErrorDefinitions).filter(([, def]) => def.category === ErrorCategories.DATABASE)
) as Record<ErrorCode, ErrorDefinition>

export const validationErrors = Object.fromEntries(
  Object.entries(allErrorDefinitions).filter(([, def]) => def.category === ErrorCategories.VALIDATION)
) as Record<ErrorCode, ErrorDefinition>

export const permissionErrors = Object.fromEntries(
  Object.entries(allErrorDefinitions).filter(([, def]) => def.category === ErrorCategories.PERMISSION)
) as Record<ErrorCode, ErrorDefinition>

export const authErrors = Object.fromEntries(
  Object.entries(allErrorDefinitions).filter(([, def]) =>
    def.category === ErrorCategories.AUTHENTICATION || def.category === ErrorCategories.AUTHORIZATION
  )
) as Record<ErrorCode, ErrorDefinition>

export const networkErrors = Object.fromEntries(
  Object.entries(allErrorDefinitions).filter(([, def]) => def.category === ErrorCategories.NETWORK)
) as Record<ErrorCode, ErrorDefinition>

export const filesystemErrors = Object.fromEntries(
  Object.entries(allErrorDefinitions).filter(([, def]) => def.category === ErrorCategories.FILESYSTEM)
) as Record<ErrorCode, ErrorDefinition>

export const configErrors = Object.fromEntries(
  Object.entries(allErrorDefinitions).filter(([, def]) => def.category === ErrorCategories.CONFIGURATION)
) as Record<ErrorCode, ErrorDefinition>

export const generationErrors = Object.fromEntries(
  Object.entries(allErrorDefinitions).filter(([, def]) => def.category === ErrorCategories.GENERATION)
) as Record<ErrorCode, ErrorDefinition>

export const runtimeErrors = Object.fromEntries(
  Object.entries(allErrorDefinitions).filter(([, def]) => def.category === ErrorCategories.RUNTIME)
) as Record<ErrorCode, ErrorDefinition>
