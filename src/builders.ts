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

  setComponent<C extends ComponentType>(component: C) {
    (this.config as any).component = component
    return this
  }

  setDisplayComponent<C extends ComponentType>(component: C, props?: Record<string, any>) {
    if (props) {
      this.config.displayComponent = { component, props } as any
    } else {
      this.config.displayComponent = component as any
    }
    return this
  }

  setLoadingComponent<C extends ComponentType>(component: C) {
    this.config.loadingComponent = component as any
    return this
  }

  setEmptyComponent<C extends ComponentType>(component: C) {
    this.config.emptyComponent = component as any
    return this
  }

  setSchema(schema: StandardSchema<any>) {
    this.config.standardSchema = schema
    return this
  }

  setSortable(sortable: boolean | ((a: T, b: T) => number) = true) {
    this.config.sortable = sortable
    return this
  }

  setFilterable(filterable: boolean | ((item: T, filterValue: any) => boolean) = true) {
    this.config.filterable = filterable
    return this
  }

  setLabel(label: string) {
    (this.config as any).label = label
    return this
  }

  setDescription(description: string) {
    (this.config as any).description = description
    return this
  }

  setPlaceholder(placeholder: string) {
    (this.config as any).placeholder = placeholder
    return this
  }

  excludeFromForms() {
    (this.config as any).excludeFromForms = true
    return this
  }

  excludeFromList() {
    (this.config as any).excludeFromList = true
    return this
  }

  setOptional(isOptional = true) {
    this.config.optional = isOptional
    return this
  }

  setEditable(isEditable = true) {
    this.config.editable = isEditable
    return this
  }

  setPermissions(permissions: PermissionConfig) {
    this.config.permissions = permissions
    return this
  }

  setJsType(type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date') {
    this.config.jsType = type
    return this
  }

  setDefaultValue(value: T | (() => T)) {
    this.config.defaultValue = value
    return this
  }

  // Backwards compatibility aliases
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

  // Alias for type()
  setType(type: DbColumnType<T>) {
    return this.type(type)
  }

  nullable(nullable = true) {
    this.config.nullable = nullable
    return this
  }

  // Alias for nullable()
  setNullable(nullable = true) {
    return this.nullable(nullable)
  }

  default(value: T | (() => T)) {
    this.config.default = value
    return this
  }

  // Alias for default()
  setDefault(value: T | (() => T)) {
    return this.default(value)
  }

  unique(unique = true) {
    this.config.unique = unique
    return this
  }

  // Alias for unique()
  setUnique(unique = true) {
    return this.unique(unique)
  }

  indexed(indexed = true) {
    this.config.indexed = indexed
    return this
  }

  // Alias for indexed()
  addToIndex(indexName?: string) {
    this.config.indexed = true
    return this
  }

  primary(primary = true) {
    this.config.primary = primary
    return this
  }

  // Alias for primary()
  setPrimaryKey(primary = true) {
    return this.primary(primary)
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

  constructor(id: string, name?: NameConfig) {
    this.config = {
      id,
      name: name || { singular: id, plural: `${id}s`, display: id },
      version: 1,
      createdAt: new Date(),
      db: {
        table: { name: name?.db || name?.plural?.toLowerCase() || `${id}s`, primaryKey: ['id'], columns: new Map() },
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

  setName(singular: string, plural?: string) {
    this.config.name = {
      singular,
      plural: plural || `${singular}s`,
      display: singular,
    }
    return this
  }

  setTable(name: string, primaryKey: string[]) {
    this.config.db.table = {
      ...this.config.db.table,
      name,
      primaryKey,
    }
    return this
  }

  addField(name: string, field: FieldMapping<any>) {
    (this.config.fields as any)[name] = field
    return this
  }

  addColumn(name: string, column: DbColumn<any>) {
    (this.config.db.columns as any)[name] = column
    return this
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

  // Alias for permissions()
  setPermissions(permissions: import('./permissions').EntityPermissions) {
    return this.permissions(permissions)
  }

  routes(routes: RoutesConfig<T, ComponentType, ComponentType>) {
    this.config.routes = routes
    return this
  }

  // Alias for routes()
  setRoutes(routes: RoutesConfig<T, ComponentType, ComponentType>) {
    return this.routes(routes)
  }

  index(name: string, columns: string[], options?: { unique?: boolean }) {
    if (!this.config.db.indexes) {
      this.config.db.indexes = []
    }
    this.config.db.indexes.push({
    name,
  tableName: this.config.db.table.name,
  columns,
    unique: options?.unique || false,
  })
    return this
  }

  // Alias for index()
  addIndex(name: string, columns: string[], options?: { unique?: boolean }) {
    return this.index(name, columns, options)
  }

  constraint(constraint: DbConstraint) {
    if (!this.config.db.constraints) {
      this.config.db.constraints = []
    }
    this.config.db.constraints.push(constraint)
    return this
  }

  // Alias for constraint()
  addConstraint(constraint: DbConstraint) {
    return this.constraint(constraint)
  }

  relationship<TForeign = any>(relationship: RelationshipMapping<T, TForeign>) {
    if (!this.config.relationships) {
      this.config.relationships = {}
    }
    this.config.relationships[relationship.name] = relationship
    return this
  }

  // Add relationship by name and config (overloaded method)
  addRelationship<TForeign = any>(nameOrRelationship: string | RelationshipMapping<T, TForeign>, config?: {
    type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'
    foreignEntity: string | Entity<TForeign>
    foreignKey?: string
    localKey?: string
    junctionTable?: string
    cascade?: { onDelete?: string; onUpdate?: string }
    eager?: boolean
  }) {
    if (typeof nameOrRelationship === 'string' && config) {
      // Called with name and config
      return this.addRelationshipByName(nameOrRelationship, config)
    } else if (typeof nameOrRelationship === 'object') {
      // Called with RelationshipMapping object
      return this.relationship(nameOrRelationship)
    }
    return this
  }

  // Add relationship by name and config
  addRelationshipByName<TForeign = any>(name: string, config: {
    type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'
    foreignEntity: string | Entity<TForeign>
    foreignKey?: string
    localKey?: string
    junctionTable?: string
    cascade?: { onDelete?: string; onUpdate?: string }
    eager?: boolean
  }) {
    const relationship = RelationshipBuilder.create<T, TForeign>(name)
      .setType(config.type)
      .setLocalEntity(this.config.id)
      .setForeignEntity(config.foreignEntity)

    if (config.foreignKey) {
      relationship.setForeignKey(config.foreignKey)
    }
    if (config.localKey) {
      relationship.setLocalKey(config.localKey)
    }
    if (config.junctionTable) {
      relationship.setJunctionTable(config.junctionTable)
    }
    if (config.cascade) {
      relationship.setCascade(
        config.cascade.onDelete as any,
        config.cascade.onUpdate as any
      )
    }
    if (config.eager !== undefined) {
      relationship.setEagerLoad(config.eager)
    }

    if (!this.config.relationships) {
      this.config.relationships = {}
    }
    this.config.relationships[name] = relationship.build()
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

  // Add lifecycle hook (individual hook)
  addLifecycleHook<K extends keyof Entity<T>['hooks']>(
    hookName: K,
    hook: Entity<T>['hooks'][K]
  ) {
    if (!this.config.lifecycle) {
      this.config.lifecycle = {}
    }
    (this.config.lifecycle as any)[hookName] = hook
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

  static create<TLocal, TForeign = any>(name?: string): RelationshipBuilder<TLocal, TForeign> {
    const builder = new RelationshipBuilder<TLocal, TForeign>()
    if (name) {
      builder.config.name = name
    }
    return builder
  }

  // Set relationship name
  name(name: string) {
    this.config.name = name
    return this
  }

  setType(type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many') {
    (this.config as any).type = type
    this.config.relationType = type
    return this
  }

  setLocalEntity(localEntity: string | Entity<TLocal>) {
  this.config.localEntity = localEntity as any
  return this
  }

  setForeignEntity(foreignEntity: string | Entity<TForeign>) {
    this.config.foreignEntity = foreignEntity as any
    return this
  }

  setForeignKey(foreignKey: string) {
    (this.config as any).foreignKey = foreignKey
    return this
  }

  setLocalKey(localKey: string) {
    (this.config as any).localKey = localKey
    return this
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

  // Set junction table for many-to-many relationships
  setJunctionTable(name: string, localColumn?: string, foreignColumn?: string) {
    if (!this.config.db) {
      this.config.db = {} as any
    }
    (this.config.db as any).junctionTable = {
      name,
      localColumn: localColumn || '',
      foreignColumn: foreignColumn || '',
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

  // Set cascade options
  setCascade(onDelete: 'cascade' | 'set-null' | 'restrict' | 'no-action', onUpdate?: 'cascade' | 'set-null' | 'restrict' | 'no-action') {
    if (!this.config.db) {
      this.config.db = {} as any
    }
    if (!(this.config.db as any).foreignKey) {
      (this.config.db as any).foreignKey = {
        localColumn: '',
        foreignColumn: '',
        onDelete,
        onUpdate: onUpdate || onDelete,
        indexed: true,
      }
    } else {
      (this.config.db as any).foreignKey.onDelete = onDelete
      (this.config.db as any).foreignKey.onUpdate = onUpdate || onDelete
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

  // Set eager loading
  setEager(eager = true) {
    if (!this.config.display) {
      this.config.display = {
        displayField: '',
        eager,
      }
    } else {
      this.config.display.eager = eager
    }
    return this
  }

  // Alias for setEager
  setEagerLoad(eager = true) {
    return this.setEager(eager)
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
  column: DbColumnBuilder.create, // Alias for dbColumn
  dbColumn: DbColumnBuilder.create,
  relationship: RelationshipBuilder.create,
}
