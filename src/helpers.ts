/**
 * Helper Functions and Default Configurations
 * Utilities for working with the mapping system
 */

import type { Entity, FieldMapping, NameConfig, RelationshipMapping, TableConfig } from './entity'
import { validators } from './validators'
import { MutatorFactory } from './mutations'

/**
 * Default type mappings - maps TypeScript types to UI components
 */
export const defaultTypeMappings: Record<string, Partial<FieldMapping<any>>> = {
  string: {
    inputComponent: 'TextField' as any,
    displayComponent: 'Text' as any,
    standardSchema: validators.string,
    defaultValue: '',
    jsType: 'string',
  },
  number: {
    inputComponent: 'NumberField' as any,
    displayComponent: 'Number' as any,
    standardSchema: validators.number,
    defaultValue: 0,
    jsType: 'number',
  },
  boolean: {
    inputComponent: 'Checkbox' as any,
    displayComponent: 'Badge' as any,
    standardSchema: validators.boolean,
    defaultValue: false,
    jsType: 'boolean',
  },
  id: {
    inputComponent: 'TextField' as any,
    displayComponent: 'Link' as any,
    standardSchema: validators.string,
    defaultValue: '',
    jsType: 'string',
  },
  date: {
    inputComponent: 'TextField' as any,
    displayComponent: 'DateTime' as any,
    standardSchema: validators.string, // Could be a date validator
    defaultValue: '',
    jsType: 'string',
  },
  array: {
    inputComponent: 'TextField' as any,
    displayComponent: 'List' as any,
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
    inputComponent: 'TextField' as any,
    displayComponent: 'Email' as any,
    standardSchema: validators.email,
  },

  // URL fields
  url: {
    inputComponent: 'TextField' as any,
    displayComponent: 'Link' as any,
    standardSchema: validators.url,
  },
  website: {
    inputComponent: 'TextField' as any,
    displayComponent: 'Link' as any,
    standardSchema: validators.optional(validators.url),
  },

  // Description/Content fields
  description: {
    inputComponent: 'TextArea' as any,
    displayComponent: 'Text' as any,
    standardSchema: validators.string,
  },
  content: {
    inputComponent: 'TextArea' as any,
    displayComponent: 'Text' as any,
    standardSchema: validators.string,
  },
  bio: {
    inputComponent: 'TextArea' as any,
    displayComponent: 'Text' as any,
    standardSchema: validators.optional(validators.string),
  },

  // Image fields
  image: {
    inputComponent: 'TextField' as any,
    displayComponent: 'Image' as any,
    standardSchema: validators.string,
  },
  imageId: {
    inputComponent: 'TextField' as any,
    displayComponent: 'Image' as any,
    standardSchema: validators.string,
  },
  imageUrl: {
    inputComponent: 'TextField' as any,
    displayComponent: 'Image' as any,
    standardSchema: validators.url,
  },
  avatar: {
    inputComponent: 'TextField' as any,
    displayComponent: 'Avatar' as any,
    standardSchema: validators.optional(validators.string),
  },

  // Date/Time fields
  createdAt: {
    displayComponent: 'DateTime' as any,
  },
  updatedAt: {
    displayComponent: 'DateTime' as any,
  },

  // Price/Currency fields
  price: {
    inputComponent: 'NumberField' as any,
    displayComponent: 'Currency' as any,
    standardSchema: validators.price,
  },
  amount: {
    inputComponent: 'NumberField' as any,
    displayComponent: 'Currency' as any,
    standardSchema: validators.currency,
  },

  // Status fields
  status: {
    inputComponent: 'Select' as any,
    displayComponent: 'Badge' as any,
    standardSchema: validators.string,
  },

  // Boolean flags
  completed: {
    inputComponent: 'Checkbox' as any,
    displayComponent: 'Badge' as any,
    standardSchema: validators.boolean,
  },
  isActive: {
    inputComponent: 'Checkbox' as any,
    displayComponent: 'Badge' as any,
    standardSchema: validators.boolean,
  },
  enabled: {
    inputComponent: 'Checkbox' as any,
    displayComponent: 'Badge' as any,
    standardSchema: validators.boolean,
  },

  // Phone
  phone: {
    inputComponent: 'TextField' as any,
    displayComponent: 'Text' as any,
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
      displayComponent: 'Currency' as any,
      standardSchema: validators.price,
      permissions: { roles: { read: ['user', 'admin'], write: ['admin'] } },
    },
    imageId: {
      permissions: { roles: { read: ['user', 'admin'], write: ['admin', 'manager'] } },
    },
  },
  todos: {
    text: {
      inputComponent: 'TextArea' as any,
      standardSchema: validators.stringMin(1, 'Todo text is required'),
      permissions: {
        roles: { read: ['user', 'admin'], write: ['user', 'admin'] },
        ownership: { required: true, ownerField: 'userId' },
      },
    },
    completed: {
      displayComponent: 'CompletedBadge' as any,
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
    tableComponent: 'Table' as any,
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
    tableComponent: 'Table' as any,
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
export function createRelationship<TLocal, TForeign = any>(
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
export function entityToColumnDefs<T>(
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

    // Map display component to cell renderer
    let cellRenderer = 'TextCell'
    if (displayComponent === 'Number' as any) cellRenderer = 'NumberCell'
    else if (displayComponent === 'Currency' as any) cellRenderer = 'CurrencyCell'
    else if (displayComponent === 'DateTime' as any) cellRenderer = 'DateTimeCell'
    else if (displayComponent === 'Badge' as any) cellRenderer = 'BadgeCell'
    else if (displayComponent === 'Link' as any) cellRenderer = 'LinkCell'
    else if (displayComponent === 'Email' as any) cellRenderer = 'EmailCell'
    else if (displayComponent === 'Image' as any) cellRenderer = 'ImageCell'
    else if (displayComponent === 'Avatar' as any) cellRenderer = 'AvatarCell'

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
