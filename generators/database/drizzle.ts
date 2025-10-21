/**
 * Drizzle Database Generator
 * Generates Drizzle ORM schemas from entity definitions
 */

import type { Entity } from '../../src/entity'
import type { DbColumn } from '../../src/database'
import type { GeneratedDatabaseCode } from '../../src/generator-interfaces'

/**
 * Drizzle Database Generator
 */
export class DrizzleGenerator {
  /**
   * Generate Drizzle schema for an entity
   */
  static generate<T>(entity: Entity<T>): string {
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
})${comment ? `, { comment: '${comment}' }` : ''})`
  }

  /**
   * Generate Drizzle schema for multiple entities
   */
  static generateMultiple<T>(entities: Entity<T>[]): string[] {
    return entities.map(entity => this.generate(entity))
  }

  /**
   * Generate complete database code for an entity
   */
  static generateDatabaseCode<T>(entity: Entity<T>): GeneratedDatabaseCode {
    return {
      drizzle: this.generate(entity),
      prisma: '// Prisma schema - not supported by this generator',
      sql: '// SQL schema - not supported by this generator',
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
  static generateMultipleDatabaseCode<T>(entities: Entity<T>[]): GeneratedDatabaseCode[] {
    return entities.map(entity => this.generateDatabaseCode(entity))
  }
}