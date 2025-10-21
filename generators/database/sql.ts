/**
 * SQL Database Generator
 * Generates raw SQL schemas from entity definitions
 */

import type { Entity } from '../../src/entity'
import type { DbColumn } from '../../src/database'
import type { GeneratedDatabaseCode } from '../../src/generator-interfaces'

/**
 * SQL Database Generator
 */
export class SQLGenerator {
  /**
   * Generate SQL schema for an entity
   */
  static generate<T>(entity: Entity<T>, dialect: 'postgres' | 'mysql' | 'sqlite' = 'postgres'): string {
    const tableName = entity.db.table.name
    const columns = entity.db.columns

    const columnDefs = Object.entries(columns).map(([name, col]: [string, DbColumn]) => {
      const dbCol = col as DbColumn
      let colDef = dbCol.type.toSQL?.(name, dialect) || `${name} TEXT`

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
   * Generate SQL schema for multiple entities
   */
  static generateMultiple<T>(entities: Entity<T>[], dialect: 'postgres' | 'mysql' | 'sqlite' = 'postgres'): string[] {
    return entities.map(entity => this.generate(entity, dialect))
  }

  /**
   * Generate complete database code for an entity
   */
  static generateDatabaseCode<T>(entity: Entity<T>, dialect: 'postgres' | 'mysql' | 'sqlite' = 'postgres'): GeneratedDatabaseCode {
    return {
      drizzle: '// Drizzle schema - not supported by this generator',
      prisma: '// Prisma schema - not supported by this generator',
      sql: this.generate(entity, dialect),
      convex: '// Convex schema - not supported by this generator',
      migrations: [],
      relationships: [],
      indexes: [],
      constraints: []
    }
  }

  /**
   * Generate complete database code for multiple entities
   */
  static generateMultipleDatabaseCode<T>(entities: Entity<T>[], dialect: 'postgres' | 'mysql' | 'sqlite' = 'postgres'): GeneratedDatabaseCode[] {
    return entities.map(entity => this.generateDatabaseCode(entity, dialect))
  }
}