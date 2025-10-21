/**
 * Utility Functions
 * Common helpers for working with entities, fields, and code generation
 */

import type { Entity, FieldMapping } from './entity'
import type { DbColumn } from './database'
import type { StandardSchema } from './validators'

/**
 * Extract field names from an entity
 */
export function getFieldNames<T>(entity: Entity<T>): Array<keyof T> {
  return Object.keys(entity.fields) as Array<keyof T>
}

/**
 * Get sortable fields from an entity
 */
export function getSortableFields<T>(entity: Entity<T>): Array<keyof T> {
  return getFieldNames(entity).filter(name => {
    const field = entity.fields[name]
    return field.sortable !== false
  })
}

/**
 * Get filterable fields from an entity
 */
export function getFilterableFields<T>(entity: Entity<T>): Array<keyof T> {
  return getFieldNames(entity).filter(name => {
    const field = entity.fields[name]
    return field.filterable !== false
  })
}

/**
 * Get editable fields from an entity
 */
export function getEditableFields<T>(entity: Entity<T>): Array<keyof T> {
  return getFieldNames(entity).filter(name => {
    const field = entity.fields[name]
    return field.editable !== false
  })
}

/**
 * Get required fields from an entity
 */
export function getRequiredFields<T>(entity: Entity<T>): Array<keyof T> {
  return getFieldNames(entity).filter(name => {
    const field = entity.fields[name]
    const dbColumn = entity.db.columns[name]
    return !field.optional && !(dbColumn as DbColumn)?.nullable
  })
}

/**
 * Get optional fields from an entity
 */
export function getOptionalFields<T>(entity: Entity<T>): Array<keyof T> {
  return getFieldNames(entity).filter(name => {
    const field = entity.fields[name]
    const dbColumn = entity.db.columns[name]
    return field.optional || !!(dbColumn as DbColumn)?.nullable
  })
}

/**
 * Generate default values for an entity
 */
export function getDefaultValues<T>(entity: Entity<T>): Partial<T> {
  const defaults: any = {}

  for (const fieldName of getFieldNames(entity)) {
    const field = entity.fields[fieldName]
    if (field.defaultValue !== undefined) {
      defaults[fieldName] = typeof field.defaultValue === 'function'
        ? (field.defaultValue as Function)()
        : field.defaultValue
    }
  }

  return defaults
}

/**
 * Validate entity data against field schemas
 */
export function validateEntity<T>(
  entity: Entity<T>,
  data: Partial<T>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  for (const fieldName of getFieldNames(entity)) {
    const field = entity.fields[fieldName]
    const value = data[fieldName]

    if (field.standardSchema && value !== undefined) {
      try {
        // Assume StandardSchema has a parse method (Zod compatible)
        const schema = field.standardSchema as any
        if (schema.parse) {
          schema.parse(value)
        }
      } catch (error) {
        errors[fieldName as string] = error instanceof Error ? error.message : 'Validation failed'
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Convert entity to TypeScript interface string
 */
export function entityToTypeScript<T>(entity: Entity<T>): string {
  const fieldLines = getFieldNames(entity).map(fieldName => {
    const field = entity.fields[fieldName]
    const optional = field.optional ? '?' : ''
    const jsType = field.jsType || 'any'
    return `  ${String(fieldName)}${optional}: ${jsType}`
  })

  return `export interface ${entity.name.singular} {\n${fieldLines.join('\n')}\n}`
}

/**
 * Convert entity to JSON schema
 */
export function entityToJsonSchema<T>(entity: Entity<T>): any {
  const properties: Record<string, any> = {}
  const required: string[] = []

  for (const fieldName of getFieldNames(entity)) {
    const field = entity.fields[fieldName]

    properties[fieldName as string] = {
      type: field.jsType || 'string',
    }

    if (!field.optional) {
      required.push(fieldName as string)
    }
  }

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    title: entity.name.singular,
    description: entity.description,
    properties,
    required,
  }
}

/**
 * Get primary key field name(s)
 */
export function getPrimaryKeyFields<T>(entity: Entity<T>): string[] {
  return entity.db.table.primaryKey
}

/**
 * Get unique fields
 */
export function getUniqueFields<T>(entity: Entity<T>): Array<keyof T> {
  return getFieldNames(entity).filter(name => {
    const dbColumn = entity.db.columns[name] as DbColumn
    return dbColumn?.unique === true
  })
}

/**
 * Get indexed fields
 */
export function getIndexedFields<T>(entity: Entity<T>): Array<keyof T> {
  return getFieldNames(entity).filter(name => {
    const dbColumn = entity.db.columns[name] as DbColumn
    return dbColumn?.indexed === true
  })
}

/**
 * Check if a field has a specific permission
 */
export function hasFieldPermission(
  field: FieldMapping<any>,
  permission: 'read' | 'write' | 'create' | 'update' | 'delete',
  userRoles: string[]
): boolean {
  if (!field.permissions) return true

  const roleConfig = field.permissions.roles
  if (!roleConfig) return true

  const allowedRoles = roleConfig[permission as 'read' | 'write']
  if (!allowedRoles) return true

  return userRoles.some(role => allowedRoles.includes(role))
}

/**
 * Get visible fields for a user role
 */
export function getVisibleFields<T>(
  entity: Entity<T>,
  userRoles: string[],
  permission: 'read' | 'write' = 'read'
): Array<keyof T> {
  return getFieldNames(entity).filter(name => {
    const field = entity.fields[name]
    return hasFieldPermission(field, permission, userRoles)
  })
}

/**
 * Sanitize entity data by removing fields user can't read
 */
export function sanitizeEntity<T>(
  entity: Entity<T>,
  data: T,
  userRoles: string[]
): Partial<T> {
  const visibleFields = getVisibleFields(entity, userRoles, 'read')
  const sanitized: any = {}

  for (const field of visibleFields) {
    if (data[field] !== undefined) {
      sanitized[field] = data[field]
    }
  }

  return sanitized
}

/**
 * Convert camelCase to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Convert PascalCase to camelCase
 */
export function pascalToCamel(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

/**
 * Convert camelCase to PascalCase
 */
export function camelToPascal(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Pluralize a word (simple English rules)
 */
export function pluralize(word: string): string {
  if (word.endsWith('y')) {
    return word.slice(0, -1) + 'ies'
  }
  if (word.endsWith('s') || word.endsWith('sh') || word.endsWith('ch')) {
    return word + 'es'
  }
  return word + 's'
}

/**
 * Singularize a word (simple English rules)
 */
export function singularize(word: string): string {
  if (word.endsWith('ies')) {
    return word.slice(0, -3) + 'y'
  }
  if (word.endsWith('ses') || word.endsWith('shes') || word.endsWith('ches')) {
    return word.slice(0, -2)
  }
  if (word.endsWith('s')) {
    return word.slice(0, -1)
  }
  return word
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as any
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any
  if (obj instanceof Map) {
    const cloned = new Map()
    obj.forEach((value, key) => {
      cloned.set(key, deepClone(value))
    })
    return cloned as any
  }
  if (obj instanceof Set) {
    const cloned = new Set()
    obj.forEach(value => {
      cloned.add(deepClone(value))
    })
    return cloned as any
  }

  const cloned = {} as T
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key])
    }
  }
  return cloned
}

/**
 * Merge two objects deeply
 */
export function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = deepClone(target)

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key]
      const targetValue = (result as any)[key]

      if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
        (result as any)[key] = deepMerge(targetValue || {}, sourceValue)
      } else {
        (result as any)[key] = sourceValue
      }
    }
  }

  return result
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function (this: any, ...args: Parameters<T>) {
    const context = this

    if (timeout) clearTimeout(timeout)

    timeout = setTimeout(() => {
      func.apply(context, args)
    }, wait)
  }
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  let previous = 0

  return function (this: any, ...args: Parameters<T>) {
    const context = this
    const now = Date.now()
    const remaining = wait - (now - previous)

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      previous = now
      func.apply(context, args)
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now()
        timeout = null
        func.apply(context, args)
      }, remaining)
    }
  }
}

/**
 * Check if a value is empty
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * Get nested property from object safely
 */
export function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

/**
 * Set nested property on object
 */
export function setNestedProperty(obj: any, path: string, value: any): void {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {}
    return current[key]
  }, obj)
  target[lastKey] = value
}
