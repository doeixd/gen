/**
 * Type-Safe Builders and Factory Functions
 * Fluent API for constructing entities, fields, relationships, and more
 */

import type { Entity, FieldMapping, RoutesConfig, NameConfig, RelationshipMapping } from './entity'
import type { DbColumn, DbColumnType, DbIndex, DbConstraint } from './database'
import type { PermissionConfig } from './permissions'
import type { EntityMutator } from './mutations'
import type { StandardSchema } from './validators'
import { validators } from './validators'
import { dbTypes } from './database'
import { MutatorFactory } from './mutations'

/**
 * Field Builder - Fluent API for building field mappings
 */
export class FieldBuilder<T = any> {
  private config: Partial<FieldMapping<T>> = {}

  static create<T>(): FieldBuilder<T> {
    return new FieldBuilder<T>()
  }

  displayComponent<C extends ComponentType>(component: C | import('./components').DisplayComponentConfig<C>) {
    this.config.displayComponent = component as any
    return this
  }

  inputComponent<C extends ComponentType>(component: C | import('./components').ComponentWithProps<C>) {
    this.config.inputComponent = component as any
    return this
  }

  loadingComponent<C extends ComponentType>(component: C | import('./components').ComponentWithProps<C>) {
    this.config.loadingComponent = component as any
    return this
  }

  defaultValue(value: T | (() => T)) {
    this.config.defaultValue = value
    return this
  }

  schema(schema: StandardSchema<any>) {
    this.config.standardSchema = schema
    return this
  }

  sortable(sortable: boolean | ((a: T, b: T) => number) = true) {
    this.config.sortable = sortable
    return this
  }

  filterable(filterable: boolean | ((item: T, filterValue: any) => boolean) = true) {
    this.config.filterable = filterable
    return this
  }

  optional(isOptional = true) {
    this.config.optional = isOptional
    return this
  }

  editable(isEditable = true) {
    this.config.editable = isEditable
    return this
  }

  permissions(permissions: PermissionConfig) {
    this.config.permissions = permissions
    return this
  }

  jsType(type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date') {
    this.config.jsType = type
    return this
  }

  build(): FieldMapping<T> {
    return this.config as FieldMapping<T>
  }
}

/**
 * Database Column Builder
 */
export class DbColumnBuilder<T = any> {
  private config: Partial<DbColumn<T>> = {}

  static create<T>(type: DbColumnType<T>): DbColumnBuilder<T> {
    return new DbColumnBuilder<T>().type(type)
  }

  type(type: DbColumnType<T>) {
    this.config.type = type
    return this
  }

  nullable(nullable = true) {
    this.config.nullable = nullable
    return this
  }

  default(value: T | (() => T)) {
    this.config.default = value
    return this
  }

  unique(unique = true) {
    this.config.unique = unique
    return this
  }

  indexed(indexed = true) {
    this.config.indexed = indexed
    return this
  }

  primary(primary = true) {
    this.config.primary = primary
    return this
  }

  autoIncrement(autoIncrement = true) {
    this.config.autoIncrement = autoIncrement
    return this
  }

  generated(generated: 'always' | 'by-default') {
    this.config.generated = generated
    return this
  }

  generatedAs(expression: string) {
    this.config.generatedAs = expression
    return this
  }

  comment(comment: string) {
    this.config.comment = comment
    return this
  }

  build(): DbColumn<T> {
    if (!this.config.type) {
      throw new Error('DbColumn requires a type')
    }
    return this.config as DbColumn<T>
  }
}

/**
 * Entity Builder - Fluent API for building entities
 */
export class EntityBuilder<T extends Record<string, any>> {
  private config: Partial<Entity<T>> & {
    id: string
    name: NameConfig
    db: Entity<T>['db']
    fields: Entity<T>['fields']
  }

  constructor(id: string, name: NameConfig) {
    this.config = {
      id,
      name,
      version: 1,
      createdAt: new Date(),
      db: {
        table: { name: name.db || name.plural.toLowerCase(), primaryKey: ['id'], columns: new Map() },
        columns: {} as any,
      },
      fields: {} as any,
    }
  }

  static create<T extends Record<string, any>>(id: string, singular: string, plural?: string): EntityBuilder<T> {
    return new EntityBuilder<T>(id, {
      singular,
      plural: plural || `${singular}s`,
      display: singular,
    })
  }

  description(description: string) {
    this.config.description = description
    return this
  }

  tags(tags: string[]) {
    this.config.tags = tags
    return this
  }

  category(category: string) {
    this.config.category = category
    return this
  }

  icon(icon: string) {
    this.config.icon = icon
    return this
  }

  color(color: string) {
    this.config.color = color
    return this
  }

  field<K extends keyof T>(
    name: K,
    dbColumn: DbColumn<any>,
    fieldMapping: FieldMapping<any>
  ) {
    this.config.db.columns[name] = dbColumn
    this.config.fields[name] = fieldMapping
    return this
  }

  stringField(
    name: keyof T,
    options?: {
      maxLength?: number
      nullable?: boolean
      unique?: boolean
      defaultValue?: string
      schema?: StandardSchema<any>
    }
  ) {
    const dbColumn = DbColumnBuilder
      .create(dbTypes.string(options?.maxLength))
      .nullable(options?.nullable ?? false)
      .unique(options?.unique ?? false)
      .build()

      const fieldMapping = FieldBuilder
        .create<string>()
        .inputComponent('TextField' as any)
        .displayComponent('Text' as any)
        .defaultValue(options?.defaultValue || '')
        .schema(options?.schema || validators.string)
        .jsType('string')
        .build()

      return this.field(name, dbColumn, fieldMapping as any)
  }

  numberField(
    name: keyof T,
    options?: {
      nullable?: boolean
      defaultValue?: number
      schema?: StandardSchema<any>
    }
  ) {
    const dbColumn = DbColumnBuilder
      .create(dbTypes.number())
      .nullable(options?.nullable ?? false)
      .build()

      const fieldMapping = FieldBuilder
        .create<number>()
        .inputComponent('NumberField' as any)
        .displayComponent('Number' as any)
        .defaultValue(options?.defaultValue ?? 0)
        .schema(options?.schema || validators.number)
        .jsType('number')
        .build()

      return this.field(name, dbColumn, fieldMapping as any)
  }

  booleanField(
    name: keyof T,
    options?: {
      defaultValue?: boolean
      schema?: StandardSchema<any>
    }
  ) {
    const dbColumn = DbColumnBuilder
      .create(dbTypes.boolean())
      .nullable(false)
      .build()

      const fieldMapping = FieldBuilder
        .create<boolean>()
        .inputComponent('Checkbox' as any)
        .displayComponent('Badge' as any)
        .defaultValue(options?.defaultValue ?? false)
        .schema(options?.schema || validators.boolean)
        .jsType('boolean')
        .build()

      return this.field(name, dbColumn, fieldMapping as any)
  }

  emailField(name: keyof T) {
    const dbColumn = DbColumnBuilder
      .create(dbTypes.string(255))
      .unique(true)
      .build()

      const fieldMapping = FieldBuilder
        .create<string>()
        .inputComponent('TextField' as any)
        .displayComponent('Email' as any)
        .defaultValue('')
        .schema(validators.email)
        .jsType('string')
       .build()

     return this.field(name, dbColumn, fieldMapping as any)
  }

  urlField(name: keyof T, optional = false) {
    const dbColumn = DbColumnBuilder
      .create(dbTypes.string(2048))
      .nullable(optional)
      .build()

      const fieldMapping = FieldBuilder
        .create<string>()
        .inputComponent('TextField' as any)
        .displayComponent('Link' as any)
        .defaultValue('')
        .schema(optional ? validators.optional(validators.url) : validators.url)
        .jsType('string')
        .build()

      return this.field(name, dbColumn, fieldMapping as any)
  }

   timestamps() {
      this.field(
        'createdAt' as keyof T,
        DbColumnBuilder.create(dbTypes.timestamp()).nullable(false).build(),
        FieldBuilder.create<Date>()
          .displayComponent('DateTime' as any)
          .editable(false)
          .build() as any
      ) as any

      this.field(
        'updatedAt' as keyof T,
        DbColumnBuilder.create(dbTypes.timestamp()).nullable(true).build(),
        FieldBuilder.create<Date>()
          .displayComponent('DateTime' as any)
         .editable(false)
         .build() as any
     ) as any

    return this
  }

  permissions(permissions: import('./permissions').EntityPermissions) {
    this.config.permissions = permissions
    return this
  }

  routes(routes: RoutesConfig<T, ComponentType, ComponentType>) {
    this.config.routes = routes
    return this
  }

  index(index: DbIndex) {
    if (!this.config.db.indexes) {
      this.config.db.indexes = []
    }
    this.config.db.indexes.push(index)
    return this
  }

  constraint(constraint: DbConstraint) {
    if (!this.config.db.constraints) {
      this.config.db.constraints = []
    }
    this.config.db.constraints.push(constraint)
    return this
  }

  relationship<TForeign = any>(relationship: RelationshipMapping<T, TForeign>) {
    if (!this.config.relationships) {
      this.config.relationships = []
    }
    this.config.relationships.push(relationship)
    return this
  }

  mutator(name: string, mutator: EntityMutator<any, any>) {
    if (!this.config.mutators) {
      this.config.mutators = {}
    }
    this.config.mutators[name] = mutator
    return this
  }

  schema(schema: StandardSchema<T>) {
    this.config.schema = schema
    return this
  }

  computed<K extends string>(
    name: K,
    compute: (entity: T) => any,
    dependencies: Array<keyof T>,
    options?: { cached?: boolean; ttl?: number }
  ) {
    if (!this.config.computed) {
      this.config.computed = {}
    }
    this.config.computed[name] = {
      compute,
      dependencies,
      ...options,
    }
    return this
  }

  hooks(hooks: Entity<T>['hooks']) {
    this.config.hooks = hooks
    return this
  }

  build(): Entity<T> {
    // Setup table columns map
    this.config.db.table.columns = new Map(
      Object.entries(this.config.db.columns).map(([k, v]) => [k, v as DbColumn])
    )

     // Auto-generate CRUD mutators if not provided
     if (!this.config.crud) {
       this.config.crud = MutatorFactory.createStandardCRUD<T>(
         this.config.name.singular,
         this.config.permissions?.routes
       ) as any
     }

    return this.config as Entity<T>
  }
}

/**
 * Relationship Builder
 */
export class RelationshipBuilder<TLocal, TForeign = any> {
  private config: Partial<RelationshipMapping<TLocal, TForeign>> = {
    version: 1,
  }

  static create<TLocal, TForeign = any>(name: string): RelationshipBuilder<TLocal, TForeign> {
    const builder = new RelationshipBuilder<TLocal, TForeign>()
    builder.config.name = name
    return builder
  }

  description(description: string) {
    this.config.description = description
    return this
  }

  entities(local: string | Entity<TLocal>, foreign: string | Entity<TForeign>) {
    this.config.localEntity = local as any
    this.config.foreignEntity = foreign as any
    return this
  }

  oneToOne() {
    this.config.relationType = 'one-to-one'
    return this
  }

  oneToMany() {
    this.config.relationType = 'one-to-many'
    return this
  }

  manyToOne() {
    this.config.relationType = 'many-to-one'
    return this
  }

  manyToMany(junctionTableName: string) {
    this.config.relationType = 'many-to-many'
     if (!this.config.db) {
       this.config.db = {} as any
     }
     (this.config.db as any).junctionTable = {
       name: junctionTableName,
       localColumn: '',
       foreignColumn: '',
     }
    return this
  }

  foreignKey(
    localColumn: keyof TLocal | string,
    foreignColumn: keyof TForeign | string,
    options?: {
      onDelete?: 'cascade' | 'set-null' | 'restrict' | 'no-action'
      onUpdate?: 'cascade' | 'set-null' | 'restrict' | 'no-action'
      indexed?: boolean
      deferrable?: boolean
      constraintName?: string
    }
  ) {
     if (!this.config.db) {
       this.config.db = {} as any
     }
     (this.config.db as any).foreignKey = {
       localColumn: localColumn as string,
       foreignColumn: foreignColumn as string,
       onDelete: options?.onDelete || 'cascade',
       onUpdate: options?.onUpdate || 'cascade',
       indexed: options?.indexed ?? true,
       deferrable: options?.deferrable,
       constraintName: options?.constraintName,
     }
    return this
  }

  display(displayField: keyof TForeign | string, options?: {
    component?: import('./components').ComponentRef
    eager?: boolean
    limit?: number
  }) {
    this.config.display = {
      displayField: displayField as string,
      displayComponent: options?.component,
      eager: options?.eager,
      limit: options?.limit,
    }
    return this
  }

  query(
    fetchRelated: (id: string | number) => Promise<TForeign | TForeign[] | null>,
    queryRelated?: (filter: Partial<TForeign>) => Promise<TForeign[]>
  ) {
    this.config.query = {
      fetchRelated,
      queryRelated,
    }
    return this
  }

  caching(options: { enabled: boolean; ttl?: number; strategy?: 'lru' | 'fifo' | 'lfu' }) {
     if (!this.config.query) {
       this.config.query = {} as any
     }
     (this.config.query as any).caching = options
    return this
  }

  permissions(permissions: PermissionConfig) {
    this.config.permissions = permissions
    return this
  }

  schema(schema: StandardSchema<TForeign | TForeign[]>) {
    this.config.standardSchema = schema
    return this
  }

  build(): RelationshipMapping<TLocal, TForeign> {
    if (!this.config.name) {
      throw new Error('Relationship requires a name')
    }
    if (!this.config.localEntity || !this.config.foreignEntity) {
      throw new Error('Relationship requires local and foreign entities')
    }
    if (!this.config.relationType) {
      throw new Error('Relationship requires a type (oneToOne, oneToMany, manyToOne, manyToMany)')
    }
    return this.config as RelationshipMapping<TLocal, TForeign>
  }
}

/**
 * Quick factory functions for common patterns
 */
export const builders = {
  entity: EntityBuilder.create,
  field: FieldBuilder.create,
  dbColumn: DbColumnBuilder.create,
  relationship: RelationshipBuilder.create,
}
