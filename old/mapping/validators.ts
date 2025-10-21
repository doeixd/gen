/**
 * Validation System
 * StandardSchema-compliant validators using Zod
 */

import { z } from 'zod'

// StandardSchema type (Zod 3.24+ implements this via ~standard property)
// Using Zod's built-in schema type which is StandardSchema compliant
export type StandardSchema<T = any, F = any, O = T> = z.ZodType<T>

/**
 * Validator types - wraps StandardSchema for type safety
 */
export type Validator<T> = StandardSchema<T>
export type AsyncValidator<T> = StandardSchema<T>

/**
 * Validation result from StandardSchema
 */
export interface ValidationResult {
  value?: unknown
  issues?: Array<{
    message: string
    path?: (string | number)[]
    code?: string
  }>
}

/**
 * Standard Schema validators using Zod
 */
export const validators = {
  // String validators
  string: z.string() as StandardSchema<string>,
  email: z.string().email('Invalid email address') as StandardSchema<string>,
  url: z.string().url('Invalid URL') as StandardSchema<string>,
  uuid: z.string().uuid() as StandardSchema<string>,

  // String with constraints
  stringMin: (min: number, message?: string) =>
    z.string().min(min, message || `Must be at least ${min} characters`) as StandardSchema<string>,
  stringMax: (max: number, message?: string) =>
    z.string().max(max, message || `Must be at most ${max} characters`) as StandardSchema<string>,
  stringLength: (min: number, max: number) =>
    z.string().min(min).max(max) as StandardSchema<string>,

  // Number validators
  number: z.number() as StandardSchema<number>,
  positiveNumber: z.number().positive('Must be positive') as StandardSchema<number>,
  nonNegativeNumber: z.number().nonnegative('Must be non-negative') as StandardSchema<number>,
  integer: z.number().int('Must be an integer') as StandardSchema<number>,

  // Number with constraints
  numberMin: (min: number) => z.number().min(min) as StandardSchema<number>,
  numberMax: (max: number) => z.number().max(max) as StandardSchema<number>,
  numberRange: (min: number, max: number) => z.number().min(min).max(max) as StandardSchema<number>,

  // Boolean
  boolean: z.boolean() as StandardSchema<boolean>,

  // Arrays
  stringArray: z.array(z.string()) as StandardSchema<string[]>,
  numberArray: z.array(z.number()) as StandardSchema<number[]>,
  array: <T extends z.ZodType>(schema: T) => z.array(schema) as StandardSchema<z.infer<T>[]>,

  // Optional wrappers
  optional: <T>(schema: StandardSchema<T>) => (schema as any).optional() as StandardSchema<T | undefined>,
  nullable: <T>(schema: StandardSchema<T>) => (schema as any).nullable() as StandardSchema<T | null>,

  // Price/Currency
  price: z.number().nonnegative('Price must be non-negative') as StandardSchema<number>,
  currency: z.number().nonnegative().multipleOf(0.01, 'Invalid currency amount') as StandardSchema<number>,

  // Phone
  phone: z.string().regex(/^(\+\d{1,3})?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/, 'Invalid phone number') as StandardSchema<string>,

  // Dates
  date: z.date() as StandardSchema<Date>,
  isoDate: z.string().datetime() as StandardSchema<string>,

  // Custom patterns
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format') as StandardSchema<string>,
  username: z.string().regex(/^[a-zA-Z0-9_-]{3,20}$/, 'Invalid username') as StandardSchema<string>,
  hexColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color') as StandardSchema<string>,
} as const

/**
 * Create a validator
 */
export function createValidator<T>(schema: StandardSchema<T>): StandardSchema<T> {
  return schema
}

/**
 * Extract StandardSchema from field
 */
export function extractStandardSchema<T>(field: { standardSchema?: StandardSchema<T> }): StandardSchema<T> | undefined {
  return field.standardSchema
}
