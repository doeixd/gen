/**
 * Field Mapping Configuration
 *
 * Customize how fields map to components and validators
 */

import { z } from 'zod'

// Import types from utils
import type { ParsedField } from './utils/schema-parser'

export type FormComponent =
  | 'TextField'
  | 'NumberField'
  | 'Checkbox'
  | 'TextArea'
  | 'Select'
  | string

export type DisplayComponent =
  | 'Text'
  | 'Number'
  | 'Currency'
  | 'Badge'
  | 'DateTime'
  | 'Link'
  | 'Email'
  | string

export interface FieldMapping {
  formComponent?: FormComponent | null
  displayComponent?: DisplayComponent
  zodValidator?: z.ZodType<any>
  defaultValue?: unknown
  props?: Record<string, any>
  permissions?: any // Will be defined later
}

export type TableFieldOverrides = Record<string, Record<string, Partial<FieldMapping>>>

/**
 * Zod validators for common patterns
 */
export const validators = {
  string: z.string(),
  email: z.string().email('Invalid email address'),
  url: z.string().url('Invalid URL'),
  uuid: z.string().uuid(),
  stringMin: (min: number, message?: string) =>
    z.string().min(min, message || `Must be at least ${min} characters`),
  stringMax: (max: number, message?: string) =>
    z.string().max(max, message || `Must be at most ${max} characters`),
  number: z.number(),
  positiveNumber: z.number().positive('Must be positive'),
  boolean: z.boolean(),
}

/**
 * Default field mappings
 */
export const defaultFieldMappings: Record<string, Partial<FieldMapping>> = {
  id: {
    displayComponent: 'Text',
    formComponent: null, // IDs are usually auto-generated
  },
  email: {
    displayComponent: 'Email',
    formComponent: 'TextField',
    zodValidator: validators.email,
    props: { type: 'email' },
  },
  name: {
    displayComponent: 'Text',
    formComponent: 'TextField',
    zodValidator: validators.stringMin(1),
  },
  description: {
    displayComponent: 'Text',
    formComponent: 'TextArea',
    zodValidator: validators.string,
    props: { rows: 3 },
  },
  createdAt: {
    displayComponent: 'DateTime',
    formComponent: null,
  },
  updatedAt: {
    displayComponent: 'DateTime',
    formComponent: null,
  },
}

/**
 * Table-specific field overrides
 */
export const tableFieldOverrides: TableFieldOverrides = {
  // Add table-specific overrides here
}

/**
 * Fields to exclude from forms
 */
export const excludeFromForms = ['id', 'createdAt', 'updatedAt']

/**
 * Resolve field configuration
 */
export function resolveFieldConfig(
  tableName: string,
  fieldName: string,
  fieldType: string,
  isOptional: boolean
): ParsedField & { config: FieldMapping } {
  // Start with default mapping
  let config = defaultFieldMappings[fieldName] || {}

  // Apply table-specific overrides
  if (tableFieldOverrides[tableName]?.[fieldName]) {
    config = { ...config, ...tableFieldOverrides[tableName][fieldName] }
  }

  return {
    name: fieldName,
    type: fieldType,
    isOptional,
    config,
  }
}

/**
 * Permission utilities stub
 */
export const permissionUtils = {
  canAccessField: (userRoles: string[], permissions: any, action: string, isOwner: boolean) => true,
}