/**
 * Convex Functions Template
 * Template for generating type-safe Convex functions (queries and mutations)
 */

import type { Entity } from '../entity'
import { getFieldNames } from '../utils'
import { ts, conditional, map } from '../tags'

export interface ConvexFunctionsTemplateOptions {
  entity: Entity<any>
}

export function generateConvexFunctions(options: ConvexFunctionsTemplateOptions): string {
  const { entity } = options
  const entityName = entity.name.singular
  const pluralName = entity.name.plural
  const tableName = entity.db.table.name
  const fields = getFieldNames(entity)

  return ts`
import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

// ===== QUERIES =====

/**
 * Get all ${pluralName}
 */
export const getAll${pluralName} = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("${tableName}").collect()
  },
})

/**
 * Get ${entityName} by ID
 */
export const get${entityName}ById = query({
  args: { id: v.id("${tableName}") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

/**
 * Search ${pluralName}
 */
export const search${pluralName} = query({
  args: {
    searchTerm: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { searchTerm, limit = 50, offset = 0 } = args

    let query = ctx.db.query("${tableName}")

    if (searchTerm) {
      // Simple text search - you may want to implement full-text search
      query = query.filter((q) =>
        ${fields.map(f => `q.field("${String(f)}").contains(searchTerm)`).join(' ||\n        ')}
      )
    }

    return await query.take(limit).drop(offset)
  },
})

/**
 * Get ${pluralName} count
 */
export const get${pluralName}Count = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("${tableName}").collect().then(items => items.length)
  },
})

// ===== MUTATIONS =====

/**
 * Create a new ${entityName}
 */
export const create${entityName} = mutation({
  args: {
${map(fields, (field) => {
  const fieldDef = entity.fields[field]
  const isOptional = fieldDef.optional
  const fieldType = fieldDef.jsType || 'string'

  let convexType: string
  switch (fieldType) {
    case 'string':
      convexType = 'v.string()'
      break
    case 'number':
      convexType = 'v.number()'
      break
    case 'boolean':
      convexType = 'v.boolean()'
      break
    default:
      convexType = 'v.any()'
  }

  return `    ${String(field)}: ${isOptional ? `v.optional(${convexType})` : convexType},`
})}
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("${tableName}", args)
    return { id, ...args }
  },
})

/**
 * Update an existing ${entityName}
 */
export const update${entityName} = mutation({
  args: {
    id: v.id("${tableName}"),
${map(fields, (field) => {
  const fieldDef = entity.fields[field]
  const fieldType = fieldDef.jsType || 'string'

  let convexType: string
  switch (fieldType) {
    case 'string':
      convexType = 'v.string()'
      break
    case 'number':
      convexType = 'v.number()'
      break
    case 'boolean':
      convexType = 'v.boolean()'
      break
    default:
      convexType = 'v.any()'
  }

  return `    ${String(field)}: v.optional(${convexType}),`
})}
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args

    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    )

    await ctx.db.patch(id, cleanUpdates)
    return await ctx.db.get(id)
  },
})

/**
 * Delete a ${entityName}
 */
export const delete${entityName} = mutation({
  args: { id: v.id("${tableName}") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error("${entityName} not found")
    }

    await ctx.db.delete(args.id)
    return { success: true, id: args.id }
  },
})

/**
 * Bulk delete ${pluralName}
 */
export const bulkDelete${pluralName} = mutation({
  args: { ids: v.array(v.id("${tableName}")) },
  handler: async (ctx, args) => {
    const results = []

    for (const id of args.ids) {
      try {
        await ctx.db.delete(id)
        results.push({ id, success: true })
      } catch (error) {
        results.push({ id, success: false, error: error.message })
      }
    }

    return results
  },
})

// ===== TYPE EXPORTS =====

export type ${entityName} = {
${map(fields, (field) => {
  const fieldDef = entity.fields[field]
  const isOptional = fieldDef.optional
  const fieldType = fieldDef.jsType || 'string'
  return `  ${String(field)}${isOptional ? '?' : ''}: ${fieldType}`
})}
}

export type Create${entityName}Args = {
${map(fields, (field) => {
  const fieldDef = entity.fields[field]
  const isOptional = fieldDef.optional
  const fieldType = fieldDef.jsType || 'string'
  return `  ${String(field)}${isOptional ? '?' : ''}: ${fieldType}`
})}
}

export type Update${entityName}Args = {
  id: string
${map(fields, (field) => {
  const fieldDef = entity.fields[field]
  const fieldType = fieldDef.jsType || 'string'
  return `  ${String(field)}?: ${fieldType}`)
})}
}
`
}
