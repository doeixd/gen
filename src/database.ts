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
     toSQL: (col) => maxLength ? `${col} VARCHAR(${maxLength})` : `${col} TEXT`,
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
     toSQL: (col, dialect = 'postgres') => dialect === 'postgres' ? `${col} JSONB` : `${col} JSON`,
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
