/**
 * Database Code Generator
 * Generate database schemas for Drizzle, Prisma, SQL, Convex with relationships and migrations
 */

import type { Entity, RelationshipMapping } from '../entity'
import type { DbColumn, DbSchema, DbRelationship, DbIndex, DbConstraint } from '../database'

/**
 * Generated database code
 */
export interface GeneratedDatabaseCode {
  drizzle: string
  prisma: string
  sql: string
  convex: string
  migrations: string[]
  relationships: string[]
  indexes: string[]
  constraints: string[]
}

/**
 * Migration configuration
 */
export interface MigrationConfig {
  up: string[]
  down: string[]
  version: string
  description: string
}

/**
 * Database Code Generator
 */
export class DatabaseGenerator {
  /**
   * Generate all database schemas for an entity
   */
  static generate<T>(entity: Entity<T>): GeneratedDatabaseCode {
    const tableName = entity.db.table.name
    const columns = entity.db.columns

    // Generate Drizzle schema
    const drizzle = this.generateDrizzleSchema(entity)

    // Generate Prisma schema
    const prisma = this.generatePrismaSchema(entity)

    // Generate SQL
    const sql = this.generateSQLSchema(entity)

    // Generate Convex schema
    const convex = this.generateConvexSchema(entity)

    // Generate relationships
    const relationships = this.generateRelationships(entity)

    // Generate indexes
    const indexes = this.generateIndexes(entity)

    // Generate constraints
    const constraints = this.generateConstraints(entity)

    // Generate migrations
    const migrations = this.generateMigrations(entity)

    return {
      drizzle,
      prisma,
      sql,
      convex,
      migrations,
      relationships,
      indexes,
      constraints
    }
  }

  /**
   * Generate Drizzle schema with full features
   */
  private static generateDrizzleSchema<T>(entity: Entity<T>): string {
    const tableName = entity.db.table.name
    const columns = entity.db.columns

    const columnDefs = Object.entries(columns).map(([name, col]: [string, DbColumn]) => {
      const dbCol = col as DbColumn
      let colDef = dbCol.type.toDrizzle?.(name) || `text('${name}')`

      // Add modifiers
      if (dbCol.nullable) colDef += '.nullable()'
      if (dbCol.unique) colDef += '.unique()'
      if (dbCol.primary) colDef += '.primaryKey()'
      if (dbCol.default !== undefined) {
        const defaultVal = typeof dbCol.default === 'function' ? 'sql`DEFAULT ${sql.placeholder()}`' : JSON.stringify(dbCol.default)
        colDef += `.default(${defaultVal})`
      }
      if (dbCol.autoIncrement) colDef += '.generatedAlwaysAsIdentity()'

      return `  ${name}: ${colDef},`
    }).join('\n')

    // Add indexes
    const indexDefs = entity.db.indexes?.map(index => {
      const unique = index.unique ? 'unique' : ''
      const columns = index.columns.map(col => `'${col}'`).join(', ')
      return `  ${index.name}: index('${index.name}').on(${columns})${unique ? '.unique()' : ''},`
    }).join('\n') || ''

    const hasIndexes = entity.db.indexes?.length
    const comment = entity.db.table.comment

    return `import { pgTable, varchar, integer, boolean, timestamp, uuid, index, uniqueIndex } from 'drizzle-orm/pg-core'${hasIndexes ? '\nimport { sql } from \'drizzle-orm\'' : ''}

export const ${tableName} = pgTable('${tableName}', {
${columnDefs}${indexDefs ? '\n' + indexDefs : ''}
}${comment ? `, { comment: '${comment}' }` : ''})`
  }

  /**
   * Generate Prisma schema with full features
   */
  private static generatePrismaSchema<T>(entity: Entity<T>): string {
    const columns = entity.db.columns

    const columnDefs = Object.entries(columns).map(([name, col]: [string, DbColumn]) => {
      const dbCol = col as DbColumn
      let colDef = dbCol.type.toPrisma?.(name) || `${name} String`

      // Add modifiers
      if (dbCol.nullable) colDef += '?'
      if (dbCol.unique) colDef += ' @unique'
      if (dbCol.primary) colDef += ' @id'
      if (dbCol.default !== undefined) {
        const defaultVal = typeof dbCol.default === 'function' ? 'autoincrement()' : JSON.stringify(dbCol.default)
        colDef += ` @default(${defaultVal})`
      }
      if (dbCol.comment) colDef += ` @map("${name}")`

      return `  ${colDef}`
    }).join('\n')

    // Add indexes
    const indexDefs = entity.db.indexes?.map(index => {
      const unique = index.unique ? 'unique' : ''
      const columns = index.columns.map(col => `"${col}"`).join(', ')
      return `  @@${unique}index([${columns}])`
    }).join('\n') || ''

    const comment = entity.db.table.comment

    return `model ${entity.name.singular} {
${columnDefs}${indexDefs ? '\n' + indexDefs : ''}
}${comment ? `\n/// ${comment}` : ''}`
  }

  /**
   * Generate SQL schema with full features
   */
  private static generateSQLSchema<T>(entity: Entity<T>): string {
    const tableName = entity.db.table.name
    const columns = entity.db.columns

    const columnDefs = Object.entries(columns).map(([name, col]: [string, DbColumn]) => {
      const dbCol = col as DbColumn
      let colDef = dbCol.type.toSQL?.(name, 'postgres') || `${name} TEXT`

      // Add modifiers
      if (dbCol.nullable) colDef += ' NULL'
      else colDef += ' NOT NULL'

      if (dbCol.unique) colDef += ' UNIQUE'
      if (dbCol.default !== undefined) {
        const defaultVal = typeof dbCol.default === 'function' ? 'DEFAULT nextval(...)' : `DEFAULT ${JSON.stringify(dbCol.default)}`
        colDef += ` ${defaultVal}`
      }
      if (dbCol.comment) colDef += ` COMMENT '${dbCol.comment}'`

      return `  ${colDef},`
    }).join('\n')

    // Primary key
    const pkDef = `  PRIMARY KEY (${entity.db.table.primaryKey.join(', ')}),`

    // Unique constraints
    const uniqueDefs = entity.db.table.uniqueConstraints?.map(constraint =>
      `  UNIQUE (${constraint.join(', ')}),`
    ).join('\n') || ''

    // Check constraints
    const checkDefs = entity.db.table.checkConstraints?.map(constraint =>
      `  CONSTRAINT ${constraint.name} CHECK (${constraint.expression}),`
    ).join('\n') || ''

    const comment = entity.db.table.comment

    return `CREATE TABLE ${tableName} (
${columnDefs}
${pkDef}${uniqueDefs ? '\n' + uniqueDefs : ''}${checkDefs ? '\n' + checkDefs : ''}
)${comment ? ` COMMENT '${comment}'` : ''};`
  }

  /**
   * Generate Convex schema with full features
   */
  private static generateConvexSchema<T>(entity: Entity<T>): string {
    const tableName = entity.db.table.name
    const columns = entity.db.columns

    const columnDefs = Object.entries(columns).map(([name, col]: [string, DbColumn]) => {
      const dbCol = col as DbColumn
      let colDef = dbCol.type.toConvex?.(name) || `${name}: v.string()`

      // Add modifiers
      if (dbCol.nullable) colDef += '.optional()'
      if (dbCol.unique) colDef += '.unique()'
      if (dbCol.default !== undefined) {
        const defaultVal = typeof dbCol.default === 'function' ? 'v.id()' : JSON.stringify(dbCol.default)
        colDef += `.default(${defaultVal})`
      }

      return `  ${colDef},`
    }).join('\n')

    const comment = entity.db.table.comment

    return `import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const ${tableName} = defineTable({
${columnDefs}
})${comment ? ` // ${comment}` : ''}`
  }

  /**
   * Generate relationships code
   */
  private static generateRelationships<T>(entity: Entity<T>): string[] {
    if (!entity.relationships) return []

    return entity.relationships.map(rel => {
      const relType = rel.relationType
      const localTable = typeof rel.localEntity === 'string' ? rel.localEntity : rel.localEntity.db.table.name
      const foreignTable = typeof rel.foreignEntity === 'string' ? rel.foreignEntity : rel.foreignEntity.db.table.name

      const fk = rel.db.foreignKey

      switch (relType) {
         case 'one-to-one':
           return `
 -- One-to-one relationship: ${localTable} -> ${foreignTable}
 ALTER TABLE ${localTable} ADD CONSTRAINT fk_${localTable}_${foreignTable}
   FOREIGN KEY (${fk.localColumn}) REFERENCES ${foreignTable}(${fk.foreignColumn})
   ON DELETE ${String(fk.onDelete).toUpperCase()} ON UPDATE ${String(fk.onUpdate).toUpperCase()};
 ${fk.indexed ? `CREATE UNIQUE INDEX idx_${localTable}_${fk.localColumn} ON ${localTable}(${fk.localColumn});` : ''}
 `.trim()

         case 'one-to-many':
           return `
 -- One-to-many relationship: ${localTable} -> ${foreignTable}
 ALTER TABLE ${localTable} ADD CONSTRAINT fk_${localTable}_${foreignTable}
   FOREIGN KEY (${fk.localColumn}) REFERENCES ${foreignTable}(${fk.foreignColumn})
   ON DELETE ${String(fk.onDelete).toUpperCase()} ON UPDATE ${String(fk.onUpdate).toUpperCase()};
 ${fk.indexed ? `CREATE INDEX idx_${localTable}_${fk.localColumn} ON ${localTable}(${fk.localColumn});` : ''}
 `.trim()

         case 'many-to-one':
           return `
 -- Many-to-one relationship: ${localTable} -> ${foreignTable}
 ALTER TABLE ${localTable} ADD CONSTRAINT fk_${localTable}_${foreignTable}
   FOREIGN KEY (${fk.localColumn}) REFERENCES ${foreignTable}(${fk.foreignColumn})
   ON DELETE ${String(fk.onDelete).toUpperCase()} ON UPDATE ${String(fk.onUpdate).toUpperCase()};
 ${fk.indexed ? `CREATE INDEX idx_${localTable}_${fk.localColumn} ON ${localTable}(${fk.localColumn});` : ''}
 `.trim()

        case 'many-to-many':
          if (!rel.db.junctionTable) return '-- Many-to-many relationship requires junction table'
          const jt = rel.db.junctionTable
          return `
-- Many-to-many relationship: ${localTable} <-> ${foreignTable} via ${jt.name}
CREATE TABLE ${jt.name} (
  ${jt.localColumn} UUID NOT NULL REFERENCES ${localTable}(${fk.localColumn}) ON DELETE CASCADE,
  ${jt.foreignColumn} UUID NOT NULL REFERENCES ${foreignTable}(${fk.foreignColumn}) ON DELETE CASCADE,
  PRIMARY KEY (${jt.localColumn}, ${jt.foreignColumn})
);

-- Indexes for performance
CREATE INDEX idx_${jt.name}_${jt.localColumn} ON ${jt.name}(${jt.localColumn});
CREATE INDEX idx_${jt.name}_${jt.foreignColumn} ON ${jt.name}(${jt.foreignColumn});
`.trim()

        default:
          return `-- Unknown relationship type: ${relType}`
      }
    })
  }

  /**
   * Generate indexes
   */
  private static generateIndexes<T>(entity: Entity<T>): string[] {
    if (!entity.db.indexes) return []

    return entity.db.indexes.map(index => {
      const unique = index.unique ? 'UNIQUE ' : ''
      const where = index.where ? ` WHERE ${index.where}` : ''
      return `CREATE ${unique}INDEX ${index.name} ON ${entity.db.table.name} (${index.columns.join(', ')})${where};`
    })
  }

  /**
   * Generate constraints
   */
  private static generateConstraints<T>(entity: Entity<T>): string[] {
    if (!entity.db.constraints) return []

    return entity.db.constraints.map(constraint => {
      switch (constraint.type) {
        case 'check':
          return `ALTER TABLE ${constraint.tableName} ADD CONSTRAINT ${constraint.name} CHECK (${constraint.definition});`
        case 'foreign-key':
          return `ALTER TABLE ${constraint.tableName} ADD CONSTRAINT ${constraint.name} FOREIGN KEY ${constraint.definition};`
        case 'unique':
          return `ALTER TABLE ${constraint.tableName} ADD CONSTRAINT ${constraint.name} UNIQUE ${constraint.definition};`
        case 'primary-key':
          return `ALTER TABLE ${constraint.tableName} ADD CONSTRAINT ${constraint.name} PRIMARY KEY ${constraint.definition};`
        default:
          return `-- Unknown constraint type: ${constraint.type}`
      }
    })
  }

  /**
   * Generate migrations
   */
  private static generateMigrations<T>(entity: Entity<T>): string[] {
    const migrations: string[] = []

    // Create table migration
    const createTableMigration = `
-- Migration: Create ${entity.db.table.name} table
-- Version: ${entity.version}
-- Description: Create ${entity.name.singular} entity table

${this.generateSQLSchema(entity)}

-- Create indexes
${this.generateIndexes(entity).join('\n')}

-- Create constraints
${this.generateConstraints(entity).join('\n')}

-- Create relationships
${this.generateRelationships(entity).join('\n\n')}
`.trim()

    migrations.push(createTableMigration)

    return migrations
  }

  /**
   * Generate schema for a specific ORM
   */
  static generateSchema<T>(entity: Entity<T>, target: 'drizzle' | 'prisma' | 'sql' | 'convex'): string {
    const db = this.generate(entity)
    return db[target]
  }

  /**
   * Generate migration files
   */
  static generateMigrationFiles<T>(entities: Entity<T>[], version: string): MigrationConfig {
    const up: string[] = []
    const down: string[] = []

    for (const entity of entities) {
      const generated = this.generate(entity)
      up.push(...generated.migrations)
      down.push(`DROP TABLE IF EXISTS ${entity.db.table.name} CASCADE;`)
    }

    return {
      up,
      down,
      version,
      description: `Create tables for entities: ${entities.map(e => e.name.singular).join(', ')}`
    }
  }
}

/**
 * Schema Generator - Generate database schemas from DbSchema
 */
export class SchemaGenerator {
  /**
   * Convert DbSchema to Drizzle code
   */
  static toDrizzle(schema: DbSchema): string {
    const tableDefs = Array.from(schema.tables.entries()).map(([tableName, table]) => {
      const columnDefs = Array.from(table.columns.entries()).map(([colName, col]) => {
        let colDef = col.type.toDrizzle?.(colName) || `text('${colName}')`
        if (col.nullable) colDef += '.nullable()'
        if (col.unique) colDef += '.unique()'
        if (col.primary) colDef += '.primaryKey()'
        return `  ${colName}: ${colDef},`
      }).join('\n')

      return `export const ${tableName} = pgTable('${tableName}', {
${columnDefs}
})`
    }).join('\n\n')

    return `import { pgTable, varchar, integer, boolean, timestamp, uuid } from 'drizzle-orm/pg-core'

${tableDefs}`
  }

  /**
   * Convert DbSchema to Prisma code
   */
  static toPrisma(schema: DbSchema): string {
    const modelDefs = Array.from(schema.tables.entries()).map(([tableName, table]) => {
      const columnDefs = Array.from(table.columns.entries()).map(([colName, col]) => {
        let colDef = col.type.toPrisma?.(colName) || `${colName} String`
        if (col.nullable) colDef += '?'
        if (col.unique) colDef += ' @unique'
        if (col.primary) colDef += ' @id'
        return `  ${colDef}`
      }).join('\n')

      return `model ${tableName} {
${columnDefs}
}`
    }).join('\n\n')

    return modelDefs
  }

  /**
   * Convert DbSchema to raw SQL
   */
  static toSQL(schema: DbSchema, dialect: 'postgres' | 'mysql' | 'sqlite' = 'postgres'): string {
    const tableDefs = Array.from(schema.tables.entries()).map(([tableName, table]) => {
      const columnDefs = Array.from(table.columns.entries()).map(([colName, col]) => {
        let colDef = col.type.toSQL?.(colName, dialect) || `${colName} TEXT`
        if (col.nullable) colDef += ' NULL'
        else colDef += ' NOT NULL'
        if (col.unique) colDef += ' UNIQUE'
        return `  ${colDef},`
      }).join('\n')

      const pkDef = `  PRIMARY KEY (${table.primaryKey.join(', ')}),`

      return `CREATE TABLE ${tableName} (
${columnDefs}
${pkDef}
);`
    }).join('\n\n')

    return tableDefs
  }

  /**
   * Convert DbSchema to Convex code
   */
  static toConvex(schema: DbSchema): string {
    const tableDefs = Array.from(schema.tables.entries()).map(([tableName, table]) => {
      const columnDefs = Array.from(table.columns.entries()).map(([colName, col]) => {
        let colDef = col.type.toConvex?.(colName) || `${colName}: v.string()`
        if (col.nullable) colDef += '.optional()'
        return `  ${colDef},`
      }).join('\n')

      return `export const ${tableName} = defineTable({
${columnDefs}
})`
    }).join('\n\n')

    return `import { defineTable } from 'convex/server'
import { v } from 'convex/values'

${tableDefs}`
  }
}
