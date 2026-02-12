import type { Entity, NameConfig, RoutesConfig } from './entity'
import {
  createCrudApiRoutes,
  createEntityObject,
  permissionPresets,
  type PrimitiveFieldType,
  type SimpleFieldDefinition,
} from './helpers'
import type { EntityPermissions } from './permissions'

export interface FieldToken<TValue> {
  readonly _value?: TValue
  readonly definition: SimpleFieldDefinition
  optional(): FieldToken<TValue | undefined>
  required(): FieldToken<Exclude<TValue, undefined>>
  unique(): FieldToken<TValue>
  indexed(): FieldToken<TValue>
  label(value: string): FieldToken<TValue>
}

class FieldTokenImpl<TValue> implements FieldToken<TValue> {
  readonly _value?: TValue

  constructor(public readonly definition: SimpleFieldDefinition) {}

  optional(): FieldToken<TValue | undefined> {
    return new FieldTokenImpl<TValue | undefined>({ ...this.definition, optional: true })
  }

  required(): FieldToken<Exclude<TValue, undefined>> {
    return new FieldTokenImpl<Exclude<TValue, undefined>>({ ...this.definition, optional: false })
  }

  unique(): FieldToken<TValue> {
    return new FieldTokenImpl<TValue>({ ...this.definition, unique: true })
  }

  indexed(): FieldToken<TValue> {
    return new FieldTokenImpl<TValue>({ ...this.definition, indexed: true })
  }

  label(value: string): FieldToken<TValue> {
    return new FieldTokenImpl<TValue>({ ...this.definition, label: value })
  }
}

export type FieldTokenMap = Record<string, FieldToken<unknown>>
export type InferEntityData<TFields extends FieldTokenMap> = {
  [K in keyof TFields]: TFields[K] extends FieldToken<infer V> ? V : never
}

export type FieldFactoryMap = Record<string, (...args: never[]) => FieldToken<unknown>>
export type DbFactoryMap = Record<string, (...args: never[]) => FieldToken<unknown>>

export interface PropHelpers {
  list<T extends string[]>(...fields: T): { list: T }
  form<T extends string[]>(...fields: T): { form: T }
  detail<T extends string[]>(...fields: T): { detail: T }
  merge<T extends object[]>(...defs: T): UnionToIntersection<T[number]>
}

type UnionToIntersection<U> =
  (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never

export interface RoutesHelpers {
  crud(basePath: string): ReturnType<typeof createCrudApiRoutes>
}

export interface PermissionHelpers {
  ownerAdmin(ownerField?: string): ReturnType<typeof permissionPresets.ownerAdmin>
  adminOnly(): ReturnType<typeof permissionPresets.adminOnly>
}

export interface EntityKitAdapters<
  TField extends FieldFactoryMap = DefaultFieldFactories,
  TDb extends DbFactoryMap = DefaultDbFactories,
  TRoutes extends RoutesHelpers = RoutesHelpers,
  TPerm extends PermissionHelpers = PermissionHelpers,
> {
  field: TField
  db: TDb
  routes: TRoutes
  perm: TPerm
}

type EntityKitEntityOptions<TFields extends FieldTokenMap> = {
  tableName?: string
  name?: Partial<NameConfig>
  fields: TFields
  includeTimestamps?: boolean
  routes?: Entity<InferEntityData<TFields>>['routes']
  permissions?: EntityPermissions
  props?: {
    list?: Array<keyof InferEntityData<TFields> & string>
    form?: Array<keyof InferEntityData<TFields> & string>
    detail?: Array<keyof InferEntityData<TFields> & string>
  }
}

const token = <T>(type: PrimitiveFieldType): FieldToken<T> => new FieldTokenImpl<T>({ type })

type DefaultFieldFactories = {
  string: () => FieldToken<string>
  number: () => FieldToken<number>
  boolean: () => FieldToken<boolean>
  date: () => FieldToken<string>
  email: () => FieldToken<string>
  url: () => FieldToken<string>
  text: () => FieldToken<string>
  id: () => FieldToken<string | number>
  enum: <T extends readonly string[]>(values: T) => FieldToken<T[number]>
}

type DefaultDbFactories = {
  id: () => FieldToken<string | number>
  string: () => FieldToken<string>
  text: () => FieldToken<string>
  integer: () => FieldToken<number>
  number: () => FieldToken<number>
  boolean: () => FieldToken<boolean>
  timestamp: () => FieldToken<string>
  date: () => FieldToken<string>
  ref: (reference: string) => FieldToken<string>
}

const defaultFieldFactories: DefaultFieldFactories = {
  string: () => token<string>('string'),
  number: () => token<number>('number'),
  boolean: () => token<boolean>('boolean'),
  date: () => token<string>('date'),
  email: () => token<string>('email'),
  url: () => token<string>('url'),
  text: () => token<string>('text'),
  id: () => token<string | number>('id'),
  enum: <T extends readonly string[]>(_values: T) => token<T[number]>('string'),
}

const defaultDbFactories: DefaultDbFactories = {
  id: () => token<string | number>('id'),
  string: () => token<string>('string'),
  text: () => token<string>('text'),
  integer: () => token<number>('number'),
  number: () => token<number>('number'),
  boolean: () => token<boolean>('boolean'),
  timestamp: () => token<string>('date'),
  date: () => token<string>('date'),
  ref: (_reference: string) => token<string>('string').indexed(),
}

const defaultPropHelpers: PropHelpers = {
  list: <T extends string[]>(...fields: T) => ({ list: fields }),
  form: <T extends string[]>(...fields: T) => ({ form: fields }),
  detail: <T extends string[]>(...fields: T) => ({ detail: fields }),
  merge: <T extends object[]>(...defs: T) => Object.assign({}, ...defs),
}

const defaultRoutesHelpers: RoutesHelpers = {
  crud: createCrudApiRoutes,
}

const defaultPermissionHelpers: PermissionHelpers = {
  ownerAdmin: permissionPresets.ownerAdmin,
  adminOnly: permissionPresets.adminOnly,
}

function buildFieldDefinitions(fields: FieldTokenMap): Record<string, SimpleFieldDefinition> {
  return Object.fromEntries(
    Object.entries(fields).map(([name, fieldToken]) => [name, fieldToken.definition])
  )
}

export function createEntityKit<
  TField extends FieldFactoryMap = DefaultFieldFactories,
  TDb extends DbFactoryMap = DefaultDbFactories,
  TRoutes extends RoutesHelpers = RoutesHelpers,
  TPerm extends PermissionHelpers = PermissionHelpers,
>(
  adapters?: Partial<EntityKitAdapters<TField, TDb, TRoutes, TPerm>>
) {
  const field = (adapters?.field ?? defaultFieldFactories) as TField
  const db = (adapters?.db ?? defaultDbFactories) as TDb
  const routes = (adapters?.routes ?? defaultRoutesHelpers) as TRoutes
  const perm = (adapters?.perm ?? defaultPermissionHelpers) as TPerm

  const entity = <TFields extends FieldTokenMap>(
    id: string,
    options: EntityKitEntityOptions<TFields>
  ): Entity<InferEntityData<TFields>> => {
    const built = createEntityObject<InferEntityData<TFields>>({
      id,
      name: options.name,
      tableName: options.tableName,
      fields: buildFieldDefinitions(options.fields),
      includeTimestamps: options.includeTimestamps,
    })

    if (options.routes) built.routes = options.routes
    if (options.permissions) built.permissions = options.permissions
    if (options.props) {
      built.ui = {
        ...built.ui,
        ...options.props,
      }
    }

    return built
  }

  return {
    field,
    db,
    prop: defaultPropHelpers,
    routes,
    perm,
    entity,
  }
}
