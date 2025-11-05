/**
 * Error Handlers
 * Error handling utilities and middleware
 */

import type { ErrorBase, ErrorCode, ErrorInstance, RecoveryAction } from './types'
import { getErrorDefinition, getErrorRecovery, isValidErrorCode } from './catalog'
import { createFromError, createRuntimeError } from './factories'
import { Result, ok, err } from 'neverthrow'

/**
 * Type guard for ErrorBase
 */
export function isErrorBase(error: unknown): error is ErrorBase {
  return (
    error !== null &&
    typeof error === 'object' &&
    ('code' in error || 'message' in error)
  )
}

/**
 * Type guard for structured errors with code
 */
export function isStructuredError(error: unknown): error is ErrorBase & { code: string } {
  return isErrorBase(error) && typeof (error as any).code === 'string'
}

/**
 * Check if error matches specific code
 */
export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  return isStructuredError(error) && error.code === code
}

/**
 * Check if error belongs to category
 */
export function isErrorCategory(error: unknown, category: string): boolean {
  if (!isStructuredError(error)) return false
  const definition = getErrorDefinition(error.code as ErrorCode)
  return definition?.category === category
}

/**
 * Get error recovery suggestions
 */
export function getRecoveryForError(error: ErrorBase): RecoveryAction[] {
  if (!error.code || !isValidErrorCode(error.code)) {
    return []
  }
  return getErrorRecovery(error.code)
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: ErrorBase): Record<string, any> {
  return {
    name: (error as any).name || 'Error',
    code: error.code,
    message: error.message,
    context: error.context,
    timestamp: error.timestamp || Date.now(),
    stack: (error as any).stack,
    recovery: getRecoveryForError(error)
  }
}

/**
 * Format error for API response
 */
export function formatErrorForAPI(error: ErrorBase): Record<string, any> {
  const definition = error.code ? getErrorDefinition(error.code as ErrorCode) : undefined

  return {
    error: {
      code: error.code,
      message: error.message,
      category: definition?.category,
      severity: definition?.severity,
      timestamp: error.timestamp || Date.now(),
      context: error.context,
      recovery: getRecoveryForError(error)
    }
  }
}

/**
 * Wrap function in error boundary
 */
export function withErrorBoundary<T extends any[], R>(
  fn: (...args: T) => R,
  fallback?: (error: ErrorBase, ...args: T) => R,
  errorCode?: ErrorCode
): (...args: T) => R {
  return (...args: T): R => {
    try {
      return fn(...args)
    } catch (error) {
      const structuredError = createFromError(error, errorCode)
      if (fallback) {
        return fallback(structuredError, ...args)
      }
      throw structuredError
    }
  }
}

/**
 * Wrap async function in error boundary
 */
export function withAsyncErrorBoundary<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  fallback?: (error: ErrorBase, ...args: T) => Promise<R>,
  errorCode?: ErrorCode
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      const structuredError = createFromError(error, errorCode)
      if (fallback) {
        return await fallback(structuredError, ...args)
      }
      throw structuredError
    }
  }
}

/**
 * Convert to Result type (neverthrow)
 */
export function toResult<T>(
  fn: () => T,
  errorCode?: ErrorCode
): Result<T, ErrorBase> {
  try {
    return ok(fn())
  } catch (error) {
    return err(createFromError(error, errorCode))
  }
}

/**
 * Convert async function to Result
 */
export async function toAsyncResult<T>(
  fn: () => Promise<T>,
  errorCode?: ErrorCode
): Promise<Result<T, ErrorBase>> {
  try {
    const result = await fn()
    return ok(result)
  } catch (error) {
    return err(createFromError(error, errorCode))
  }
}

/**
 * Error aggregation - combine multiple errors
 */
export function aggregateErrors(errors: ErrorBase[]): ErrorBase {
  if (errors.length === 0) {
    return createRuntimeError(
      'RUNTIME_UNEXPECTED_ERROR' as ErrorCode,
      'No errors to aggregate'
    )
  }

  if (errors.length === 1) {
    return errors[0]
  }

  const primaryError = errors[0]
  const aggregatedContext = {
    totalErrors: errors.length,
    errors: errors.map(error => ({
      code: error.code,
      message: error.message,
      context: error.context
    }))
  }

  return createRuntimeError(
    'RUNTIME_UNEXPECTED_ERROR' as ErrorCode,
    `Multiple errors occurred: ${errors.length} total`,
    aggregatedContext,
    primaryError as Error
  )
}

/**
 * Error filtering and grouping
 */
export function groupErrorsByCategory(errors: ErrorBase[]): Record<string, ErrorBase[]> {
  const groups: Record<string, ErrorBase[]> = {}

  errors.forEach(error => {
    if (!error.code || !isValidErrorCode(error.code)) {
      const category = 'unknown'
      if (!groups[category]) groups[category] = []
      groups[category].push(error)
      return
    }

    const definition = getErrorDefinition(error.code as ErrorCode)
    const category = definition?.category || 'unknown'

    if (!groups[category]) groups[category] = []
    groups[category].push(error)
  })

  return groups
}

/**
 * Filter errors by severity
 */
export function filterErrorsBySeverity(
  errors: ErrorBase[],
  minSeverity: 'info' | 'warning' | 'error' | 'critical' = 'warning'
): ErrorBase[] {
  const severityLevels = { info: 0, warning: 1, error: 2, critical: 3 }
  const minLevel = severityLevels[minSeverity]

  return errors.filter(error => {
    if (!error.code || !isValidErrorCode(error.code)) return true // Include unknown errors
    const definition = getErrorDefinition(error.code as ErrorCode)
    const level = severityLevels[definition?.severity || 'error']
    return level >= minLevel
  })
}

/**
 * Error retry mechanism
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    delayMs?: number
    backoff?: 'fixed' | 'exponential'
    retryCondition?: (error: ErrorBase) => boolean
    errorCode?: ErrorCode
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoff = 'fixed',
    retryCondition = () => true,
    errorCode
  } = options

  let lastError: ErrorBase

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = createFromError(error, errorCode)

      // Don't retry if this is the last attempt or condition fails
      if (attempt === maxAttempts || !retryCondition(lastError)) {
        throw lastError
      }

      // Calculate delay
      const currentDelay = backoff === 'exponential'
        ? delayMs * Math.pow(2, attempt - 1)
        : delayMs

      await new Promise(resolve => setTimeout(resolve, currentDelay))
    }
  }

  throw lastError!
}

/**
 * Error recovery executor
 */
export async function executeRecovery(
  error: ErrorBase,
  recoveryAction: RecoveryAction,
  context?: Record<string, any>
): Promise<boolean> {
  const recovery = getRecoveryForError(error).find(r => r.action === recoveryAction)

  if (!recovery) {
    return false
  }

  try {
    // Execute recovery logic based on action type
    switch (recoveryAction) {
      case 'retry':
        // Retry logic would be implemented by caller
        return true

      case 'reconfigure':
        // Reconfiguration would be handled by caller
        return true

      case 'fallback':
        // Fallback logic would be implemented by caller
        return true

      case 'custom':
        // Custom recovery - execute if code is provided
        if (recovery.code) {
          // This would need a safe eval or predefined recovery functions
          console.warn('Custom recovery execution not implemented:', recovery.code)
        }
        return true

      default:
        return false
    }
  } catch (recoveryError) {
    console.error('Recovery execution failed:', recoveryError)
    return false
  }
}

/**
 * Global error handler setup
 */
export function setupGlobalErrorHandler(
  handler: (error: ErrorBase, context?: Record<string, any>) => void
): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    handler(createFromError(error), { type: 'uncaughtException' })
  })

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    handler(createFromError(reason), {
      type: 'unhandledRejection',
      promise: promise.toString()
    })
  })
}

/**
 * Express-style error middleware factory
 */
export function createErrorMiddleware(options: {
  includeStack?: boolean
  logErrors?: boolean
  logger?: (error: ErrorBase) => void
} = {}) {
  const { includeStack = false, logErrors = true, logger = console.error } = options

  return (error: ErrorBase, req?: any, res?: any, next?: any) => {
    if (logErrors) {
      logger(error)
    }

    if (res && typeof res.status === 'function') {
      const statusCode = getHttpStatusCode(error)
      const errorResponse = formatErrorForAPI(error)

      if (!includeStack && errorResponse.error) {
        delete errorResponse.error.stack
      }

      res.status(statusCode).json(errorResponse)
    } else if (next) {
      next(error)
    } else {
      throw error
    }
  }
}

/**
 * Map error to HTTP status code
 */
export function getHttpStatusCode(error: ErrorBase): number {
  if (!error.code || !isValidErrorCode(error.code)) {
    return 500 // Internal Server Error
  }

  const definition = getErrorDefinition(error.code as ErrorCode)

  // Map categories to HTTP status codes
  switch (definition?.category) {
    case 'validation':
      return 400 // Bad Request
    case 'authentication':
      return 401 // Unauthorized
    case 'authorization':
    case 'permission':
      return 403 // Forbidden
    case 'entity':
      if (error.code?.includes('NOT_FOUND')) return 404 // Not Found
      return 422 // Unprocessable Entity
    case 'database':
      return 422 // Unprocessable Entity
    case 'network':
      return 502 // Bad Gateway
    case 'configuration':
      return 500 // Internal Server Error
    case 'generation':
      return 500 // Internal Server Error
    case 'runtime':
      return 500 // Internal Server Error
    default:
      return 500 // Internal Server Error
  }
}

/**
 * Error chain traversal
 */
export function getErrorChain(error: ErrorBase): ErrorBase[] {
  const chain: ErrorBase[] = [error]
  let current = error

  while (current && 'cause' in current && current.cause && isErrorBase(current.cause)) {
    chain.push(current.cause)
    current = current.cause
  }

  return chain
}

/**
 * Error deduplication
 */
export function deduplicateErrors(errors: ErrorBase[]): ErrorBase[] {
  const seen = new Set<string>()
  const unique: ErrorBase[] = []

  errors.forEach(error => {
    const fingerprint = `${error.code || 'unknown'}:${error.message || 'unknown'}`
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint)
      unique.push(error)
    }
  })

  return unique
}

// Export utility functions
export const errorUtils = {
  isErrorBase,
  isStructuredError,
  isErrorCode,
  isErrorCategory,
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
  deduplicateErrors
} as const
