/**
 * Database Type System - Works with any database
 * Flexible types that can generate schemas for Drizzle, Prisma, SQL, Convex, etc.
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

// Type for column with modifiers
type DbColumnTypeWithModifiers<T> = DbColumnType<T> & {
  nullable: () => DbColumnTypeWithModifiers<T | null>
  default: (value: T | (() => T)) => DbColumnTypeWithModifiers<T>
  defaultNow: () => DbColumnTypeWithModifiers<T>
  unique: () => DbColumnTypeWithModifiers<T>
  primaryKey: () => DbColumnTypeWithModifiers<T>
  _modifiers?: {
    nullable?: boolean
    default?: T | (() => T)
    defaultNow?: boolean
    unique?: boolean
    primaryKey?: boolean
  }
}

/**
 * Adds modifier methods to a column type
 */
function withModifiers<T>(base: DbColumnType<T>): DbColumnTypeWithModifiers<T> {
  const enhanced = base as DbColumnTypeWithModifiers<T>
  enhanced._modifiers = {}

  enhanced.nullable = () => {
    const result = { ...enhanced, _modifiers: { ...enhanced._modifiers, nullable: true } }
    result.serialize = (v: any) => v === null ? null : base.serialize(v)
    result.deserialize = (v: any) => v === null ? null : base.deserialize(v)
    return withModifiers(result as DbColumnType<T | null>) as DbColumnTypeWithModifiers<T | null>
  }

  enhanced.default = (value: T | (() => T)) => {
    const result = { ...enhanced, _modifiers: { ...enhanced._modifiers, default: value } }
    const originalToDrizzle = result.toDrizzle
    if (originalToDrizzle) {
      result.toDrizzle = (col) => {
        const base = originalToDrizzle(col)
        const defaultValue = typeof value === 'function' ? '...' : JSON.stringify(value)
        return `${base}.default(${defaultValue})`
      }
    }
    return withModifiers(result as DbColumnType<T>) as DbColumnTypeWithModifiers<T>
  }

  enhanced.defaultNow = () => {
    const result = { ...enhanced, _modifiers: { ...enhanced._modifiers, defaultNow: true } }
    const originalToDrizzle = result.toDrizzle
    if (originalToDrizzle) {
      result.toDrizzle = (col) => `${originalToDrizzle(col)}.default(sql\`now()\`)`
    }
    return withModifiers(result as DbColumnType<T>) as DbColumnTypeWithModifiers<T>
  }

  enhanced.unique = () => {
    const result = { ...enhanced, _modifiers: { ...enhanced._modifiers, unique: true } }
    const originalToDrizzle = result.toDrizzle
    if (originalToDrizzle) {
      result.toDrizzle = (col) => `${originalToDrizzle(col)}.unique()`
    }
    return withModifiers(result as DbColumnType<T>) as DbColumnTypeWithModifiers<T>
  }

  enhanced.primaryKey = () => {
    const result = { ...enhanced, _modifiers: { ...enhanced._modifiers, primaryKey: true } }
    const originalToDrizzle = result.toDrizzle
    if (originalToDrizzle) {
      result.toDrizzle = (col) => `${originalToDrizzle(col)}.primaryKey()`
    }
    return withModifiers(result as DbColumnType<T>) as DbColumnTypeWithModifiers<T>
  }

  return enhanced
}

/**
 * Built-in database column types - works with any database
 */
export const dbTypes = {
  /**
   * String type (VARCHAR/TEXT)
   */
  string: (maxLength?: number): DbColumnTypeWithModifiers<string> => withModifiers({
    typeName: 'varchar',
    typeParams: maxLength ? [maxLength] : undefined,
    serialize: (v) => String(v),
    deserialize: (v) => String(v),
    validate: (v) => typeof v === 'string' && (!maxLength || v.length <= maxLength),
    toDrizzle: (col) => maxLength ? `varchar('${col}', { length: ${maxLength} })` : `text('${col}')`,
    toPrisma: (col) => `${col} String${maxLength ? ` @db.VarChar(${maxLength})` : ''}`,
    toSQL: (col) => maxLength ? `${col} VARCHAR(${maxLength})` : `${col} TEXT`,
    toConvex: (col) => `${col}: v.string()`,
  }),

  /**
   * Integer type
   */
  integer: (): DbColumnTypeWithModifiers<number> => withModifiers({
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
   * Number type (alias for integer for compatibility)
   */
  number: (): DbColumnTypeWithModifiers<number> => withModifiers({
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
  float: (precision?: number, scale?: number): DbColumnTypeWithModifiers<number> => withModifiers({
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
   * Decimal type with precision and scale
   */
  decimal: (precision: number, scale: number): DbColumnTypeWithModifiers<string> => withModifiers({
    typeName: 'decimal',
    typeParams: [precision, scale],
    serialize: (v) => String(v),
    deserialize: (v) => String(v),
    validate: (v) => typeof v === 'string' || typeof v === 'number',
    toDrizzle: (col) => `decimal('${col}', { precision: ${precision}, scale: ${scale} })`,
    toPrisma: (col) => `${col} Decimal @db.Decimal(${precision}, ${scale})`,
    toSQL: (col) => `${col} DECIMAL(${precision}, ${scale})`,
    toConvex: (col) => `${col}: v.string()`, // Convex stores decimals as strings
  }),

  /**
   * Boolean type
   */
  boolean: (): DbColumnTypeWithModifiers<boolean> => withModifiers({
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
   * Date type (date only, no time)
   */
  date: (): DbColumnTypeWithModifiers<Date> => withModifiers({
    typeName: 'date',
    serialize: (v) => v, // Keep as Date for type safety
    deserialize: (v) => v instanceof Date ? v : new Date(v),
    validate: (v) => v instanceof Date && !isNaN(v.getTime()),
    toDrizzle: (col) => `date('${col}')`,
    toPrisma: (col) => `${col} DateTime @db.Date`,
    toSQL: (col) => `${col} DATE`,
    toConvex: (col) => `${col}: v.number()`,
  }),

  /**
   * Timestamp type
   */
  timestamp: (): DbColumnTypeWithModifiers<Date> => withModifiers({
    typeName: 'timestamp',
    serialize: (v) => v, // Keep as Date for type safety
    deserialize: (v) => v instanceof Date ? v : new Date(v),
    validate: (v) => v instanceof Date && !isNaN(v.getTime()),
    toDrizzle: (col) => `timestamp('${col}')`,
    toPrisma: (col) => `${col} DateTime`,
    toSQL: (col) => `${col} TIMESTAMP`,
    toConvex: (col) => `${col}: v.number()`, // Convex uses Unix timestamps
  }),

  /**
   * UUID type
   */
  uuid: (): DbColumnTypeWithModifiers<string> => withModifiers({
    typeName: 'uuid',
    serialize: (v) => String(v),
    deserialize: (v) => String(v),
    validate: (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
    toDrizzle: (col) => `uuid('${col}')`,
    toPrisma: (col) => `${col} String @db.Uuid`,
    toSQL: (col, dialect) => dialect === 'postgres' ? `${col} UUID` : `${col} VARCHAR(36)`,
    toConvex: (col) => `${col}: v.string()`,
  }),

  /**
   * ID type (auto-increment or UUID)
   */
  id: (type: 'auto' | 'uuid' | 'cuid' = 'auto'): DbColumnTypeWithModifiers<string | number> => {
    if (type === 'uuid') {
      const base = dbTypes.uuid()
      return base.primaryKey() as any
    }
    if (type === 'cuid') {
      return withModifiers({
        typeName: 'varchar',
        typeParams: [25],
        serialize: (v) => String(v),
        deserialize: (v) => String(v),
        validate: (v) => typeof v === 'string',
        toDrizzle: (col) => `varchar('${col}', { length: 25 })`,
        toPrisma: (col) => `${col} String @id @default(cuid())`,
        toSQL: (col) => `${col} VARCHAR(25)`,
        toConvex: (col) => `${col}: v.id('tableName')`,
      }).primaryKey() as any
    }
    // Auto-increment
    return withModifiers({
      typeName: 'serial',
      serialize: (v) => Number(v),
      deserialize: (v) => Number(v),
      validate: (v) => typeof v === 'number',
      toDrizzle: (col) => `serial('${col}')`,
      toPrisma: (col) => `${col} Int @id @default(autoincrement())`,
      toSQL: (col, dialect) => {
        if (dialect === 'postgres') return `${col} SERIAL`
        if (dialect === 'mysql') return `${col} INT AUTO_INCREMENT`
        return `${col} INTEGER PRIMARY KEY AUTOINCREMENT`
      },
      toConvex: (col) => `${col}: v.id('tableName')`,
    }).primaryKey() as any
  },

  /**
   * JSON type
   */
  json: <T = any>(): DbColumnTypeWithModifiers<T> => withModifiers({
    typeName: 'json',
    serialize: (v) => v, // Keep as-is for type safety
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
  array: <T>(elementType: DbColumnType<T>): DbColumnTypeWithModifiers<T[]> => withModifiers({
    typeName: 'array',
    typeParams: [elementType],
    serialize: (v) => v.map(elementType.serialize), // Return array, not JSON string
    deserialize: (v) => {
      const arr = typeof v === 'string' ? JSON.parse(v) : v
      return arr.map(elementType.deserialize)
    },
    validate: (v) => Array.isArray(v),
    toDrizzle: (col) => `json('${col}')`, // Store as JSON
    toPrisma: (col) => `${col} Json`,
    toSQL: (col, dialect = 'postgres') => dialect === 'postgres' ? `${col} JSONB` : `${col} JSON`,
    toConvex: (col) => `${col}: v.array(...)`, // Need specific type
  }),

  /**
   * Enum type
   */
  enum: <T extends readonly string[]>(values: T): DbColumnTypeWithModifiers<T[number]> => withModifiers({
    typeName: 'enum',
    typeParams: values,
    serialize: (v) => String(v),
    deserialize: (v) => String(v) as T[number],
    validate: (v) => values.includes(v as any),
    toDrizzle: (col) => `varchar('${col}', { enum: [${values.map(v => `'${v}'`).join(', ')}] })`,
    toPrisma: (col) => `${col} String`,
    toSQL: (col) => `${col} VARCHAR(255)`,
    toConvex: (col) => `${col}: v.union(${values.map(v => `v.literal('${v}')`).join(', ')})`,
  }),

  /**
   * Text type (unlimited length)
   */
  text: (): DbColumnTypeWithModifiers<string> => withModifiers({
    typeName: 'text',
    serialize: (v) => String(v),
    deserialize: (v) => String(v),
    validate: (v) => typeof v === 'string',
    toDrizzle: (col) => `text('${col}')`,
    toPrisma: (col) => `${col} String @db.Text`,
    toSQL: (col) => `${col} TEXT`,
    toConvex: (col) => `${col}: v.string()`,
  }),

  /**
   * Custom type builder
   */
  custom: <T>(config: Partial<DbColumnType<T>> & {typeName: string}): DbColumnTypeWithModifiers<T> => withModifiers({
    serialize: (v) => v,
    deserialize: (v) => v,
    ...config,
  } as DbColumnType<T>),
} as const
