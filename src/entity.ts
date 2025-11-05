/**
 * Entity Configuration
 * Complete entity definition with all features - Single source of truth
 */

import type { StandardSchema, Validator, AsyncValidator } from './validators'
import type { ComponentRef, ComponentWithProps, DisplayComponentConfig, InputComponentConfig } from './components'
import type { DbTable, DbColumn, DbIndex, DbConstraint } from './database'
import type { PermissionConfig, EntityPermissions, RoutePermissionConfig } from './permissions'
import type { EntityMutator, MutationContext, MutationHistory } from './mutations'

declare global {
  type RoleType = 'user' | 'admin' | 'superadmin'
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
  deleteOne<_T>(id: string): Promise<{success: boolean, error?: string}>
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
 * Routes configuration for entity
 */
export interface RoutesConfig<_T = any, _C extends ComponentType = ComponentType, R extends ComponentType = ComponentType> {
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

/**
 * Name configuration
 */
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
export interface ValidationConfig<T, _C extends ComponentType = ComponentType> {
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
 * Field mapping configuration
 */
export interface FieldMapping<T, C extends ComponentType = ComponentType> {
  displayComponent?: C | DisplayComponentConfig<C>
  inputComponent?: C | ComponentWithProps<C>;
  loadingComponent?: C | ComponentWithProps<C>;
  emptyComponent?: C | ComponentWithProps<C>;
  defaultValue?: T | (() => T);
  version?: number;
  validation?: (value: any) => import('./validators').ValidationResult | Promise<import('./validators').ValidationResult> | ValidationConfig<T,C>
  typescriptType?: T // Phantom type for type inference
  sortable?: boolean | ((a: T, b: T) => number)
  filterable?: boolean | ((item: T, filterValue: any) => boolean)
  routes?: RoutesConfig<C, C>
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

   // ===== Relationship CRUD operations =====
   relations?: {
     [relationName: string]: {
       create?: EntityMutator<any, any>
       read?: EntityMutator<any, any>
       update?: EntityMutator<any, any>
       delete?: EntityMutator<any, any>
     }
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
