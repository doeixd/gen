import { z } from 'zod'

// StandardSchema type (Zod 3.24+ implements this via ~standard property)
// Using Zod's built-in schema type which is StandardSchema compliant
type StandardSchema<T = any, F = any, O = T> = z.ZodType<T>

// mapping.ts or types/global.d.ts
export {};

declare global {
  interface ComponentType {
    (...args: any[]): any
  }

  type RoleType = 'user' | 'admin' | 'superadmin'

  /**
   * UI Components - User registers their actual component functions here
   * Works with any UI library (React, Vue, Svelte, etc.)
   */
  interface UIComponents {
    // Form components
    TextField: ComponentType
    NumberField: ComponentType
    Checkbox: ComponentType
    TextArea: ComponentType
    Select: ComponentType
    DatePicker: ComponentType
    FilePicker: ComponentType
    RichTextEditor: ComponentType
    ColorPicker: ComponentType
    RadioGroup: ComponentType

    // Display components
    Text: ComponentType
    Number: ComponentType
    Currency: ComponentType
    Badge: ComponentType
    CompletedBadge: ComponentType
    DateTime: ComponentType
    Link: ComponentType
    Email: ComponentType
    Image: ComponentType
    Avatar: ComponentType
    List: ComponentType

    // Layout components
    Card: ComponentType
    Table: ComponentType
    Grid: ComponentType
    Stack: ComponentType

    // Route/Page components
    Page: ComponentType
    DetailView: ComponentType
    ListView: ComponentType
    FormView: ComponentType
  }

  /**
   * User can extend with custom components
   */
  interface CustomComponents {
    [key: string]: ComponentType
  }

  /**
   * All available components (UI + Custom)
   */
  type AllComponents = UIComponents & CustomComponents
}

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
 * CRUD operation return types
 */
export interface CRUDResult {
  createOne<T>(data: T): Promise<{success: boolean, data?: T, error?: string}>
  createMany<T>(data: T[]): Promise<{success: boolean, data?: T[], errors?: string[]}>
  readOne<T>(id: string): Promise<{success: boolean, data?: T, error?: string}>
  readMany<T>(filter?: Partial<T>): Promise<{success: boolean, data?: T[], error?: string}>
  updateOne<T>(id: string, data: Partial<T>): Promise<{success: boolean, data?: T, error?: string}>
  updateMany<T>(filter: Partial<T>, data: Partial<T>): Promise<{success: boolean, data?: T[], errors?: string[]}>
  deleteOne<T>(id: string): Promise<{success: boolean, error?: string}>
  deleteMany<T>(filter: Partial<T>): Promise<{success: boolean, count?: number, errors?: string[]}>
}

/**
 * Sync configuration for entity data
 */
export interface SyncConfig<T> {
  enabled?: boolean
  interval?: number
  onSync?: (data: T[]) => void
  onError?: (error: Error) => void
}

/**
 * Mutation function types
 */
export type InsertMutationFn<T> = (data: Partial<T>) => Promise<T> | T
export type UpdateMutationFn<T> = (id: string, data: Partial<T>) => Promise<T> | T
export type DeleteMutationFn<T> = (id: string) => Promise<void> | void

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
 * Input component configuration
 */
export interface InputComponentConfig<C extends ComponentType = ComponentType> {
  formComponent?: C | ComponentWithProps<C>
  createComponent?: C | ComponentWithProps<C>
  editComponent?: C | ComponentWithProps<C>
  viewComponent?: C | ComponentWithProps<C>
}

/**
 * Type-safe component reference (no strings!)
 */
export type ComponentRef<K extends keyof AllComponents = keyof AllComponents> = AllComponents[K]

/**
 * Component Registry - Register UI library components once, use everywhere
 *
 * @example
 * // Register your UI library components
 * ComponentRegistry.registerBulk({
 *   TextField: MyUILib.TextField,
 *   NumberField: MyUILib.NumberField,
 *   // ... etc
 * })
 *
 * // Later, retrieve components
 * const TextField = ComponentRegistry.get('TextField')
 */
export class ComponentRegistry {
  private static components = new Map<string, ComponentType>()

  /**
   * Register a single component
   */
  static register<K extends keyof AllComponents>(
    name: K,
    component: AllComponents[K]
  ): void {
    this.components.set(name as string, component)
  }

  /**
   * Get a registered component
   */
  static get<K extends keyof AllComponents>(name: K): AllComponents[K] | undefined {
    return this.components.get(name as string) as AllComponents[K] | undefined
  }

  /**
   * Register multiple components at once
   */
  static registerBulk(components: Partial<AllComponents>): void {
    Object.entries(components).forEach(([name, component]) => {
      if (component) this.components.set(name, component)
    })
  }

  /**
   * Check if a component is registered
   */
  static has(name: keyof AllComponents): boolean {
    return this.components.has(name as string)
  }

  /**
   * Get all registered component names
   */
  static getAll(): string[] {
    return Array.from(this.components.keys())
  }

  /**
   * Clear all registered components
   */
  static clear(): void {
    this.components.clear()
  }
}

/**
 * ============================================================================
 * DATABASE TYPE SYSTEM - Works with any database
 * ============================================================================
 */

/**
 * Database column type - flexible and extensible for any database
 */
export interface DbColumnType<T = any> {
  typeName: string // e.g., 'varchar', 'integer', 'timestamp'
  typeParams?: any[] // e.g., [255] for varchar(255)
  serialize: (value: T) => any
  deserialize: (value: any) => T
  validate?: (value: T) => boolean

  // Schema generation for different ORMs/databases
  toDrizzle?: (columnName?: string) => string
  toPrisma?: (columnName?: string) => string
  toSQL?: (columnName?: string, dialect?: 'postgres' | 'mysql' | 'sqlite') => string
  toConvex?: (columnName?: string) => string
}

/**
 * Database column definition
 */
export interface DbColumn<T = any> {
  type: DbColumnType<T>
  nullable?: boolean
  default?: T | (() => T)
  unique?: boolean
  indexed?: boolean
  primary?: boolean
  autoIncrement?: boolean
  generated?: 'always' | 'by-default'
  generatedAs?: string // SQL expression
  comment?: string
}

/**
 * Database table definition
 */
export interface DbTable {
  name: string
  columns: Map<string, DbColumn>
  primaryKey: string[]
  uniqueConstraints?: string[][]
  checkConstraints?: Array<{name: string, expression: string}>
  comment?: string
}

/**
 * Database index
 */
export interface DbIndex {
  name: string
  tableName: string
  columns: string[]
  unique?: boolean
  where?: string
  type?: 'btree' | 'hash' | 'gist' | 'gin'
}

/**
 * Database constraint
 */
export interface DbConstraint {
  name: string
  tableName: string
  type: 'check' | 'foreign-key' | 'unique' | 'primary-key'
  definition: string
}

/**
 * Database relationship (foreign key)
 */
export interface DbRelationship {
  name: string
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'
  fromTable: string
  toTable: string
  fromColumn: string
  toColumn: string
  onDelete?: 'cascade' | 'set-null' | 'restrict' | 'no-action'
  onUpdate?: 'cascade' | 'set-null' | 'restrict' | 'no-action'
  // For many-to-many
  junctionTable?: string
  junctionFromColumn?: string
  junctionToColumn?: string
}

/**
 * Complete database schema
 */
export interface DbSchema {
  tables: Map<string, DbTable>
  relationships: DbRelationship[]
  indexes: DbIndex[]
  constraints: DbConstraint[]
}

/**
 * Built-in database column types - works with any database
 */
export const dbTypes = {
  /**
   * String type (VARCHAR/TEXT)
   */
  string: (maxLength?: number): DbColumnType<string> => ({
    typeName: 'varchar',
    typeParams: maxLength ? [maxLength] : undefined,
    serialize: (v) => String(v),
    deserialize: (v) => String(v),
    validate: (v) => typeof v === 'string' && (!maxLength || v.length <= maxLength),
    toDrizzle: (col) => maxLength ? `varchar('${col}', { length: ${maxLength} })` : `text('${col}')`,
    toPrisma: (col) => `${col} String${maxLength ? ` @db.VarChar(${maxLength})` : ''}`,
    toSQL: (col, dialect = 'postgres') => maxLength ? `${col} VARCHAR(${maxLength})` : `${col} TEXT`,
    toConvex: (col) => `${col}: v.string()`,
  }),

  /**
   * Integer type
   */
  number: (): DbColumnType<number> => ({
    typeName: 'integer',
    serialize: (v) => Number(v),
    deserialize: (v) => Number(v),
    validate: (v) => typeof v === 'number' && Number.isInteger(v),
    toDrizzle: (col) => `integer('${col}')`,
    toPrisma: (col) => `${col} Int`,
    toSQL: (col) => `${col} INTEGER`,
    toConvex: (col) => `${col}: v.number()`,
  }),

  /**
   * Float/Decimal type
   */
  float: (precision?: number, scale?: number): DbColumnType<number> => ({
    typeName: 'decimal',
    typeParams: [precision, scale],
    serialize: (v) => Number(v),
    deserialize: (v) => Number(v),
    validate: (v) => typeof v === 'number',
    toDrizzle: (col) => `real('${col}')`,
    toPrisma: (col) => `${col} Float`,
    toSQL: (col) => precision ? `${col} DECIMAL(${precision},${scale ?? 2})` : `${col} REAL`,
    toConvex: (col) => `${col}: v.number()`,
  }),

  /**
   * Boolean type
   */
  boolean: (): DbColumnType<boolean> => ({
    typeName: 'boolean',
    serialize: (v) => Boolean(v),
    deserialize: (v) => Boolean(v),
    validate: (v) => typeof v === 'boolean',
    toDrizzle: (col) => `boolean('${col}')`,
    toPrisma: (col) => `${col} Boolean`,
    toSQL: (col) => `${col} BOOLEAN`,
    toConvex: (col) => `${col}: v.boolean()`,
  }),

  /**
   * Timestamp type
   */
  timestamp: (): DbColumnType<Date> => ({
    typeName: 'timestamp',
    serialize: (v) => v.toISOString(),
    deserialize: (v) => new Date(v),
    validate: (v) => v instanceof Date && !isNaN(v.getTime()),
    toDrizzle: (col) => `timestamp('${col}')`,
    toPrisma: (col) => `${col} DateTime`,
    toSQL: (col) => `${col} TIMESTAMP`,
    toConvex: (col) => `${col}: v.number()`, // Convex uses Unix timestamps
  }),

  /**
   * UUID/ID type
   */
  id: (): DbColumnType<string> => ({
    typeName: 'uuid',
    serialize: (v) => String(v),
    deserialize: (v) => String(v),
    validate: (v) => typeof v === 'string',
    toDrizzle: (col) => `uuid('${col}').primaryKey()`,
    toPrisma: (col) => `${col} String @id @default(uuid())`,
    toSQL: (col, dialect) => dialect === 'postgres' ? `${col} UUID PRIMARY KEY` : `${col} VARCHAR(36) PRIMARY KEY`,
    toConvex: (col) => `${col}: v.id('tableName')`,
  }),

  /**
   * JSON type
   */
  json: <T>(): DbColumnType<T> => ({
    typeName: 'json',
    serialize: (v) => JSON.stringify(v),
    deserialize: (v) => typeof v === 'string' ? JSON.parse(v) : v,
    validate: (v) => v !== undefined,
    toDrizzle: (col) => `json('${col}')`,
    toPrisma: (col) => `${col} Json`,
    toSQL: (col) => `${col} JSON`,
    toConvex: (col) => `${col}: v.any()`, // Convex stores JSON natively
  }),

  /**
   * Array type
   */
  array: <T>(elementType: DbColumnType<T>): DbColumnType<T[]> => ({
    typeName: 'array',
    typeParams: [elementType],
    serialize: (v) => JSON.stringify(v.map(elementType.serialize)),
    deserialize: (v) => {
      const arr = typeof v === 'string' ? JSON.parse(v) : v
      return arr.map(elementType.deserialize)
    },
    validate: (v) => Array.isArray(v),
    toDrizzle: (col) => `json('${col}')`, // Store as JSON
    toPrisma: (col) => `${col} Json`,
    toSQL: (col, dialect) => dialect === 'postgres' ? `${col} JSONB` : `${col} JSON`,
    toConvex: (col) => `${col}: v.array(...)`, // Need specific type
  }),

  /**
   * Custom type builder
   */
  custom: <T>(config: Partial<DbColumnType<T>> & {typeName: string}): DbColumnType<T> => ({
    serialize: (v) => v,
    deserialize: (v) => v,
    ...config,
  } as DbColumnType<T>),
} as const

export interface ComponentWithProps<C extends ComponentType = ComponentType, P extends unknown = Parameters<C>[0]> {
  component: C;
  props: P;
}

export interface DisplayComponentConfig<C extends ComponentType = ComponentType> {
  listComponent: C | ComponentWithProps<C>;
  cardComponent: C | ComponentWithProps<C>;
}

/**
 * Routes configuration for entity
 */
export interface RoutesConfig<T, C extends ComponentType = ComponentType, R extends ComponentType = ComponentType> {
  basePath?: string
  listRoute?: {
    path?: string
    component?: R | ComponentWithProps<R>
    permissions?: PermissionConfig
  }
  detailRoute?: {
    path?: string
    component?: R | ComponentWithProps<R>
    permissions?: PermissionConfig
  }
  createRoute?: {
    path?: string
    component?: R | ComponentWithProps<R>
    permissions?: PermissionConfig
  }
  editRoute?: {
    path?: string
    component?: R | ComponentWithProps<R>
    permissions?: PermissionConfig
  }
  customRoutes?: Record<string, {
    path: string
    component: R | ComponentWithProps<R>
    permissions?: PermissionConfig
  }>
  middleware?: Array<(req: any) => Promise<any>>
  generateIndex?: boolean
  generateDetail?: boolean
  generateCreate?: boolean
  generateEdit?: boolean
}

export interface NameConfig {
  singular: string;
  plural: string;
  display?: string;
  internal?: string;
  db?: string;
}

/**
 * Validation configuration for fields
 */
export interface ValidationConfig<T, C extends ComponentType = ComponentType> {
  touched?: Validator<T>
  submitted?: Validator<T> | AsyncValidator<T>
  onBlur?: Validator<T>
  onChange?: Validator<T>
  custom?: Record<string, Validator<any> | AsyncValidator<any>>
  debounce?: number
  validateOnMount?: boolean
  validateOnChange?: boolean
  validateOnBlur?: boolean
}

/**
 * ============================================================================
 * COMPREHENSIVE PERMISSION SYSTEM - Multi-level access control
 * ============================================================================
 */

/**
 * User information for permission checks
 */
export interface User {
  id: string
  roles: string[]
  organizationId?: string
  attributes?: Record<string, any>
}

/**
 * Basic permission configuration
 */
export interface PermissionConfig {
  // Role-based permissions
  roles?: {
    read?: string[]
    write?: string[]
    create?: string[]
    update?: string[]
    delete?: string[]
    admin?: string[]
  }

  // Ownership-based permissions
  ownership?: {
    required: boolean
    ownerField: string // Field that contains owner ID (e.g., 'userId', 'createdBy')
    allowTransfer?: boolean
    transferRequiresApproval?: boolean
    transferApprovers?: string[] // Roles that can approve transfer
  }

  // Organization-based permissions
  organization?: {
    required: boolean
    orgField: string // Field that contains organization ID
    allowCrossOrg?: boolean
    crossOrgRoles?: string[] // Roles that can access cross-org
  }

  // Attribute-based access control (ABAC)
  attributes?: Array<{
    name: string
    operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'custom'
    value: any
    customCheck?: (user: User, resource: any) => boolean
  }>

  // Time-based permissions
  temporal?: {
    validFrom?: Date
    validUntil?: Date
    schedule?: {
      daysOfWeek?: number[] // 0-6 (Sunday-Saturday)
      hoursOfDay?: [number, number] // [start, end] in 24-hour format
      timezone?: string
    }
  }

  // Field-level (cell-level) permissions
  fieldPermissions?: {
    [fieldName: string]: {
      read?: string[]
      write?: string[]
      mask?: boolean // Mask sensitive data
      maskFn?: (value: any) => any // Custom masking function
      maskChar?: string // Character to use for masking (default: '*')
    }
  }

  // Conditional permissions
  conditions?: Array<{
    when: (user: User, resource: any, context: any) => boolean
    then: Partial<PermissionConfig>
    else?: Partial<PermissionConfig>
  }>

  // Custom permission check
  custom?: (user: User, resource: any, action: string, context: any) => Promise<boolean> | boolean
}

/**
 * Entity-level permissions (extends base PermissionConfig)
 */
export interface EntityPermissions extends PermissionConfig {
  // Route-level permissions
  routes?: {
    list?: PermissionConfig
    detail?: PermissionConfig
    create?: PermissionConfig
    edit?: PermissionConfig
    delete?: PermissionConfig
    custom?: Record<string, PermissionConfig>
  }

  // Form-level permissions
  forms?: {
    create?: {
      fields: string[] // Which fields are visible
      permissions: PermissionConfig
    }
    edit?: {
      fields: string[]
      permissions: PermissionConfig
    }
    custom?: Record<string, {
      fields: string[]
      permissions: PermissionConfig
    }>
  }

  // API-level permissions
  api?: {
    endpoints: Record<string, PermissionConfig>
  }
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
  missingRoles?: string[]
  failedConditions?: string[]
}

/**
 * Permission Engine - Check all permission types
 */
export class PermissionEngine {
  /**
   * Check if user has permission
   */
  static async checkPermission(
    user: User,
    permission: PermissionConfig,
    action: 'read' | 'write' | 'create' | 'update' | 'delete',
    resource?: any,
    context?: any
  ): Promise<PermissionCheckResult> {
    // Check role-based permissions
    if (permission.roles) {
      const requiredRoles = permission.roles[action]
      if (requiredRoles && requiredRoles.length > 0) {
        const hasRole = requiredRoles.some(role => user.roles.includes(role))
        if (!hasRole) {
          return {
            allowed: false,
            reason: 'Insufficient role permissions',
            missingRoles: requiredRoles.filter(role => !user.roles.includes(role)),
          }
        }
      }
    }

    // Check ownership
    if (permission.ownership?.required && resource) {
      const ownerId = resource[permission.ownership.ownerField]
      if (ownerId !== user.id) {
        return {
          allowed: false,
          reason: 'User is not the owner of this resource',
        }
      }
    }

    // Check organization
    if (permission.organization?.required && resource) {
      const resourceOrgId = resource[permission.organization.orgField]
      if (resourceOrgId !== user.organizationId) {
        const canAccessCrossOrg = permission.organization.crossOrgRoles?.some(role =>
          user.roles.includes(role)
        )
        if (!canAccessCrossOrg) {
          return {
            allowed: false,
            reason: 'Resource belongs to different organization',
          }
        }
      }
    }

    // Check attributes
    if (permission.attributes && resource) {
      for (const attr of permission.attributes) {
        const userAttrValue = user.attributes?.[attr.name]
        const resourceAttrValue = resource[attr.name]

        let matches = false
        switch (attr.operator) {
          case 'equals':
            matches = userAttrValue === attr.value
            break
          case 'contains':
            matches = Array.isArray(userAttrValue) && userAttrValue.includes(attr.value)
            break
          case 'gt':
            matches = userAttrValue > attr.value
            break
          case 'lt':
            matches = userAttrValue < attr.value
            break
          case 'gte':
            matches = userAttrValue >= attr.value
            break
          case 'lte':
            matches = userAttrValue <= attr.value
            break
          case 'in':
            matches = Array.isArray(attr.value) && attr.value.includes(userAttrValue)
            break
          case 'custom':
            matches = attr.customCheck ? attr.customCheck(user, resource) : false
            break
        }

        if (!matches) {
          return {
            allowed: false,
            reason: `Attribute check failed: ${attr.name}`,
          }
        }
      }
    }

    // Check temporal
    if (permission.temporal) {
      const now = new Date()

      if (permission.temporal.validFrom && now < permission.temporal.validFrom) {
        return {
          allowed: false,
          reason: 'Permission not yet valid',
        }
      }

      if (permission.temporal.validUntil && now > permission.temporal.validUntil) {
        return {
          allowed: false,
          reason: 'Permission expired',
        }
      }

      if (permission.temporal.schedule) {
        const dayOfWeek = now.getDay()
        const hour = now.getHours()

        if (permission.temporal.schedule.daysOfWeek &&
            !permission.temporal.schedule.daysOfWeek.includes(dayOfWeek)) {
          return {
            allowed: false,
            reason: 'Access not allowed on this day',
          }
        }

        if (permission.temporal.schedule.hoursOfDay) {
          const [startHour, endHour] = permission.temporal.schedule.hoursOfDay
          if (hour < startHour || hour >= endHour) {
            return {
              allowed: false,
              reason: 'Access not allowed at this time',
            }
          }
        }
      }
    }

    // Check custom permission function
    if (permission.custom) {
      const customResult = await permission.custom(user, resource, action, context)
      if (!customResult) {
        return {
          allowed: false,
          reason: 'Custom permission check failed',
        }
      }
    }

    // Check conditions
    if (permission.conditions) {
      for (const condition of permission.conditions) {
        if (condition.when(user, resource, context)) {
          if (condition.then) {
            return this.checkPermission(user, condition.then, action, resource, context)
          }
        } else if (condition.else) {
          return this.checkPermission(user, condition.else, action, resource, context)
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Filter fields based on field-level permissions
   */
  static async filterFields<T extends Record<string, any>>(
    user: User,
    entity: { fields: Record<string, { permissions?: PermissionConfig }> },
    data: T,
    action: 'read' | 'write'
  ): Promise<Partial<T>> {
    const filtered: any = {}

    for (const [fieldName, fieldValue] of Object.entries(data)) {
      const fieldConfig = entity.fields[fieldName]
      const fieldPermissions = fieldConfig?.permissions?.fieldPermissions?.[fieldName]

      if (fieldPermissions) {
        const requiredRoles = fieldPermissions[action]
        if (requiredRoles && requiredRoles.length > 0) {
          const hasPermission = requiredRoles.some(role => user.roles.includes(role))
          if (!hasPermission) {
            continue // Skip this field
          }
        }

        // Apply masking for read operations
        if (action === 'read' && fieldPermissions.mask) {
          if (fieldPermissions.maskFn) {
            filtered[fieldName] = fieldPermissions.maskFn(fieldValue)
          } else {
            const maskChar = fieldPermissions.maskChar || '*'
            filtered[fieldName] = typeof fieldValue === 'string'
              ? maskChar.repeat(fieldValue.length)
              : maskChar.repeat(8)
          }
          continue
        }
      }

      filtered[fieldName] = fieldValue
    }

    return filtered
  }

  /**
   * Check if user can access a route
   */
  static async canAccessRoute(
    user: User,
    routePermissions?: PermissionConfig,
    resource?: any
  ): Promise<PermissionCheckResult> {
    if (!routePermissions) {
      return { allowed: true }
    }

    return this.checkPermission(user, routePermissions, 'read', resource)
  }
}

/**
 * Field mapping configuration
 */
export interface FieldMapping<T, C extends ComponentType = ComponentType> {
  displayComponent?: C | DisplayComponentConfig<C>
  inputComponent?: C | ComponentWithProps<C>;
  loadingComponent?: C | ComponentWithProps<C>;
  emptyComponent?: C | ComponentWithProps<C>;
  defaultValue?: T | (() => T);
  version?: number;
  validation?: (value: any) => ValidationResult | Promise<ValidationResult> | ValidationConfig<T,C>
  typescriptType?: T // Phantom type for type inference
  sortable?: boolean | ((a: T, b: T) => number)
  filterable?: boolean | ((item: T, filterValue: any) => boolean)
  routes?: RoutesConfig<T, C>
  name?: string | NameConfig
  optional?: boolean
  editable?: boolean
  standardSchema?: StandardSchema<T>
  permissions?: PermissionConfig
  jsType?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date'
}

/**
 * Table display configuration with advanced features
 */
export interface TableConfig<T = any, C extends ComponentType = ComponentType> extends TableFieldConfig<T, C> {
  tableName: string
}

interface TableFieldConfig<T, C extends ComponentType = ComponentType> {
  tableComponent: C | ComponentWithProps<C>;
  layout: 'list' | 'card' | 'custom' ;
  columns?: (keyof T)[]
  sortable?: string[]
  searchable?: string[]
  pageSize?: number
  enableVirtualScroll?: boolean
  enableGlobalFilter?: boolean
  enablePagination?: boolean
  enableColumnFilters?: boolean
  enableRowSelection?: boolean
  enableSorting?: boolean
  defaultSortColumn?: keyof T
  defaultSortDirection?: 'asc' | 'desc'
  customColumnRenderers?: Record<string, string> // Function names for custom renderers
  permissions?: RoutePermissionConfig,
  version?: number
  onError?: (error: Error) => void
}

/**
 * Enhanced relationship mapping with full database details
 */
export interface RelationshipMapping<TLocal, TForeign = any, C extends ComponentType = ComponentType> {
  // Naming and identity
  name: string
  version?: number
  description?: string

  // Entities involved
  localEntity: string | Entity<TLocal, C> // Table name or full entity
  foreignEntity: string | Entity<TForeign, C>

  // Relationship type
  relationType: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'

  // Database-level configuration
  db: {
    foreignKey: {
      localColumn: keyof TLocal | string
      foreignColumn: keyof TForeign | string
      onDelete: 'cascade' | 'set-null' | 'restrict' | 'no-action'
      onUpdate: 'cascade' | 'set-null' | 'restrict' | 'no-action'
      indexed: boolean
      deferrable?: boolean
      constraintName?: string
    }

    // For many-to-many relationships
    junctionTable?: {
      name: string
      localColumn: string
      foreignColumn: string
      additionalColumns?: Record<string, DbColumn>
    }

    // Indexes for performance
    indexes?: Array<{
      name: string
      columns: string[]
      unique?: boolean
      where?: string
    }>
  }

  // Display configuration
  display: {
    displayField: keyof TForeign | string // Which field to display from foreign entity
    displayComponent?: ComponentRef
    listComponent?: ComponentRef
    eager?: boolean // Load eagerly or lazy
    limit?: number // For one-to-many, limit results
  }

  // Query configuration
  query: {
    fetchRelated?: (id: string | number) => Promise<TForeign | TForeign[] | null>
    queryRelated?: (filter: Partial<TForeign>) => Promise<TForeign[]>
    caching?: {
      enabled: boolean
      ttl?: number // Time to live in seconds
      strategy?: 'lru' | 'fifo' | 'lfu'
    }
  }

  // Permissions
  permissions?: PermissionConfig

  // Validation
  standardSchema?: StandardSchema<TForeign | TForeign[]>
}

/**
 * ============================================================================
 * MUTATION SYSTEM - Track all changes with audit trail
 * ============================================================================
 */

/**
 * Context for mutation execution
 */
export interface MutationContext {
  userId: string
  userRoles: string[]
  timestamp: Date
  requestId: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

/**
 * Result of a mutation
 */
export interface MutationResult<T> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
  mutationId: string
  version: number
  timestamp: Date
  changedFields?: Array<keyof T>
  previousValues?: Partial<T>
  warnings?: string[]
}

/**
 * History record for a mutation
 */
export interface MutationHistory<T> {
  mutationId: string
  mutatorName: string
  mutatorVersion: number
  timestamp: Date
  userId: string
  userRoles: string[]
  input: any
  output?: T
  previousState?: Partial<T>
  newState?: Partial<T>
  changedFields: Array<keyof T>
  success: boolean
  error?: string
  errorCode?: string
  rollbackAt?: Date
  rollbackBy?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

/**
 * Entity mutator - Named, versioned, audited mutations
 */
export interface EntityMutator<T, TInput = Partial<T>> {
  // Identity
  name: string // e.g., 'createUser', 'approveOrder', 'archivePost'
  version: number
  createdAt: Date
  updatedAt?: Date
  description?: string
  category?: string // Group related mutators

  // Mutation logic
  mutate: (input: TInput, context: MutationContext) => Promise<MutationResult<T>>

  // Validation
  validateInput?: StandardSchema<TInput>
  validateOutput?: StandardSchema<T>

  // Permissions
  permissions: PermissionConfig
  requiresApproval?: boolean
  approvers?: string[] // Roles that can approve

  // Audit trail
  audit: {
    enabled: boolean
    logLevel: 'none' | 'basic' | 'detailed' | 'full'
    retentionDays?: number
    anonymize?: boolean
    excludeFields?: string[] // Don't log these fields (e.g., passwords)
  }

  // Lifecycle hooks
  beforeMutate?: (input: TInput, context: MutationContext) => Promise<void>
  afterMutate?: (result: T, context: MutationContext) => Promise<void>
  onSuccess?: (result: T, context: MutationContext) => Promise<void>
  onError?: (error: Error, context: MutationContext) => Promise<void>

  // Rollback support
  rollback?: (id: string, context: MutationContext) => Promise<void>
  canRollback?: (id: string, context: MutationContext) => Promise<boolean>

  // Rate limiting
  rateLimit?: {
    maxCalls: number
    windowMs: number
    perUser?: boolean
    perOrganization?: boolean
  }

  // Idempotency
  idempotencyKey?: (input: TInput) => string

  // Retry configuration
  retry?: {
    maxAttempts: number
    backoffMs: number
    exponential?: boolean
  }
}

/**
 * Mutator factory - Create standard and custom mutators
 */
export class MutatorFactory {
  /**
   * Create standard CRUD mutators for an entity
   */
  static createStandardCRUD<T>(
    entityName: string,
    permissions?: Partial<Record<'create' | 'update' | 'delete', PermissionConfig>>
  ): {
    create: EntityMutator<T, Partial<T>>
    update: EntityMutator<T, {id: string, data: Partial<T>}>
    delete: EntityMutator<void, string>
    softDelete: EntityMutator<T, string>
    restore: EntityMutator<T, string>
  } {
    const now = new Date()

    return {
      create: {
        name: `create${entityName}`,
        version: 1,
        createdAt: now,
        description: `Create a new ${entityName}`,
        category: 'crud',
        mutate: async (input, ctx) => {
          // Auto-generated create logic will be implemented
          throw new Error('Not implemented - will be generated')
        },
        permissions: permissions?.create || {},
        audit: { enabled: true, logLevel: 'detailed' },
      },
      update: {
        name: `update${entityName}`,
        version: 1,
        createdAt: now,
        description: `Update an existing ${entityName}`,
        category: 'crud',
        mutate: async (input, ctx) => {
          // Auto-generated update logic
          throw new Error('Not implemented - will be generated')
        },
        permissions: permissions?.update || {},
        audit: { enabled: true, logLevel: 'full' },
      },
      delete: {
        name: `delete${entityName}`,
        version: 1,
        createdAt: now,
        description: `Delete a ${entityName}`,
        category: 'crud',
        mutate: async (id, ctx) => {
          // Auto-generated delete logic
          throw new Error('Not implemented - will be generated')
        },
        permissions: permissions?.delete || {},
        audit: { enabled: true, logLevel: 'full' },
      },
      softDelete: {
        name: `softDelete${entityName}`,
        version: 1,
        createdAt: now,
        description: `Soft delete a ${entityName}`,
        category: 'crud',
        mutate: async (id, ctx) => {
          // Auto-generated soft delete logic
          throw new Error('Not implemented - will be generated')
        },
        permissions: permissions?.delete || {},
        audit: { enabled: true, logLevel: 'detailed' },
      },
      restore: {
        name: `restore${entityName}`,
        version: 1,
        createdAt: now,
        description: `Restore a soft-deleted ${entityName}`,
        category: 'crud',
        mutate: async (id, ctx) => {
          // Auto-generated restore logic
          throw new Error('Not implemented - will be generated')
        },
        permissions: permissions?.update || {},
        audit: { enabled: true, logLevel: 'detailed' },
      },
    }
  }

  /**
   * Create a custom mutator
   */
  static createCustom<T, TInput>(
    config: Omit<EntityMutator<T, TInput>, 'createdAt'> & {createdAt?: Date}
  ): EntityMutator<T, TInput> {
    return {
      ...config,
      createdAt: config.createdAt || new Date(),
    }
  }
}

/**
 * ============================================================================
 * ENTITY - Complete entity definition with all features
 * ============================================================================
 */

/**
 * Complete Entity definition - Single source of truth for your application
 */
export type Entity<
  T,
  C extends ComponentType = ComponentType,
  R extends ComponentType = ComponentType,
  E extends Record<string, any> = Record<string, any>
> = {
  // ===== Identity & Metadata =====
  id: string
  name: NameConfig
  version: number
  createdAt: Date
  updatedAt?: Date
  description?: string
  tags?: string[]
  category?: string
  icon?: string
  color?: string

  // ===== UI Components (actual functions, not strings!) =====
  components?: {
    display?: ComponentRef | DisplayComponentConfig
    input?: ComponentRef | InputComponentConfig
    loading?: ComponentRef | ComponentWithProps
    empty?: ComponentRef | ComponentWithProps
    error?: ComponentRef | ComponentWithProps
  }

  // ===== Database Schema =====
  db: {
    table: DbTable
    columns: {
      [K in keyof T]: DbColumn<T[K]>
    }
    indexes?: DbIndex[]
    constraints?: DbConstraint[]
  }

  // ===== Fields Configuration =====
  fields: {
    [K in keyof T]: FieldMapping<T[K], C>
  }

  // ===== Relationships =====
  relationships?: RelationshipMapping<T, any, C>[]

  // ===== Routes =====
  routes?: RoutesConfig<T, C, R>

  // ===== Tables/Lists =====
  tables?: TableFieldConfig<T, C>[]

  // ===== Mutations (with audit trail & versioning) =====
  mutators?: Record<string, EntityMutator<T, any>>
  mutationHistory?: MutationHistory<T>[]

  // ===== Standard CRUD operations (auto-generated) =====
  crud?: {
    createOne: EntityMutator<T, Partial<T>>
    createMany: EntityMutator<T[], Partial<T>[]>
    readOne: EntityMutator<T | null, string>
    readMany: EntityMutator<T[], Partial<T> | undefined>
    updateOne: EntityMutator<T, {id: string, data: Partial<T>}>
    updateMany: EntityMutator<T[], {filter: Partial<T>, data: Partial<T>}>
    deleteOne: EntityMutator<void, string>
    deleteMany: EntityMutator<{count: number}, Partial<T>>
    softDelete?: EntityMutator<T, string>
    restore?: EntityMutator<T, string>
  }

  // ===== Comprehensive Permissions =====
  permissions?: EntityPermissions

  // ===== Validation =====
  schema?: StandardSchema<T>

  // ===== Lifecycle Hooks =====
  hooks?: {
    beforeCreate?: (data: Partial<T>, ctx: MutationContext) => Promise<void>
    afterCreate?: (data: T, ctx: MutationContext) => Promise<void>
    beforeUpdate?: (id: string, data: Partial<T>, ctx: MutationContext) => Promise<void>
    afterUpdate?: (data: T, ctx: MutationContext) => Promise<void>
    beforeDelete?: (id: string, ctx: MutationContext) => Promise<void>
    afterDelete?: (id: string, ctx: MutationContext) => Promise<void>
  }

  // ===== Computed Fields =====
  computed?: {
    [key: string]: {
      compute: (entity: T) => any
      dependencies: Array<keyof T>
      cached?: boolean
      ttl?: number
    }
  }

  // ===== Sync Configuration =====
  sync?: SyncConfig<T>
  getKey?: (item: T) => string | number
  rowUpdateMode?: 'partial' | 'full'

  // ===== Deprecated/Migration =====
  deprecated?: boolean
  replacedBy?: string
  migrationPath?: string
} & E

/**
 * ============================================================================
 * RUNTIME FEATURES - Validators, Mappings, Patterns, Utilities
 * ============================================================================
 */

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
 * Component type constants
 */
export type FormComponent = keyof Pick<UIComponents, 'TextField' | 'NumberField' | 'Checkbox' | 'TextArea' | 'Select' | 'DatePicker' | 'FilePicker' | 'RichTextEditor' | 'ColorPicker' | 'RadioGroup'>
export type DisplayComponent = keyof Pick<UIComponents, 'Text' | 'Number' | 'Currency' | 'Badge' | 'CompletedBadge' | 'DateTime' | 'Link' | 'Email' | 'Image' | 'Avatar' | 'List'>

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
    inputComponent: null,
    displayComponent: 'DateTime' as any,
  },
  updatedAt: {
    inputComponent: null,
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
 * Display component render functions
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
 * Route generation configuration
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
 * ============================================================================
 * HELPER FUNCTIONS - Utilities for working with the mapping system
 * ============================================================================
 */

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
 * Create a validator
 */
export function createValidator<T>(schema: StandardSchema<T>): StandardSchema<T> {
  return schema
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
 * Create a component with props
 */
export function withProps<C extends ComponentType>(
  component: C,
  props: Parameters<C>[0]
): ComponentWithProps<C, Parameters<C>[0]> {
  return { component, props }
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
 * Type guards
 */
export function isComponentWithProps<C extends ComponentType>(
  value: C | ComponentWithProps<C> | undefined | null
): value is ComponentWithProps<C> {
  return value !== null && value !== undefined && typeof value === 'object' && 'component' in value && 'props' in value
}

export function isDisplayComponentConfig<C extends ComponentType>(
  value: C | DisplayComponentConfig | undefined | null
): value is DisplayComponentConfig {
  return value !== null && value !== undefined && typeof value === 'object' && 'listComponent' in value
}

export function extractStandardSchema<T>(field: Partial<FieldMapping<T>>): StandardSchema<T> | undefined {
  return field.standardSchema
}

export function getComponentProps<C extends ComponentType>(
  value: C | ComponentWithProps<C> | undefined | null
): Parameters<C>[0] | undefined {
  if (isComponentWithProps(value)) {
    return value.props
  }
  return undefined
}

/**
 * ============================================================================
 * CODE GENERATION SYSTEM - Generate everything from entity configuration
 * ============================================================================
 */

/**
 * Generated code output
 */
export interface GeneratedCode {
  database: {
    drizzle: string
    prisma: string
    sql: string
    convex: string
    migrations: string[]
  }
  api: {
    routes: string
    controllers: string
    middleware: string
    validators: string
    openapi: string
  }
  frontend: {
    routes: Record<string, string> // Route name -> component code
    forms: Record<string, string> // Form name -> component code
    tables: string
    components: Record<string, string>
  }
  tests: {
    unit: string[]
    integration: string[]
    e2e: string[]
    permissions: string[]
  }
  docs: {
    markdown: string
    openapi: string
    permissionMatrix: string
    erd: string // Entity Relationship Diagram
  }
}

/**
 * Code Generator - Generate complete applications from entity definitions
 */
export class CodeGenerator {
  /**
   * Generate all code for an entity
   */
  static generateAll<T>(entity: Entity<T>): GeneratedCode {
    return {
      database: this.generateDatabase(entity),
      api: this.generateAPI(entity),
      frontend: this.generateFrontend(entity),
      tests: this.generateTests(entity),
      docs: this.generateDocs(entity),
    }
  }

  /**
   * Generate database schemas for various ORMs
   */
  static generateDatabase<T>(entity: Entity<T>): GeneratedCode['database'] {
    const tableName = entity.db.table.name
    const columns = entity.db.columns

    // Generate Drizzle schema
    const drizzle = `
import { pgTable, varchar, integer, boolean, timestamp, uuid } from 'drizzle-orm/pg-core'

export const ${tableName} = pgTable('${tableName}', {
${Object.entries(columns).map(([name, col]: [string, DbColumn]) => {
  const dbCol = col as DbColumn
  const colDef = dbCol.type.toDrizzle?.(name) || `text('${name}')`
  return `  ${name}: ${colDef},`
}).join('\n')}
})
`.trim()

    // Generate Prisma schema
    const prisma = `
model ${entity.name.singular} {
${Object.entries(columns).map(([name, col]: [string, DbColumn]) => {
  const dbCol = col as DbColumn
  const colDef = dbCol.type.toPrisma?.(name) || `${name} String`
  return `  ${colDef}`
}).join('\n')}
}
`.trim()

    // Generate SQL
    const sql = `
CREATE TABLE ${tableName} (
${Object.entries(columns).map(([name, col]: [string, DbColumn]) => {
  const dbCol = col as DbColumn
  const colDef = dbCol.type.toSQL?.(name, 'postgres') || `${name} TEXT`
  return `  ${colDef},`
}).join('\n')}
  PRIMARY KEY (${entity.db.table.primaryKey.join(', ')})
);
`.trim()

    // Generate Convex schema
    const convex = `
import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const ${tableName} = defineTable({
${Object.entries(columns).map(([name, col]: [string, DbColumn]) => {
  const dbCol = col as DbColumn
  const colDef = dbCol.type.toConvex?.(name) || `${name}: v.string()`
  return `  ${colDef},`
}).join('\n')}
})
`.trim()

    return { drizzle, prisma, sql, convex, migrations: [] }
  }

  /**
   * Generate API code (routes, controllers, etc.)
   */
  static generateAPI<T>(entity: Entity<T>): GeneratedCode['api'] {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural

    const routes = `
// Auto-generated routes for ${entityName}
import express from 'express'
import { ${pluralName}Controller } from './controllers/${pluralName}.controller'
import { permissionMiddleware } from './middleware/permissions'

const router = express.Router()

router.get('/', permissionMiddleware('${pluralName}', 'list'), ${pluralName}Controller.list)
router.get('/:id', permissionMiddleware('${pluralName}', 'read'), ${pluralName}Controller.get)
router.post('/', permissionMiddleware('${pluralName}', 'create'), ${pluralName}Controller.create)
router.put('/:id', permissionMiddleware('${pluralName}', 'update'), ${pluralName}Controller.update)
router.delete('/:id', permissionMiddleware('${pluralName}', 'delete'), ${pluralName}Controller.delete)

export default router
`.trim()

    const controllers = `
// Auto-generated controller for ${entityName}
export class ${pluralName}Controller {
  static async list(req, res) {
    // TODO: Implement list
  }

  static async get(req, res) {
    // TODO: Implement get
  }

  static async create(req, res) {
    // TODO: Implement create
  }

  static async update(req, res) {
    // TODO: Implement update
  }

  static async delete(req, res) {
    // TODO: Implement delete
  }
}
`.trim()

    const middleware = `
// Permission middleware
export function permissionMiddleware(entity: string, action: string) {
  return async (req, res, next) => {
    // TODO: Implement permission check
    next()
  }
}
`.trim()

    return {
      routes,
      controllers,
      middleware,
      validators: '// TODO: Generate validators',
      openapi: '// TODO: Generate OpenAPI spec',
    }
  }

  /**
   * Generate frontend code (routes, forms, tables)
   */
  static generateFrontend<T>(entity: Entity<T>): GeneratedCode['frontend'] {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural

    const routes: Record<string, string> = {
      list: `
// List${pluralName} component
export function List${pluralName}() {
  // TODO: Implement list view
  return <div>List of ${pluralName}</div>
}
`.trim(),
      detail: `
// ${entityName}Detail component
export function ${entityName}Detail({ id }: { id: string }) {
  // TODO: Implement detail view
  return <div>${entityName} Detail</div>
}
`.trim(),
      create: `
// Create${entityName} component
export function Create${entityName}() {
  // TODO: Implement create form
  return <div>Create ${entityName}</div>
}
`.trim(),
      edit: `
// Edit${entityName} component
export function Edit${entityName}({ id }: { id: string }) {
  // TODO: Implement edit form
  return <div>Edit ${entityName}</div>
}
`.trim(),
    }

    const forms: Record<string, string> = {
      create: `// TODO: Generate create form with field-level permissions`,
      edit: `// TODO: Generate edit form with field-level permissions`,
    }

    const tables = `// TODO: Generate table component`

    return { routes, forms, tables, components: {} }
  }

  /**
   * Generate tests
   */
  static generateTests<T>(entity: Entity<T>): GeneratedCode['tests'] {
    return {
      unit: ['// TODO: Generate unit tests'],
      integration: ['// TODO: Generate integration tests'],
      e2e: ['// TODO: Generate E2E tests'],
      permissions: ['// TODO: Generate permission tests'],
    }
  }

  /**
   * Generate documentation
   */
  static generateDocs<T>(entity: Entity<T>): GeneratedCode['docs'] {
    const entityName = entity.name.singular

    const markdown = `
# ${entityName}

${entity.description || ''}

## Fields

${Object.entries(entity.fields).map(([name, field]) => {
  return `- **${name}**: ${(field as any).jsType || 'unknown'}`
}).join('\n')}

## Permissions

// TODO: Document permissions

## API Endpoints

// TODO: Document API endpoints
`.trim()

    return {
      markdown,
      openapi: '// TODO: Generate OpenAPI spec',
      permissionMatrix: '// TODO: Generate permission matrix',
      erd: '// TODO: Generate ERD',
    }
  }

  /**
   * Generate schema for a specific ORM
   */
  static generateSchema<T>(entity: Entity<T>, target: 'drizzle' | 'prisma' | 'sql' | 'convex'): string {
    const db = this.generateDatabase(entity)
    return db[target]
  }
}

/**
 * Schema Generator - Generate database schemas
 */
export class SchemaGenerator {
  /**
   * Convert DbSchema to Drizzle code
   */
  static toDrizzle(schema: DbSchema): string {
    // TODO: Implement full Drizzle schema generation
    return '// TODO: Implement Drizzle schema generation'
  }

  /**
   * Convert DbSchema to Prisma code
   */
  static toPrisma(schema: DbSchema): string {
    // TODO: Implement full Prisma schema generation
    return '// TODO: Implement Prisma schema generation'
  }

  /**
   * Convert DbSchema to raw SQL
   */
  static toSQL(schema: DbSchema, dialect: 'postgres' | 'mysql' | 'sqlite' = 'postgres'): string {
    // TODO: Implement full SQL generation
    return '// TODO: Implement SQL generation'
  }

  /**
   * Convert DbSchema to Convex code
   */
  static toConvex(schema: DbSchema): string {
    // TODO: Implement full Convex schema generation
    return '// TODO: Implement Convex schema generation'
  }
}

