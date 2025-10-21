/**
 * Prisma Database Generator
 * Generates Prisma schemas from entity definitions
 */

import type { Entity } from '../../src/entity'
import type { DbColumn } from '../../src/database'
import type { GeneratedDatabaseCode } from '../../src/generator-interfaces'

/**
 * Prisma Database Generator
 */
export class PrismaGenerator {
  /**
   * Generate Prisma schema for an entity
   */
  static generate<T>(entity: Entity<T>): string {
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
   * Generate Prisma schema for multiple entities
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
      prisma: this.generate(entity),
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