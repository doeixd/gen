/**
 * Convex Database Generator
 * Generates Convex schemas from entity definitions
 */

import type { Entity } from '../../src/entity'
import type { DbColumn } from '../../src/database'
import type { GeneratedDatabaseCode } from '../../src/generator-interfaces'

/**
 * Convex Database Generator
 */
export class ConvexGenerator {
  /**
   * Generate Convex schema for an entity
   */
  static generate<T>(entity: Entity<T>): string {
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
   * Generate Convex schema for multiple entities
   */
  static generateMultiple<T>(entities: Entity<T>[]): string[] {
    return entities.map(entity => this.generate(entity))
  }

  /**
   * Generate complete database code for an entity
   */
  static generateDatabaseCode<T>(entity: Entity<T>): GeneratedDatabaseCode {
    return {
      drizzle: '// Drizzle schema - not supported by this generator',
      prisma: '// Prisma schema - not supported by this generator',
      sql: '// SQL schema - not supported by this generator',
      convex: this.generate(entity),
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