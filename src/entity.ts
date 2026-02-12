/**
 * Entity Configuration
 * Complete entity definition with compatibility for legacy and modern shapes
 */

import type { StandardSchema, Validator, AsyncValidator } from './validators'
import type {
  ComponentRef,
  ComponentReference,
  ComponentWithProps,
  DisplayComponentConfig,
  InputComponentConfig,
  ResolvableComponent,
} from './components'
import type { DbTable, DbColumn, DbIndex, DbConstraint } from './database'
import type { PermissionConfig, EntityPermissions, RoutePermissionConfig } from './permissions'
import type { EntityMutator, MutationContext, MutationHistory } from './mutations'
import type { EntityErrorConfig } from './errors'

declare global {
  type RoleType = 'user' | 'admin' | 'superadmin' | (string & {})
}

export interface CRUDResult {
  createOne<T>(data: T): Promise<{ success: boolean; data?: T; error?: string }>
  createMany<T>(data: T[]): Promise<{ success: boolean; data?: T[]; errors?: string[] }>
  readOne<T>(id: string): Promise<{ success: boolean; data?: T; error?: string }>
  readMany<T>(filter?: Partial<T>): Promise<{ success: boolean; data?: T[]; error?: string }>
  updateOne<T>(id: string, data: Partial<T>): Promise<{ success: boolean; data?: T; error?: string }>
  updateMany<T>(filter: Partial<T>, data: Partial<T>): Promise<{ success: boolean; data?: T[]; errors?: string[] }>
  deleteOne<_T>(id: string): Promise<{ success: boolean; error?: string }>
  deleteMany<T>(filter: Partial<T>): Promise<{ success: boolean; count?: number; errors?: string[] }>
}

export interface SyncConfig<T> {
  enabled?: boolean
  interval?: number
  onSync?: (data: T[]) => void
  onError?: (error: Error) => void
}

export interface NameConfig {
  singular: string
  plural: string
  display?: string
  internal?: string
  db?: string
}

export interface ValidationConfig<T> {
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

export interface LegacyApiRouteConfig {
  basePath?: string
  endpoints?: Record<string, {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    path: string
    permissions?: EntityPermissions | PermissionConfig
  }>
}

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

  // Legacy route config used throughout tests/templates
  api?: LegacyApiRouteConfig
}

export interface FieldMapping<T, C extends ComponentType = ComponentType> {
  displayComponent?: C | ResolvableComponent | ComponentReference | DisplayComponentConfig<C>
  inputComponent?: C | ResolvableComponent | ComponentReference | ComponentWithProps<C>
  component?: C | ResolvableComponent | ComponentReference | ComponentWithProps<C>
  loadingComponent?: C | ResolvableComponent | ComponentReference | ComponentWithProps<C>
  emptyComponent?: C | ResolvableComponent | ComponentReference | ComponentWithProps<C>
  defaultValue?: T | (() => T)
  version?: number
  validation?: ((value: any) => import('./validators').ValidationResult | Promise<import('./validators').ValidationResult>) | ValidationConfig<T>
  typescriptType?: T
  sortable?: boolean | ((a: T, b: T) => number)
  filterable?: boolean | ((item: T, filterValue: any) => boolean)
  routes?: RoutesConfig<any, any>
  name?: string | NameConfig
  optional?: boolean
  editable?: boolean
  standardSchema?: StandardSchema<T>
  permissions?: PermissionConfig
  jsType?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date'
  excludeFromForms?: boolean
  excludeFromList?: boolean
  label?: string
  description?: string

  openapi?: {
    description?: string
    example?: any
    deprecated?: boolean
  }

  graphql?: {
    type?: string
    directives?: string[]
  }

  serialize?: boolean
  deserialize?: boolean
  transform?: (value: any) => any

  searchable?: boolean
  indexed?: boolean
  weight?: number

  formGroup?: string
  formOrder?: number
  placeholder?: string
  helpText?: string
}

export interface TableConfig<T = any, C extends ComponentType = ComponentType> extends TableFieldConfig<T, C> {
  tableName: string
}

interface TableFieldConfig<T, C extends ComponentType = ComponentType> {
  tableComponent: C | ResolvableComponent | ComponentReference | ComponentWithProps<C>
  layout: 'list' | 'card' | 'custom'
  columns?: Array<Extract<keyof T, string>>
  sortable?: string[]
  searchable?: string[]
  pageSize?: number
  enableVirtualScroll?: boolean
  enableGlobalFilter?: boolean
  enablePagination?: boolean
  enableColumnFilters?: boolean
  enableRowSelection?: boolean
  enableSorting?: boolean
  defaultSortColumn?: Extract<keyof T, string>
  defaultSortDirection?: 'asc' | 'desc'
  customColumnRenderers?: Record<string, string>
  permissions?: RoutePermissionConfig
  version?: number
  onError?: (error: Error) => void
}

export interface RelationshipMapping<TLocal extends Record<string, any>, TForeign extends Record<string, any> = Record<string, any>, C extends ComponentType = ComponentType> {
  name: string
  version?: number
  description?: string

  localEntity: string | Entity<TLocal, C>
  foreignEntity: string | Entity<TForeign, C>

  relationType: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'
  type?: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'

  db?: {
    foreignKey?: {
      localColumn: Extract<keyof TLocal, string> | string
      foreignColumn: Extract<keyof TForeign, string> | string
      onDelete?: 'cascade' | 'set-null' | 'restrict' | 'no-action'
      onUpdate?: 'cascade' | 'set-null' | 'restrict' | 'no-action'
      indexed?: boolean
      deferrable?: boolean
      constraintName?: string
    }
    junctionTable?: {
      name: string
      localColumn: string
      foreignColumn: string
      additionalColumns?: Record<string, DbColumn>
    }
    indexes?: Array<{
      name: string
      columns: string[]
      unique?: boolean
      where?: string
    }>
  }

  // Legacy fields (still used by tests/templates/builders)
  foreignKey?: string
  localKey?: string
  onDelete?: string
  onUpdate?: string
  junctionTable?: string
  junctionColumns?: {
    localKey: string
    foreignKey: string
  }

  display?: {
    displayField: Extract<keyof TForeign, string> | string
    displayComponent?: ComponentRef
    listComponent?: ComponentRef
    eager?: boolean
    limit?: number
  }

  query?: {
    fetchRelated?: (id: string | number) => Promise<TForeign | TForeign[] | null>
    queryRelated?: (filter: Partial<TForeign>) => Promise<TForeign[]>
    caching?: {
      enabled: boolean
      ttl?: number
      strategy?: 'lru' | 'fifo' | 'lfu'
    }
  }

  permissions?: PermissionConfig
  standardSchema?: StandardSchema<TForeign | TForeign[]>
}

export type RelationshipCollection<T extends Record<string, any>, C extends ComponentType = ComponentType> =
  | Record<string, RelationshipMapping<T, any, C>>
  | Array<RelationshipMapping<T, any, C>>

export type Entity<
  T extends Record<string, any>,
  C extends ComponentType = ComponentType,
  R extends ComponentType = ComponentType,
  E extends Record<string, any> = Record<string, any>
> = {
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

  components?: {
    display?: ComponentRef | DisplayComponentConfig
    input?: ComponentRef | InputComponentConfig
    loading?: ComponentRef | ComponentWithProps
    empty?: ComponentRef | ComponentWithProps
    error?: ComponentRef | ComponentWithProps
  }

  db: {
    table: DbTable
    columns: Record<string, DbColumn> & {
      [K in keyof T]: DbColumn<T[K]>
    }
    indexes?: DbIndex[]
    constraints?: DbConstraint[]
  }

  fields: Record<string, FieldMapping<any, C>> & {
    [K in keyof T]: FieldMapping<T[K], C>
  }

  relationships?: RelationshipCollection<T, C>
  routes?: RoutesConfig<T, C, R>
  tables?: TableFieldConfig<T, C>[]

  mutators?: Record<string, EntityMutator<T, any>>
  mutationHistory?: MutationHistory<T>[]

  crud?: Record<string, EntityMutator<any, any>>
  relations?: Record<string, {
    create?: EntityMutator<any, any>
    read?: EntityMutator<any, any>
    update?: EntityMutator<any, any>
    delete?: EntityMutator<any, any>
  }>

  permissions?: EntityPermissions
  schema?: StandardSchema<T>

  hooks?: {
    beforeCreate?: (data: Partial<T>, ctx: MutationContext) => Promise<void>
    afterCreate?: (data: T, ctx: MutationContext) => Promise<void>
    beforeUpdate?: (id: string, data: Partial<T>, ctx: MutationContext) => Promise<void>
    afterUpdate?: (data: T, ctx: MutationContext) => Promise<void>
    beforeDelete?: (id: string, ctx: MutationContext) => Promise<void>
    afterDelete?: (id: string, ctx: MutationContext) => Promise<void>
  }

  lifecycle?: {
    beforeCreate?: (data: Partial<T>, ctx: MutationContext) => Promise<void>
    afterCreate?: (data: T, ctx: MutationContext) => Promise<void>
    beforeUpdate?: (id: string, data: Partial<T>, ctx: MutationContext) => Promise<void>
    afterUpdate?: (data: T, ctx: MutationContext) => Promise<void>
    beforeDelete?: (id: string, ctx: MutationContext) => Promise<void>
    afterDelete?: (id: string, ctx: MutationContext) => Promise<void>
  }

  computed?: Record<string, {
    compute: (entity: T) => any
    dependencies: Array<Extract<keyof T, string>>
    cached?: boolean
    ttl?: number
  }>

  sync?: SyncConfig<T>
  getKey?: (item: T) => string | number
  rowUpdateMode?: 'partial' | 'full'
  errors?: EntityErrorConfig

  generateAPI?: boolean
  apiBasePath?: string
  openapi?: {
    tags?: string[]
    summary?: string
    description?: string
  }

  generateGraphQL?: boolean
  graphql?: {
    type?: 'type' | 'input' | 'interface'
    implements?: string[]
    directives?: string[]
  }

  generateComponents?: boolean
  componentPath?: string
  formLayout?: 'vertical' | 'horizontal' | 'inline'

  generateMigrations?: boolean
  migrationStrategy?: 'incremental' | 'snapshot'

  serializeAs?: 'json' | 'xml' | 'csv'
  excludeFields?: string[]
  includeFields?: string[]

  searchableFields?: string[]
  indexedFields?: string[]
  auditChanges?: boolean
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
  cacheStrategy?: 'none' | 'memory' | 'redis' | 'filesystem'
  cacheTTL?: number

  ui?: {
    list?: string[]
    form?: string[]
    detail?: string[]
  }

  // Legacy code generation block used by template helpers
  codegen?: {
    generateAPI?: boolean
    generateComponents?: boolean
    generateGraphQL?: boolean
    searchableFields?: string[]
    indexedFields?: string[]
    auditChanges?: boolean
  }

  deprecated?: boolean
  replacedBy?: string
  migrationPath?: string
} & E

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

export function getRelationships<T extends Record<string, any>, C extends ComponentType = ComponentType>(
  entity: Pick<Entity<T, C>, 'relationships'>
): Array<RelationshipMapping<T, any, C>> {
  if (!entity.relationships) return []
  return Array.isArray(entity.relationships) ? entity.relationships : Object.values(entity.relationships)
}
