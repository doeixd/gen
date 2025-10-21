/**
 * Type-Safe Field Mapping Configuration
 *
 * Customize how Convex schema fields map to display and form components
 * Now with full TypeScript support, real component imports, and actual Zod validators
 */

import { z } from 'zod'
import type { ParsedField } from './utils/schema-parser'

// Component type definitions
export type FormComponent =
  | 'TextField'
  | 'NumberField'
  | 'Checkbox'
  | 'TextArea'
  | 'Select'
  | string // Allow custom components

export type DisplayComponent =
  | 'Text'
  | 'Number'
  | 'Currency'
  | 'Badge'
  | 'CompletedBadge'
  | 'DateTime'
  | 'Link'
  | 'Email'
  | 'Image'
  | 'Avatar'
  | 'List'
  | string // Allow custom components

/**
 * Permission configuration for fields and routes
 */
export interface PermissionConfig {
  read?: string[] | string // Roles that can read this field/route
  write?: string[] | string // Roles that can write/edit this field/route
  create?: string[] | string // Roles that can create with this field/route
  delete?: string[] | string // Roles that can delete this field/route
  admin?: string[] | string // Roles that have full access
  owner?: boolean // Whether the user must be the owner of the record
  organization?: boolean // Whether access is restricted to organization members
}

/**
 * Route permission configuration
 */
export interface RoutePermissionConfig {
  list?: PermissionConfig
  create?: PermissionConfig
  read?: PermissionConfig
  update?: PermissionConfig
  delete?: PermissionConfig
}

/**
 * Field mapping configuration type
 */
export interface FieldMapping {
  formComponent?: FormComponent | null
  displayComponent?: DisplayComponent
  zodValidator?: z.ZodType<any>
  defaultValue?: unknown
  props?: Record<string, any>
  permissions?: PermissionConfig
}

/**
 * Table field overrides type
 */
export type TableFieldOverrides = Record<string, Record<string, Partial<FieldMapping>>>

/**
 * Zod validators for common patterns
 */
export const validators = {
  // String validators
  string: z.string(),
  email: z.string().email('Invalid email address'),
  url: z.string().url('Invalid URL'),
  uuid: z.string().uuid(),

  // String with constraints
  stringMin: (min: number, message?: string) =>
    z.string().min(min, message || `Must be at least ${min} characters`),
  stringMax: (max: number, message?: string) =>
    z.string().max(max, message || `Must be at most ${max} characters`),
  stringLength: (min: number, max: number) =>
    z.string().min(min).max(max),

  // Number validators
  number: z.number(),
  positiveNumber: z.number().positive('Must be positive'),
  nonNegativeNumber: z.number().nonnegative('Must be non-negative'),
  integer: z.number().int('Must be an integer'),

  // Number with constraints
  numberMin: (min: number) => z.number().min(min),
  numberMax: (max: number) => z.number().max(max),
  numberRange: (min: number, max: number) => z.number().min(min).max(max),

  // Boolean
  boolean: z.boolean(),

  // Arrays
  stringArray: z.array(z.string()),
  numberArray: z.array(z.number()),
  array: <T extends z.ZodType>(schema: T) => z.array(schema),

  // Optional wrappers
  optional: <T extends z.ZodType>(schema: T) => schema.optional(),
  nullable: <T extends z.ZodType>(schema: T) => schema.nullable(),

  // Price/currency
  price: z.number().nonnegative('Price must be non-negative'),
  currency: z.number().nonnegative().multipleOf(0.01, 'Invalid currency amount'),

  // Phone
  phone: z.string().regex(/^(\+\d{1,3})?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/, 'Invalid phone number'),

  // Dates
  date: z.date(),
  isoDate: z.string().datetime(),

  // Custom patterns
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  username: z.string().regex(/^[a-zA-Z0-9_-]{3,20}$/, 'Invalid username'),
  hexColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
} as const

/**
 * Default field type mappings
 * Maps Convex types to form components and display components with real Zod validators
 */
export const defaultTypeMappings: Record<string, FieldMapping> = {
  string: {
    formComponent: 'TextField',
    displayComponent: 'Text',
    zodValidator: validators.string,
    defaultValue: '',
  },
  number: {
    formComponent: 'NumberField',
    displayComponent: 'Number',
    zodValidator: validators.number,
    defaultValue: 0,
  },
  boolean: {
    formComponent: 'Checkbox',
    displayComponent: 'Badge',
    zodValidator: validators.boolean,
    defaultValue: false,
  },
  id: {
    formComponent: 'TextField',
    displayComponent: 'Link',
    zodValidator: validators.string,
    defaultValue: '',
  },
  array: {
    formComponent: 'TextField',
    displayComponent: 'List',
    zodValidator: validators.stringArray,
    defaultValue: [],
  },
}

/**
 * Field name pattern mappings with real Zod validators
 */
export const fieldNamePatterns: Record<string, FieldMapping> = {
  // Email fields
  email: {
    formComponent: 'TextField',
    displayComponent: 'Email',
    zodValidator: validators.email,
    props: { type: 'email', placeholder: 'user@example.com' },
  },

  // URL fields
  url: {
    formComponent: 'TextField',
    displayComponent: 'Link',
    zodValidator: validators.url,
    props: { type: 'url', placeholder: 'https://...' },
  },
  website: {
    formComponent: 'TextField',
    displayComponent: 'Link',
    zodValidator: validators.optional(validators.url),
    props: { type: 'url' },
  },

  // Description/Content fields
  description: {
    formComponent: 'TextArea',
    displayComponent: 'Text',
    zodValidator: validators.string,
    props: { rows: 4 },
  },
  content: {
    formComponent: 'TextArea',
    displayComponent: 'Text',
    zodValidator: validators.string,
    props: { rows: 6 },
  },
  bio: {
    formComponent: 'TextArea',
    displayComponent: 'Text',
    zodValidator: validators.optional(validators.string),
    props: { rows: 3 },
  },

  // Image fields
  image: {
    formComponent: 'TextField',
    displayComponent: 'Image',
    zodValidator: validators.string,
    props: { placeholder: 'Image URL or ID' },
  },
  imageId: {
    formComponent: 'TextField',
    displayComponent: 'Image',
    zodValidator: validators.string,
  },
  imageUrl: {
    formComponent: 'TextField',
    displayComponent: 'Image',
    zodValidator: validators.url,
  },
  avatar: {
    formComponent: 'TextField',
    displayComponent: 'Avatar',
    zodValidator: validators.optional(validators.string),
  },

  // Date/Time fields
  createdAt: {
    formComponent: null,
    displayComponent: 'DateTime',
  },
  updatedAt: {
    formComponent: null,
    displayComponent: 'DateTime',
  },

  // Price/Currency fields
  price: {
    formComponent: 'NumberField',
    displayComponent: 'Currency',
    zodValidator: validators.price,
    props: { min: 0, step: 0.01, placeholder: '0.00' },
  },
  amount: {
    formComponent: 'NumberField',
    displayComponent: 'Currency',
    zodValidator: validators.currency,
    props: { step: 0.01 },
  },

  // Status fields
  status: {
    formComponent: 'Select',
    displayComponent: 'Badge',
    zodValidator: validators.string,
    props: {
      values: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
    },
  },

  // Boolean flags
  completed: {
    formComponent: 'Checkbox',
    displayComponent: 'Badge',
    zodValidator: validators.boolean,
  },
  isActive: {
    formComponent: 'Checkbox',
    displayComponent: 'Badge',
    zodValidator: validators.boolean,
  },
  enabled: {
    formComponent: 'Checkbox',
    displayComponent: 'Badge',
    zodValidator: validators.boolean,
  },

  // Phone
  phone: {
    formComponent: 'TextField',
    displayComponent: 'Text',
    zodValidator: validators.phone,
    props: { type: 'tel', placeholder: '123-456-7890' },
  },
}

/**
 * Per-table field overrides with type-safe Zod validators
 */
export const tableFieldOverrides: TableFieldOverrides = {
  // Products table customization
  products: {
    title: {
      zodValidator: validators.stringLength(3, 100),
      props: { placeholder: 'Product name', maxLength: 100 },
      permissions: { read: ['user', 'admin'], write: ['admin', 'manager'] },
    },
    price: {
      displayComponent: 'Currency',
      zodValidator: validators.price,
      props: { min: 0, step: 0.01 },
      permissions: { read: ['user', 'admin'], write: ['admin'] },
    },
    imageId: {
      permissions: { read: ['user', 'admin'], write: ['admin', 'manager'] },
    },
  },

  // Todos table customization
  todos: {
    text: {
      formComponent: 'TextArea',
      zodValidator: validators.stringMin(1, 'Todo text is required'),
      props: { rows: 2, placeholder: 'What needs to be done?' },
      permissions: { read: ['user', 'admin'], write: ['user', 'admin'], owner: true },
    },
    completed: {
      displayComponent: 'CompletedBadge',
      permissions: { read: ['user', 'admin'], write: ['user', 'admin'], owner: true },
    },
  },
}

/**
 * Fields to exclude from forms (auto-generated or system fields)
 */
export const excludeFromForms: string[] = [
  'id',
  '_id',
  '_creationTime',
  'createdAt',
  'updatedAt',
]

/**
 * Fields to exclude from list/table views
 */
export const excludeFromList: string[] = [
  '_id',
  'description',
  'content',
  'bio',
]

/**
 * Table display configuration with advanced features
 */
export interface TableConfig {
  columns?: string[]
  sortable?: string[]
  searchable?: string[]
  pageSize?: number
  enableVirtualScroll?: boolean
  enableGlobalFilter?: boolean
  enablePagination?: boolean
  enableColumnFilters?: boolean
  enableRowSelection?: boolean
  enableSorting?: boolean
  defaultSortColumn?: string
  defaultSortDirection?: 'asc' | 'desc'
  customColumnRenderers?: Record<string, string> // Function names for custom renderers
  permissions?: RoutePermissionConfig
}

export const tableDisplayConfig: Record<string, TableConfig> = {
  products: {
    columns: ['title', 'imageId', 'price'],
    sortable: ['title', 'price'],
    searchable: ['title'],
    pageSize: 20,
    enableVirtualScroll: true,
    enableGlobalFilter: true,
    enablePagination: true,
    enableColumnFilters: false,
    enableRowSelection: false,
    enableSorting: true,
    defaultSortColumn: 'title',
    defaultSortDirection: 'asc',
    customColumnRenderers: {
      imageId: 'renderProductImage',
      price: 'renderProductPrice',
    },
    permissions: {
      list: { read: ['user', 'admin'] },
      create: { create: ['admin', 'manager'] },
      read: { read: ['user', 'admin'] },
      update: { write: ['admin', 'manager'], owner: true },
      delete: { delete: ['admin'] },
    },
  },
  todos: {
    columns: ['text', 'completed'],
    sortable: ['text', 'completed'],
    searchable: ['text'],
    pageSize: 50,
    enableVirtualScroll: true,
    enableGlobalFilter: false, // No global filter for todos
    enablePagination: false, // No pagination for todos
    enableColumnFilters: false,
    enableRowSelection: true, // Allow bulk operations
    enableSorting: true,
    defaultSortColumn: 'completed',
    defaultSortDirection: 'asc',
    customColumnRenderers: {
      completed: 'renderTodoStatus',
    },
    permissions: {
      list: { read: ['user', 'admin'], owner: true },
      create: { create: ['user', 'admin'] },
      read: { read: ['user', 'admin'], owner: true },
      update: { write: ['user', 'admin'], owner: true },
      delete: { delete: ['user', 'admin'], owner: true },
    },
  },
}

/**
 * Display component render functions (type-safe)
 */
export const displayComponents = {
  Text: (value: unknown): string => String(value ?? ''),
  Number: (value: number): string => value?.toLocaleString() ?? '0',
  Currency: (value: number): string => `$${value?.toFixed(2) ?? '0.00'}`,
  Badge: (value: boolean): string => value ? 'Yes' : 'No',
  CompletedBadge: (value: boolean): string => value ? '✅' : '⏳',
  DateTime: (value: Date | string | number): string => new Date(value).toLocaleString(),
  Link: (value: string): string => value,
  Email: (value: string): string => value,
  Image: (value: string): string => value,
  Avatar: (value: string): string => value,
  List: (value: unknown[]): string => value?.join(', ') ?? '',
} as const

/**
 * Route configuration
 */
export interface RouteConfig {
  generateIndex: boolean
  generateDetail: boolean
  generateEdit: boolean
  generateCreate: boolean
  defaultPageSize: number
  enableVirtualScrolling: boolean
}

export const routeConfig: RouteConfig = {
  generateIndex: true,
  generateDetail: true,
  generateEdit: true,
  generateCreate: true,
  defaultPageSize: 20,
  enableVirtualScrolling: true,
}

/**
 * Type-safe helper to create custom validators
 */
export function createValidator<T extends z.ZodType>(validator: T): T {
  return validator
}

/**
 * Type-safe helper to create field mapping
 */
export function createFieldMapping(mapping: FieldMapping): FieldMapping {
  return mapping
}

/**
 * Helper function to resolve field configuration (type-safe version)
 * Combines default mappings, pattern matches, and table-specific overrides
 */
export function resolveFieldConfig(
  tableName: string,
  fieldName: string,
  fieldType: string,
  isOptional: boolean = false
): FieldMapping {
  // Start with default type mapping
  let config: FieldMapping = { ...defaultTypeMappings[fieldType] } || {}

  // Check for field name pattern match
  for (const [pattern, patternConfig] of Object.entries(fieldNamePatterns)) {
    if (fieldName.toLowerCase().includes(pattern.toLowerCase())) {
      config = { ...config, ...patternConfig }
      break
    }
  }

  // Apply table-specific overrides
  if (tableFieldOverrides[tableName]?.[fieldName]) {
    config = { ...config, ...tableFieldOverrides[tableName][fieldName] }
  }

  // Handle optional fields
  if (isOptional && config.zodValidator) {
    config.zodValidator = config.zodValidator.optional()
  }

  return config
}

/**
 * Type-safe helper to add custom table overrides
 */
export function addTableOverride(
  tableName: string,
  fieldName: string,
  override: Partial<FieldMapping>
): void {
  if (!tableFieldOverrides[tableName]) {
    tableFieldOverrides[tableName] = {}
  }
  tableFieldOverrides[tableName][fieldName] = {
    ...tableFieldOverrides[tableName][fieldName],
    ...override,
  }
}

/**
 * Type-safe helper to add custom pattern
 */
export function addFieldPattern(
  pattern: string,
  mapping: FieldMapping
): void {
  fieldNamePatterns[pattern] = mapping
}

/**
 * Permission checking utilities
 */
export const permissionUtils = {
  /**
   * Check if user has required permissions
   */
  hasPermission: (
    userRoles: string[],
    requiredPermissions?: string[] | string,
    requireOwner?: boolean,
    isOwner?: boolean
  ): boolean => {
    if (!requiredPermissions) return true

    const permissions = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions]

    // Check role-based permissions
    const hasRolePermission = permissions.some(permission =>
      userRoles.includes(permission)
    )

    // Check owner requirement
    if (requireOwner && !isOwner) return false

    return hasRolePermission
  },

  /**
   * Check if user can perform an action on a field
   */
  canAccessField: (
    userRoles: string[],
    fieldPermissions?: PermissionConfig,
    action: 'read' | 'write' | 'create' | 'delete' = 'read',
    isOwner?: boolean
  ): boolean => {
    if (!fieldPermissions) return true

    const actionPermissions = fieldPermissions[action]
    if (!actionPermissions) return true

    return permissionUtils.hasPermission(
      userRoles,
      actionPermissions,
      fieldPermissions.owner,
      isOwner
    )
  },

  /**
   * Check if user can access a route
   */
  canAccessRoute: (
    userRoles: string[],
    routePermissions?: PermissionConfig,
    isOwner?: boolean
  ): boolean => {
    if (!routePermissions) return true

    return permissionUtils.hasPermission(
      userRoles,
      routePermissions.read || routePermissions.admin,
      routePermissions.owner,
      isOwner
    )
  },

  /**
   * Get visible fields for a user based on permissions
   */
  getVisibleFields: (
    fields: ParsedField[],
    userRoles: string[],
    action: 'read' | 'write' | 'create' = 'read',
    isOwner?: boolean
  ): ParsedField[] => {
    return fields.filter(field =>
      permissionUtils.canAccessField(userRoles, field.config?.permissions, action, isOwner)
    )
  },

  /**
   * Get user permissions from WorkOS (client-side)
   */
  getUserPermissions: async (): Promise<{ roles: string[], organizations: unknown[], isOwner: (resourceId: string) => boolean }> => {
    try {
      // This will be replaced with actual WorkOS calls in the generated components
      // For now, return default permissions
      return {
        roles: ['user'],
        organizations: [],
        isOwner: (resourceId: string) => false,
      }
    } catch (error) {
      console.error('Failed to get user permissions:', error)
      return {
        roles: ['user'],
        organizations: [],
        isOwner: (resourceId: string) => false,
      }
    }
  },
}

// Export types for use in generator
export type { FieldMapping, TableFieldOverrides, TableConfig, RouteConfig, PermissionConfig, RoutePermissionConfig }
