/**
 * Schema Updater Utility
 *
 * Automatically updates Convex schema files to add required fields and indexes
 * - Adds 'id' field to tables that don't have one
 * - Adds 'idIndex' index for efficient lookups
 * - Adds search indexes for text fields
 * - Creates backups before modifications
 */

import { Result, ok, err } from 'neverthrow'
import { GeneratorError, GeneratorErrorCode } from './errors'
import { readSchemaFile } from './schema-parser'
import { writeFile, type FileOptions } from './file-system'
import { logger } from './logger'
import type { Entity } from '../entity'

export interface SchemaUpdateOptions {
  schemaPath: string
  createBackups: boolean
  dryRun: boolean
  addIdField: boolean
  addIdIndex: boolean
  addSearchIndexes: boolean
}

export interface SchemaUpdateResult {
  modified: boolean
  changes: string[]
  warnings: string[]
}

/**
 * Update schema to add 'id' field and 'idIndex' to each table
 */
export function updateConvexSchema(
  entities: Entity<any>[],
  options: SchemaUpdateOptions
): Result<SchemaUpdateResult, GeneratorError> {
  try {
    const { schemaPath, createBackups, dryRun, addIdField, addIdIndex, addSearchIndexes } = options

    // Read current schema
    const readResult = readSchemaFile(schemaPath)
    if (readResult.isErr()) {
      return err(readResult.error)
    }

    let schemaContent = readResult.value
    let modified = false
    const changes: string[] = []
    const warnings: string[] = []

    // Process each entity
    for (const entity of entities) {
      const tableName = entity.db.table.name

      // Check if table already has an id field
      if (addIdField) {
        const hasIdField = schemaContent.includes(`${tableName}:`) &&
          schemaContent.match(new RegExp(`${tableName}:\\s*defineTable\\(\\{[^}]*id:\\s*v\\.string\\(\\)`, 's'))

        if (!hasIdField) {
          logger.info(`Adding 'id' field to ${tableName}...`)

          // Add id field to the table definition
          const tableRegex = new RegExp(
            `(${tableName}:\\s*defineTable\\(\\{)([^}]+)(\\}\\))`,
            'gs'
          )

          schemaContent = schemaContent.replace(tableRegex, (_match, start, fields, end) => {
            // Add id field at the beginning
            changes.push(`Added 'id' field to ${tableName}`)
            return `${start}\n    id: v.string(),${fields}${end}`
          })

          modified = true
        }
      }

      // Check if table already has idIndex
      if (addIdIndex) {
        const hasIdIndex = schemaContent.includes(`${tableName}:`) &&
          schemaContent.includes(`.index('idIndex'`) &&
          schemaContent.match(new RegExp(`${tableName}:[^;]*\\.index\\('idIndex'`, 's'))

        if (!hasIdIndex) {
          logger.info(`Adding 'idIndex' index to ${tableName}...`)

          // Add index to the table - need to find the closing parenthesis and brace
          // Pattern: tablename: defineTable({ ... })
          const tableDefRegex = new RegExp(
            `(${tableName}:\\s*defineTable\\(\\{[^}]+\\}\\))(?!\\.index)`,
            'gs'
          )

          schemaContent = schemaContent.replace(
            tableDefRegex,
            `$1.index('idIndex', ['id'])`
          )

          changes.push(`Added 'idIndex' index to ${tableName}`)
          modified = true
        }
      }

      // Add search indexes for string fields
      if (addSearchIndexes) {
        const stringFields = Object.entries(entity.fields)
          .filter(([name, field]) => {
            const fieldConfig = field as any
            return fieldConfig.jsType === 'string' && name !== 'id'
          })

        for (const [fieldName] of stringFields) {
          const searchIndexName = `search_${fieldName}`
          const hasSearchIndex = schemaContent.includes(`${tableName}:`) &&
            schemaContent.includes(`.searchIndex('${searchIndexName}'`)

          if (!hasSearchIndex && fieldName !== 'id') {
            logger.info(`Adding search index '${searchIndexName}' to ${tableName}...`)

            // Add search index
            const tableDefRegex = new RegExp(
              `(${tableName}:[^;]+)(?=\\s*,|\\s*\\})`,
              'gs'
            )

            schemaContent = schemaContent.replace(
              tableDefRegex,
              (match) => {
                // Only add if not already present
                if (match.includes(`.searchIndex('${searchIndexName}'`)) {
                  return match
                }
                changes.push(`Added search index '${searchIndexName}' to ${tableName}`)
                return `${match}.searchIndex('${searchIndexName}', { searchField: '${fieldName}' })`
              }
            )

            modified = true
          }
        }
      }
    }

    // Write updated schema
    if (modified && !dryRun) {
      const writeOptions: FileOptions = {
        overwrite: true,
        backup: createBackups,
        dryRun,
      }

      const writeResult = writeFile(schemaPath, schemaContent, writeOptions)
      if (writeResult.isErr()) {
        return err(writeResult.error)
      }

      logger.success('Updated schema with required fields and indexes')
    } else if (modified && dryRun) {
      logger.info('DRY RUN: Would have updated schema with the following changes:')
      changes.forEach(change => logger.info(`  - ${change}`))
    } else {
      logger.info('Schema already up to date')
    }

    return ok({
      modified,
      changes,
      warnings,
    })
  } catch (error) {
    return err(
      new GeneratorError(
        GeneratorErrorCode.CODE_GENERATION_ERROR,
        `Failed to update schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error instanceof Error ? error : undefined
      )
    )
  }
}

/**
 * Generate field summary for logging
 */
export function generateFieldSummary(entity: Entity<any>): string {
  const fields = Object.entries(entity.fields)

  return fields.map(([name, field]) => {
    const fieldConfig = field as any
    let typeDesc = fieldConfig.jsType || 'unknown'

    if (field.optional) {
      typeDesc = `optional ${typeDesc}`
    }

    if (fieldConfig.isArray) {
      typeDesc = `array of ${typeDesc}`
    }

    const validators = fieldConfig.standardSchema ? ' [validated]' : ''
    const permissions = field.permissions ? ' [restricted]' : ''

    return `    - ${name}: ${typeDesc}${validators}${permissions}`
  }).join('\n')
}

/**
 * Validate schema structure before updating
 */
export function validateSchemaStructure(
  schemaContent: string,
  entities: Entity<any>[]
): Result<void, GeneratorError> {
  try {
    // Check if schema uses defineSchema
    if (!schemaContent.includes('defineSchema')) {
      return err(
        new GeneratorError(
          GeneratorErrorCode.SCHEMA_ERROR,
          'Schema file does not contain defineSchema',
          { schemaContent: schemaContent.substring(0, 100) }
        )
      )
    }

    // Check if schema uses defineTable
    if (!schemaContent.includes('defineTable')) {
      return err(
        new GeneratorError(
          GeneratorErrorCode.SCHEMA_ERROR,
          'Schema file does not contain any defineTable calls',
          { schemaContent: schemaContent.substring(0, 100) }
        )
      )
    }

    // Verify each entity has a corresponding table definition
    for (const entity of entities) {
      const tableName = entity.db.table.name
      const hasTableDef = new RegExp(`${tableName}:\\s*defineTable`, 's').test(schemaContent)

      if (!hasTableDef) {
        return err(
          new GeneratorError(
            GeneratorErrorCode.SCHEMA_ERROR,
            `Table '${tableName}' not found in schema`,
            { tableName, availableTables: extractTableNames(schemaContent) }
          )
        )
      }
    }

    return ok(undefined)
  } catch (error) {
    return err(
      new GeneratorError(
        GeneratorErrorCode.SCHEMA_ERROR,
        `Failed to validate schema structure: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error instanceof Error ? error : undefined
      )
    )
  }
}

/**
 * Extract table names from schema content
 */
function extractTableNames(schemaContent: string): string[] {
  const tableNameRegex = /(\w+):\s*defineTable/g
  const matches = schemaContent.matchAll(tableNameRegex)
  return Array.from(matches, match => match[1])
}

/**
 * Check if schema needs updates
 */
export function checkSchemaUpdatesNeeded(
  entities: Entity<any>[],
  schemaContent: string,
  options: Pick<SchemaUpdateOptions, 'addIdField' | 'addIdIndex' | 'addSearchIndexes'>
): { needed: boolean; updates: string[] } {
  const updates: string[] = []

  for (const entity of entities) {
    const tableName = entity.db.table.name

    // Check for id field
    if (options.addIdField) {
      const hasIdField = schemaContent.match(
        new RegExp(`${tableName}:\\s*defineTable\\(\\{[^}]*id:\\s*v\\.string\\(\\)`, 's')
      )
      if (!hasIdField) {
        updates.push(`${tableName}: needs 'id' field`)
      }
    }

    // Check for idIndex
    if (options.addIdIndex) {
      const hasIdIndex = schemaContent.match(
        new RegExp(`${tableName}:[^;]*\\.index\\('idIndex'`, 's')
      )
      if (!hasIdIndex) {
        updates.push(`${tableName}: needs 'idIndex' index`)
      }
    }

    // Check for search indexes
    if (options.addSearchIndexes) {
      const stringFields = Object.entries(entity.fields)
        .filter(([name, field]) => (field as any).jsType === 'string' && name !== 'id')

      for (const [fieldName] of stringFields) {
        const searchIndexName = `search_${fieldName}`
        const hasSearchIndex = schemaContent.includes(`.searchIndex('${searchIndexName}'`)

        if (!hasSearchIndex) {
          updates.push(`${tableName}: needs search index for '${fieldName}'`)
        }
      }
    }
  }

  return {
    needed: updates.length > 0,
    updates,
  }
}
