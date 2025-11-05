/**
 * Validation System
 * StandardSchema-compliant validators using Zod
 */

import { z } from 'zod'

// StandardSchema type (Zod 3.24+ implements this via ~standard property)
// Using Zod's built-in schema type which is StandardSchema compliant
export type StandardSchema<T = any> = z.ZodType<T>

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

// Create a function that works like a schema
const stringSchema = z.string()
const stringValidator = (() => z.string()) as any
stringValidator.parse = stringSchema.parse.bind(stringSchema)
stringValidator.safeParse = stringSchema.safeParse.bind(stringSchema)
stringValidator.optional = () => stringSchema.optional()

/**
 * Standard Schema validators using Zod
 */
export const validators = {
  // String validators (can be used as both static schema and factory function)
  string: stringValidator as StandardSchema<string> & (() => StandardSchema<string>),
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
  arrayMin: <T extends z.ZodType>(schema: T, min: number) =>
    z.array(schema).min(min) as StandardSchema<z.infer<T>[]>,

  // Objects
  object: <T extends z.ZodRawShape>(shape: T) => z.object(shape) as StandardSchema<z.infer<z.ZodObject<T>>>,

  // Unions and intersections
  union: <T extends readonly [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]>(schemas: T) =>
    z.union(schemas) as StandardSchema<z.infer<T[number]>>,

  // Enums
  enum: <T extends readonly [string, ...string[]]>(values: T) =>
    z.enum(values) as StandardSchema<T[number]>,
  nativeEnum: <T extends Record<string, string | number>>(enumObj: T) =>
    z.nativeEnum(enumObj) as StandardSchema<T[keyof T]>,

  // Lazy (for recursive schemas)
  lazy: <T>(fn: () => StandardSchema<T>) => z.lazy(fn as any) as StandardSchema<T>,

  // Optional wrappers
  optional: <T>(schema: StandardSchema<T>) => (schema as any).optional() as StandardSchema<T | undefined>,
  nullable: <T>(schema: StandardSchema<T>) => (schema as any).nullable() as StandardSchema<T | null>,

  // Coercion
  coerce: {
    string: () => z.coerce.string() as StandardSchema<string>,
    number: () => z.coerce.number() as StandardSchema<number>,
    boolean: () => z.coerce.boolean() as StandardSchema<boolean>,
    date: () => z.coerce.date() as StandardSchema<Date>,
  },

  // Date validators
  date: z.date() as StandardSchema<Date>,
  dateMin: (min: Date) => z.date().min(min) as StandardSchema<Date>,
  dateMax: (max: Date) => z.date().max(max) as StandardSchema<Date>,
  isoDate: z.string().datetime() as StandardSchema<string>,

  // Price/Currency
  price: z.number().nonnegative('Price must be non-negative') as StandardSchema<number>,
  currency: z.number().nonnegative().multipleOf(0.01, 'Invalid currency amount') as StandardSchema<number>,

  // Phone
  phone: z.string().regex(/^(\+\d{1,3})?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/, 'Invalid phone number') as StandardSchema<string>,

  // Custom patterns
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format') as StandardSchema<string>,
  username: z.string().regex(/^[a-zA-Z0-9_-]{3,20}$/, 'Invalid username') as StandardSchema<string>,
  hexColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color') as StandardSchema<string>,

  // Literals
  literal: <T extends string | number | boolean>(value: T) => z.literal(value) as StandardSchema<T>,

  // Any/Unknown
  any: z.any() as StandardSchema<any>,
  unknown: z.unknown() as StandardSchema<unknown>,
} as const

/**
 * Create a custom validator
 */
export function createValidator<T>(config: {
  validate: (value: unknown) => T | Promise<T>
  message?: string
}): StandardSchema<T> {
  return z.custom<T>((val) => {
    try {
      if (config.validate.constructor.name === 'AsyncFunction') {
        // For async, we return the promise
        return config.validate(val)
      }
      config.validate(val)
      return true
    } catch {
      return false
    }
  }, config.message) as StandardSchema<T>
}

/**
 * Extract StandardSchema from a Zod schema or field
 */
export function extractStandardSchema<T>(schemaOrField: StandardSchema<T> | { standardSchema?: StandardSchema<T> }): StandardSchema<T> | undefined {
  // If it's already a schema
  if (schemaOrField && typeof (schemaOrField as any).parse === 'function') {
    return schemaOrField as StandardSchema<T>
  }
  // If it's an object with standardSchema property
  if (schemaOrField && typeof schemaOrField === 'object' && 'standardSchema' in schemaOrField) {
    return (schemaOrField as any).standardSchema
  }
  return undefined
}
