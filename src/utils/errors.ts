/**
 * Error handling utilities
 */

import { Result } from 'neverthrow'

export enum GeneratorErrorCode {
  INVALID_CONFIG = 'INVALID_CONFIG',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  SCHEMA_PARSE_ERROR = 'SCHEMA_PARSE_ERROR',
  CODE_GENERATION_ERROR = 'CODE_GENERATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export class GeneratorError extends Error {
  public readonly code: GeneratorErrorCode
  public readonly details?: Record<string, any>
  public readonly cause?: Error

  constructor(
    code: GeneratorErrorCode,
    message: string,
    details?: Record<string, any>,
    cause?: Error
  ) {
    super(message)
    this.name = 'GeneratorError'
    this.code = code
    this.details = details
    this.cause = cause
  }
}

/**
 * Create a GeneratorError from any error
 */
export function fromError(error: unknown, code: GeneratorErrorCode = GeneratorErrorCode.CODE_GENERATION_ERROR): GeneratorError {
  if (error instanceof GeneratorError) {
    return error
  }

  const message = error instanceof Error ? error.message : 'Unknown error'
  const cause = error instanceof Error ? error : undefined

  return new GeneratorError(code, message, undefined, cause)
}

/**
 * Wrap a function that might throw in a Result
 */
export function tryCatch<T>(
  fn: () => T,
  errorCode: GeneratorErrorCode = GeneratorErrorCode.CODE_GENERATION_ERROR
): Result<T, GeneratorError> {
  try {
    return Result.ok(fn())
  } catch (error) {
    return Result.err(fromError(error, errorCode))
  }
}

/**
 * Wrap an async function that might throw in a Result
 */
export async function tryCatchAsync<T>(
  fn: () => Promise<T>,
  errorCode: GeneratorErrorCode = GeneratorErrorCode.CODE_GENERATION_ERROR
): Result<T, GeneratorError> {
  try {
    const result = await fn()
    return Result.ok(result)
  } catch (error) {
    return Result.err(fromError(error, errorCode))
  }
}