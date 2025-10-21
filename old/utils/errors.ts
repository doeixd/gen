/**
 * Comprehensive Error Definitions for Code Generators
 *
 * Uses neverthrow for type-safe error handling
 */

/**
 * Error codes for structured error handling
 */
export enum GeneratorErrorCode {
  // File System Errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  DIRECTORY_CREATE_ERROR = 'DIRECTORY_CREATE_ERROR',

  // Schema Parsing Errors
  SCHEMA_PARSE_ERROR = 'SCHEMA_PARSE_ERROR',
  INVALID_SCHEMA_SYNTAX = 'INVALID_SCHEMA_SYNTAX',
  NO_TABLES_FOUND = 'NO_TABLES_FOUND',
  INVALID_TABLE_NAME = 'INVALID_TABLE_NAME',
  INVALID_FIELD_NAME = 'INVALID_FIELD_NAME',

  // Type Resolution Errors
  TYPE_PARSE_ERROR = 'TYPE_PARSE_ERROR',
  UNSUPPORTED_TYPE = 'UNSUPPORTED_TYPE',
  NESTED_TYPE_ERROR = 'NESTED_TYPE_ERROR',

  // Validation Errors
  INVALID_IDENTIFIER = 'INVALID_IDENTIFIER',
  RESERVED_KEYWORD = 'RESERVED_KEYWORD',
  DUPLICATE_FIELD = 'DUPLICATE_FIELD',
  DUPLICATE_TABLE = 'DUPLICATE_TABLE',

  // Zod Validator Errors
  ZOD_EXTRACT_ERROR = 'ZOD_EXTRACT_ERROR',
  ZOD_CODEGEN_ERROR = 'ZOD_CODEGEN_ERROR',
  VALIDATOR_INCOMPATIBLE = 'VALIDATOR_INCOMPATIBLE',

  // Generation Errors
  CODE_GENERATION_ERROR = 'CODE_GENERATION_ERROR',
  TEMPLATE_ERROR = 'TEMPLATE_ERROR',
  INVALID_CONFIG = 'INVALID_CONFIG',

  // Runtime Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Base class for all generator errors
 */
export class GeneratorError extends Error {
  constructor(
    public readonly code: GeneratorErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'GeneratorError';

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GeneratorError);
    }
  }

  /**
   * Format error for display
   */
  format(): string {
    let output = `[${this.code}] ${this.message}`;

    if (this.details) {
      output += '\n  Details: ' + JSON.stringify(this.details, null, 2);
    }

    if (this.cause) {
      output += '\n  Caused by: ' + this.cause.message;
      if (this.cause.stack) {
        output += '\n' + this.cause.stack.split('\n').slice(1, 3).join('\n');
      }
    }

    return output;
  }

  /**
   * Check if error is of specific code
   */
  is(code: GeneratorErrorCode): boolean {
    return this.code === code;
  }
}

/**
 * Specific error types for better type safety
 */

export class FileSystemError extends GeneratorError {
  constructor(
    code: GeneratorErrorCode,
    public readonly filePath: string,
    message: string,
    cause?: Error
  ) {
    super(code, message, { filePath }, cause);
    this.name = 'FileSystemError';
  }
}

export class SchemaParseError extends GeneratorError {
  constructor(
    code: GeneratorErrorCode,
    public readonly tableName?: string,
    public readonly fieldName?: string,
    message: string,
    cause?: Error
  ) {
    super(code, message, { tableName, fieldName }, cause);
    this.name = 'SchemaParseError';
  }
}

export class ValidationError extends GeneratorError {
  constructor(
    code: GeneratorErrorCode,
    public readonly identifier: string,
    message: string,
    public readonly suggestions?: string[]
  ) {
    super(code, message, { identifier, suggestions });
    this.name = 'ValidationError';
  }
}

export class ZodError extends GeneratorError {
  constructor(
    code: GeneratorErrorCode,
    public readonly validatorType: string,
    message: string,
    cause?: Error
  ) {
    super(code, message, { validatorType }, cause);
    this.name = 'ZodError';
  }
}

/**
 * Helper to create errors from caught exceptions
 */
export function fromError(error: unknown, code: GeneratorErrorCode = GeneratorErrorCode.UNKNOWN_ERROR): GeneratorError {
  if (error instanceof GeneratorError) {
    return error;
  }

  if (error instanceof Error) {
    return new GeneratorError(code, error.message, undefined, error);
  }

  return new GeneratorError(
    code,
    typeof error === 'string' ? error : 'Unknown error occurred',
    { originalError: error }
  );
}

/**
 * Type guard for generator errors
 */
export function isGeneratorError(error: unknown): error is GeneratorError {
  return error instanceof GeneratorError;
}

/**
 * JavaScript reserved keywords to check against
 */
export const RESERVED_KEYWORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally',
  'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'null',
  'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof',
  'var', 'void', 'while', 'with', 'yield',
  // Strict mode reserved words
  'let', 'static', 'implements', 'interface', 'package', 'private', 'protected', 'public',
  // Future reserved words
  'await', 'async',
]);

/**
 * Check if identifier is a reserved keyword
 */
export function isReservedKeyword(identifier: string): boolean {
  return RESERVED_KEYWORDS.has(identifier.toLowerCase());
}

/**
 * Validate JavaScript identifier
 */
export function isValidIdentifier(identifier: string): boolean {
  // Must start with letter, $, or _
  // Can contain letters, digits, $, _
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(identifier)) {
    return false;
  }

  // Cannot be reserved keyword
  if (isReservedKeyword(identifier)) {
    return false;
  }

  return true;
}
