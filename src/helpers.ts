/**
 * Helper Functions and Default Configurations
 * Utilities for working with the mapping system
 */

import type { Entity, FieldMapping, NameConfig, RelationshipMapping, TableConfig } from './entity'
import { validators } from './validators'
import { MutatorFactory } from './mutations'
import { component } from './components'
import { dbTypes, type DbColumn } from './database'

/**
 * Default type mappings - maps TypeScript types to UI components
 */
export const defaultTypeMappings: Record<string, Partial<FieldMapping<any>>> = {
  string: {
    inputComponent: component('TextField'),
    displayComponent: component('Text'),
    standardSchema: validators.string(),
    defaultValue: '',
    jsType: 'string',
  },
  number: {
    inputComponent: component('NumberField'),
    displayComponent: component('Number'),
    standardSchema: validators.number,
    defaultValue: 0,
    jsType: 'number',
  },
  boolean: {
    inputComponent: component('Checkbox'),
    displayComponent: component('Badge'),
    standardSchema: validators.boolean,
    defaultValue: false,
    jsType: 'boolean',
  },
  id: {
    inputComponent: component('TextField'),
    displayComponent: component('Link'),
    standardSchema: validators.string(),
    defaultValue: '',
    jsType: 'string',
  },
  date: {
    inputComponent: component('TextField'),
    displayComponent: component('DateTime'),
    standardSchema: validators.string(), // Could be a date validator
    defaultValue: '',
    jsType: 'string',
  },
  array: {
    inputComponent: component('TextField'),
    displayComponent: component('List'),
    standardSchema: validators.stringArray,
    defaultValue: [],
    jsType: 'array',
  },
}

/**
 * Field name pattern mappings - smart defaults based on field names
 */
export const fieldNamePatterns: Record<string, Partial<FieldMapping<any>>> = {
  // Email fields
  email: {
    inputComponent: component('TextField'),
    displayComponent: component('Email'),
    standardSchema: validators.email,
  },

  // URL fields
  url: {
    inputComponent: component('TextField'),
    displayComponent: component('Link'),
    standardSchema: validators.url,
  },
  website: {
    inputComponent: component('TextField'),
    displayComponent: component('Link'),
    standardSchema: validators.optional(validators.url),
  },

  // Description/Content fields
  description: {
    inputComponent: component('TextArea'),
    displayComponent: component('Text'),
    standardSchema: validators.string(),
  },
  content: {
    inputComponent: component('TextArea'),
    displayComponent: component('Text'),
    standardSchema: validators.string(),
  },
  bio: {
    inputComponent: component('TextArea'),
    displayComponent: component('Text'),
    standardSchema: validators.optional(validators.string()),
  },

  // Image fields
  image: {
    inputComponent: component('TextField'),
    displayComponent: component('Image'),
    standardSchema: validators.string(),
  },
  imageId: {
    inputComponent: component('TextField'),
    displayComponent: component('Image'),
    standardSchema: validators.string(),
  },
  imageUrl: {
    inputComponent: component('TextField'),
    displayComponent: component('Image'),
    standardSchema: validators.url,
  },
  avatar: {
    inputComponent: component('TextField'),
    displayComponent: component('Avatar'),
    standardSchema: validators.optional(validators.string()),
  },

  // Date/Time fields
  createdAt: {
    displayComponent: component('DateTime'),
  },
  updatedAt: {
    displayComponent: component('DateTime'),
  },

  // Price/Currency fields
  price: {
    inputComponent: component('NumberField'),
    displayComponent: component('Currency'),
    standardSchema: validators.price,
  },
  amount: {
    inputComponent: component('NumberField'),
    displayComponent: component('Currency'),
    standardSchema: validators.currency,
  },

  // Status fields
  status: {
    inputComponent: component('Select'),
    displayComponent: component('Badge'),
    standardSchema: validators.string(),
  },

  // Boolean flags
  completed: {
    inputComponent: component('Checkbox'),
    displayComponent: component('Badge'),
    standardSchema: validators.boolean,
  },
  isActive: {
    inputComponent: component('Checkbox'),
    displayComponent: component('Badge'),
    standardSchema: validators.boolean,
  },
  enabled: {
    inputComponent: component('Checkbox'),
    displayComponent: component('Badge'),
    standardSchema: validators.boolean,
  },

  // Phone
  phone: {
    inputComponent: component('TextField'),
    displayComponent: component('Text'),
    standardSchema: validators.phone,
  },
}

/**
 * Per-table field overrides
 */
export type TableFieldOverrides = Record<string, Record<string, Partial<FieldMapping<any>>>>

export const tableFieldOverrides: TableFieldOverrides = {
  products: {
    title: {
      standardSchema: validators.stringLength(3, 100),
      permissions: { roles: { read: ['user', 'admin'], write: ['admin', 'manager'] } },
    },
    price: {
      displayComponent: component('Currency'),
      standardSchema: validators.price,
      permissions: { roles: { read: ['user', 'admin'], write: ['admin'] } },
    },
    imageId: {
      permissions: { roles: { read: ['user', 'admin'], write: ['admin', 'manager'] } },
    },
  },
  todos: {
    text: {
      inputComponent: component('TextArea'),
      standardSchema: validators.stringMin(1, 'Todo text is required'),
      permissions: {
        roles: { read: ['user', 'admin'], write: ['user', 'admin'] },
        ownership: { required: true, ownerField: 'userId' },
      },
    },
    completed: {
      displayComponent: component('CompletedBadge'),
      permissions: {
        roles: { read: ['user', 'admin'], write: ['user', 'admin'] },
        ownership: { required: true, ownerField: 'userId' },
      },
    },
  },
}

/**
* Fields to exclude from forms (auto-generated or system fields)
* Organized by table name for flexibility
*/
const _excludeFromForms: Record<string, string[]> = {}

/**
 * Fields to exclude from list/table views
 * Organized by table name for flexibility
*/
const _excludeFromList: Record<string, string[]> = {}

/**
 * Table display configuration
 */
export const tableDisplayConfig: Record<string, TableConfig> = {
  products: {
    tableName: 'products',
    tableComponent: component('Table'),
    layout: 'list',
    columns: ['title', 'imageId', 'price'] as any,
    sortable: ['title', 'price'],
    searchable: ['title'],
    pageSize: 20,
    enableVirtualScroll: true,
    enableGlobalFilter: true,
    enablePagination: true,
    enableSorting: true,
    defaultSortColumn: 'title' as any,
    defaultSortDirection: 'asc',
  },
  todos: {
    tableName: 'todos',
    tableComponent: component('Table'),
    layout: 'list',
    columns: ['text', 'completed'] as any,
    sortable: ['text', 'completed'],
    searchable: ['text'],
    pageSize: 50,
    enableVirtualScroll: true,
    enableGlobalFilter: false,
    enablePagination: false,
    enableRowSelection: true,
    enableSorting: true,
    defaultSortColumn: 'completed' as any,
    defaultSortDirection: 'asc',
  },
}

/**
 * Resolve field configuration by combining defaults, patterns, and overrides
 */
export function resolveFieldConfig<T = unknown>(
  tableName: string,
  fieldName: string,
  fieldType: string,
  isOptional: boolean = false
): FieldMapping<T> {
  // Start with default type mapping
  let config: Partial<FieldMapping<T>> = defaultTypeMappings[fieldType] ? { ...defaultTypeMappings[fieldType] } : {}

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
  if (isOptional && config.standardSchema) {
    config.standardSchema = validators.optional(config.standardSchema as any) as any
  }

  // Set exclusion flags
  const excludeFromForms = isExcludedFromForms(tableName, fieldName)
  const excludeFromList = isExcludedFromList(tableName, fieldName)
  if (excludeFromForms) {
    config.excludeFromForms = true
  }
  if (excludeFromList) {
    config.excludeFromList = true
  }

  return config as FieldMapping<T>
}

/**
 * Create a field mapping with type safety
 */
export function createFieldMapping<T>(
  config: Partial<FieldMapping<T>>
): FieldMapping<T> {
  return config as FieldMapping<T>
}

/**
 * Create an entity with defaults
 */
export function createEntity<T extends Record<string, any>>(
  config: Partial<Entity<T>> & {
    id: string
    name: NameConfig
    db: Entity<T>['db']
    fields: Entity<T>['fields']
  }
): Entity<T> {
  const now = new Date()
  const entityName = config.name.singular

  return {
    version: 1,
    createdAt: now,
    ...config,
    crud: config.crud || MutatorFactory.createStandardCRUD<T>(entityName, config.permissions?.routes),
  } as Entity<T>
}

/**
 * Create a relationship with defaults
 */
export function createRelationship<TLocal extends Record<string, any>, TForeign extends Record<string, any> = Record<string, any>>(
  config: Omit<RelationshipMapping<TLocal, TForeign>, 'version'> & { version?: number }
): RelationshipMapping<TLocal, TForeign> {
  return {
    version: 1,
    ...config,
  }
}

/**
 * Add table override for a field
 */
export function addTableOverride(
  tableName: string,
  fieldName: string,
  override: Partial<FieldMapping<any>>
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
 * Add field pattern
 */
export function addFieldPattern(
  pattern: string,
  mapping: Partial<FieldMapping<any>>
): void {
  fieldNamePatterns[pattern] = mapping
}

/**
 * Exclude fields from forms (legacy function name)
 */
export function excludeFromForms(tableName: string, fields: string[]): void {
  if (!_excludeFromForms[tableName]) {
    _excludeFromForms[tableName] = []
  }
  _excludeFromForms[tableName].push(...fields)
}

/**
 * Exclude fields from list views (legacy function name)
 */
export function excludeFromList(tableName: string, fields: string[]): void {
  if (!_excludeFromList[tableName]) {
    _excludeFromList[tableName] = []
  }
  _excludeFromList[tableName].push(...fields)
}

/**
* Check if a field should be excluded from forms
*/
function isExcludedFromForms(tableName: string, fieldName: string): boolean {
const tableExclusions = _excludeFromForms[tableName] || []
return tableExclusions.includes(fieldName)
}

/**
 * Check if a field should be excluded from list views
*/
function isExcludedFromList(tableName: string, fieldName: string): boolean {
  const tableExclusions = _excludeFromList[tableName] || []
  return tableExclusions.includes(fieldName)
}

/**
 * Convert Entity field configurations to TanStack Table ColumnDef array (as code string)
 * This helper generates column definitions based on the entity's field mappings
 *
 * @param entity - The entity to generate columns for
 * @param options - Configuration options for column generation
 * @returns TypeScript code string for column definitions array
 *
 * @example
 * const columns = entityToColumnDefs(userEntity, {
 *   includeActions: true,
 *   includeSelection: true,
 *   excludeFields: ['password']
 * })
 */
export function entityToColumnDefs<T extends Record<string, any>>(
  entity: Entity<T>,
  options: {
    includeActions?: boolean
    includeSelection?: boolean
    excludeFields?: string[]
  } = {}
): string {
  const { includeActions = true, includeSelection = false, excludeFields = [] } = options

  // Get all field names from entity
  const allFields = Object.keys(entity.fields) as Array<keyof T>

  // Filter out excluded fields and fields marked to exclude from list
  const fields = allFields.filter(
    field => !excludeFields.includes(String(field)) && !entity.fields[field].excludeFromList
  )

  const columnDefs: string[] = []

  // Add selection column if requested
  if (includeSelection) {
    columnDefs.push(`  {
    id: 'select',
    header: ({ table }) => <SelectAllHeader table={table} />,
    cell: ({ row }) => <SelectCell row={row} />,
    enableSorting: false,
    enableFiltering: false
  }`)
  }

  // Generate column definitions for each field
  for (const field of fields) {
    const fieldConfig = entity.fields[field]
    const fieldName = String(field)
    const displayComponent = fieldConfig.displayComponent

    const getComponentName = (value: unknown): string | undefined => {
      if (!value) return undefined
      if (typeof value === 'object' && value !== null) {
        if ('key' in (value as Record<string, unknown>) && typeof (value as Record<string, unknown>).key === 'string') {
          return String((value as Record<string, unknown>).key)
        }
        if ('component' in (value as Record<string, unknown>)) {
          const nested = (value as Record<string, unknown>).component
          if (typeof nested === 'object' && nested !== null && 'key' in (nested as Record<string, unknown>)) {
            return String((nested as Record<string, unknown>).key)
          }
        }
      }
      return undefined
    }

    const displayComponentName = getComponentName(displayComponent)

    // Map display component to cell renderer
    let cellRenderer = 'TextCell'
    if (displayComponentName === 'Number') cellRenderer = 'NumberCell'
    else if (displayComponentName === 'Currency') cellRenderer = 'CurrencyCell'
    else if (displayComponentName === 'DateTime') cellRenderer = 'DateTimeCell'
    else if (displayComponentName === 'Badge') cellRenderer = 'BadgeCell'
    else if (displayComponentName === 'Link') cellRenderer = 'LinkCell'
    else if (displayComponentName === 'Email') cellRenderer = 'EmailCell'
    else if (displayComponentName === 'Image') cellRenderer = 'ImageCell'
    else if (displayComponentName === 'Avatar') cellRenderer = 'AvatarCell'

    // Determine if the field should be sortable and filterable
    const sortable = fieldConfig.sortable !== false
    const filterable = fieldConfig.filterable !== false

    // Format field name for display (capitalize first letter)
    const displayName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1)

    columnDefs.push(`  {
    accessorKey: '${fieldName}',
    header: ({ column }) => (
      <SortableHeader column={column} label="${displayName}" />
    ),
    cell: ${cellRenderer},
    enableSorting: ${sortable},
    enableFiltering: ${filterable}
  }`)
  }

  // Add actions column if requested
  if (includeActions) {
    columnDefs.push(`  createActionsCell({
    onView: props.onView,
    onEdit: props.onEdit,
    onDelete: props.onDelete
  })`)
  }

  return `[\n${columnDefs.join(',\n')}\n]`
}

export type PrimitiveFieldType = 'string' | 'number' | 'boolean' | 'date' | 'id' | 'email' | 'url' | 'text'

export interface SimpleFieldDefinition {
  type: PrimitiveFieldType
  optional?: boolean
  unique?: boolean
  indexed?: boolean
  label?: string
}

function createDbColumnForType(def: SimpleFieldDefinition): DbColumn<any> {
  switch (def.type) {
    case 'id':
      return { type: dbTypes.id(), unique: true }
    case 'number':
      return { type: dbTypes.number(), nullable: Boolean(def.optional), unique: Boolean(def.unique), indexed: Boolean(def.indexed) }
    case 'boolean':
      return { type: dbTypes.boolean(), nullable: Boolean(def.optional), indexed: Boolean(def.indexed) }
    case 'date':
      return { type: dbTypes.timestamp(), nullable: Boolean(def.optional), indexed: Boolean(def.indexed) }
    case 'email':
      return { type: dbTypes.string(255), nullable: Boolean(def.optional), unique: true, indexed: true }
    case 'url':
      return { type: dbTypes.string(2048), nullable: Boolean(def.optional), indexed: Boolean(def.indexed) }
    case 'text':
      return { type: dbTypes.text(), nullable: Boolean(def.optional), indexed: Boolean(def.indexed) }
    case 'string':
    default:
      return { type: dbTypes.string(255), nullable: Boolean(def.optional), unique: Boolean(def.unique), indexed: Boolean(def.indexed) }
  }
}

function createFieldMappingForType(def: SimpleFieldDefinition): FieldMapping<any> {
  const baseType = def.type === 'email' || def.type === 'url' || def.type === 'text' ? 'string' : def.type
  const mapping = resolveFieldConfig('default', def.label || 'field', baseType, Boolean(def.optional))
  if (def.label) {
    ;(mapping as any).label = def.label
  }

  if (def.type === 'email') mapping.standardSchema = def.optional ? validators.optional(validators.email) : validators.email
  if (def.type === 'url') mapping.standardSchema = def.optional ? validators.optional(validators.url) : validators.url
  if (def.type === 'text') mapping.inputComponent = component('TextArea')

  return mapping
}

export interface CreateEntityObjectOptions {
  id: string
  name?: Partial<NameConfig>
  tableName?: string
  fields: Record<string, SimpleFieldDefinition>
  includeTimestamps?: boolean
}

/**
 * Build a full Entity object from a compact field-object definition.
 */
export function createEntityObject<T extends Record<string, any> = Record<string, any>>(
  options: CreateEntityObjectOptions
): Entity<T> {
  const name = {
    singular: options.name?.singular || options.id,
    plural: options.name?.plural || `${options.id}s`,
    display: options.name?.display || options.name?.singular || options.id,
  }

  const dbColumns: Record<string, DbColumn<any>> = {}
  const fieldMappings: Record<string, FieldMapping<any>> = {}

  for (const [fieldName, fieldDef] of Object.entries(options.fields)) {
    dbColumns[fieldName] = createDbColumnForType(fieldDef)
    fieldMappings[fieldName] = createFieldMappingForType({ ...fieldDef, label: fieldDef.label || fieldName })
  }

  if (options.includeTimestamps) {
    dbColumns.createdAt = { type: dbTypes.timestamp() }
    dbColumns.updatedAt = { type: dbTypes.timestamp(), nullable: true }
    fieldMappings.createdAt = resolveFieldConfig('default', 'createdAt', 'date', false)
    fieldMappings.updatedAt = resolveFieldConfig('default', 'updatedAt', 'date', true)
  }

  const fieldNames = Object.keys(options.fields)
  const primaryKey = fieldNames.includes('id') ? ['id'] : [fieldNames[0]]

  return createEntity<T>({
    id: options.id,
    name,
    db: {
      table: { name: options.tableName || name.plural.toLowerCase(), primaryKey },
      columns: dbColumns,
    } as any,
    fields: fieldMappings as any,
  })
}

export function createCrudApiRoutes(basePath: string): NonNullable<Entity<any>['routes']>['api'] {
  return {
    basePath,
    endpoints: {
      list: { method: 'GET', path: '/' },
      get: { method: 'GET', path: '/:id' },
      create: { method: 'POST', path: '/' },
      update: { method: 'PUT', path: '/:id' },
      delete: { method: 'DELETE', path: '/:id' },
    },
  } as any
}

export const permissionPresets = {
  ownerAdmin(ownerField = 'userId') {
    return {
      role: {
        user: { read: true, create: true, update: true },
        admin: { read: true, create: true, update: true, delete: true },
      },
      ownership: {
        required: true,
        ownerField,
      },
    }
  },
  adminOnly() {
    return {
      role: {
        admin: { read: true, create: true, update: true, delete: true },
      },
    }
  },
}
