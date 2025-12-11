import type { Entity } from '../entity'
import type {
  BackendAdapter,
  QueryHookOptions,
  MutationHookOptions,
} from './backend-adapter'
import { ts } from '../tags'

/**
 * Convex adapter for Convex serverless backend
 * Generates Convex-native query and mutation hooks
 */
export class ConvexAdapter implements BackendAdapter {
  name = 'convex' as const

  constructor(private config?: ConvexAdapterConfig) {}

  generateQueryHook<T>(
    entity: Entity<T>,
    operation: 'list' | 'get' | 'infinite',
    options?: QueryHookOptions
  ): string {
    const tableName = entity.db.table.name
    const entityName = entity.name.singular
    const pluralName = entity.name.plural

    const includeFilters = options?.includeFilters ?? true
    const includePagination = options?.includePagination ?? true
    const includeSorting = options?.includeSorting ?? true

    if (operation === 'list') {
      return ts`
export interface Use${pluralName}Options {
  ${includePagination ? 'page?: number\n  limit?: number' : ''}
  ${includeFilters ? `filters?: Partial<${entityName}>` : ''}
  ${includeSorting ? 'sortBy?: string\n  sortOrder?: \'asc\' | \'desc\'' : ''}
}

export function use${pluralName}(options?: Use${pluralName}Options) {
  return useQuery(
    api.${tableName}.list,
    options ? {
      ${includePagination ? 'page: options.page,\n      limit: options.limit,' : ''}
      ${includeFilters ? 'filters: options.filters,' : ''}
      ${includeSorting ? 'sortBy: options.sortBy,\n      sortOrder: options.sortOrder,' : ''}
    } : undefined
  )
}
`
    } else if (operation === 'get') {
      return ts`
export function use${entityName}(id: Id<"${tableName}"> | undefined) {
  return useQuery(
    api.${tableName}.get,
    id ? { id } : 'skip'
  )
}
`
    } else {
      // infinite query - Convex has built-in pagination
      return ts`
export interface UseInfinite${pluralName}Options {
  ${includeFilters ? `filters?: Partial<${entityName}>` : ''}
  ${includeSorting ? 'sortBy?: string\n  sortOrder?: \'asc\' | \'desc\'' : ''}
  limit?: number
}

export function useInfinite${pluralName}(options?: UseInfinite${pluralName}Options) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.${tableName}.listPaginated,
    options || {},
    { initialNumItems: options?.limit || 20 }
  )

  return {
    data: results,
    status,
    loadMore,
    hasNextPage: status === 'CanLoadMore',
    isFetchingNextPage: status === 'LoadingMore'
  }
}
`
    }
  }

  generateMutationHook<T>(
    entity: Entity<T>,
    operation: 'create' | 'update' | 'delete',
    options?: MutationHookOptions
  ): string {
    const tableName = entity.db.table.name
    const entityName = entity.name.singular

    if (operation === 'create') {
      return ts`
export function useCreate${entityName}() {
  const create = useMutation(api.${tableName}.create)

  return {
    mutate: create,
    mutateAsync: create,
    isPending: false, // Convex mutations are optimistic by default
  }
}
`
    } else if (operation === 'update') {
      return ts`
export interface Update${entityName}Input {
  id: Id<"${tableName}">
  data: Partial<${entityName}>
}

export function useUpdate${entityName}() {
  const update = useMutation(api.${tableName}.update)

  return {
    mutate: (input: Update${entityName}Input) => update({ id: input.id, ...input.data }),
    mutateAsync: async (input: Update${entityName}Input) => update({ id: input.id, ...input.data }),
    isPending: false,
  }
}
`
    } else {
      // delete
      return ts`
export function useDelete${entityName}() {
  const deleteItem = useMutation(api.${tableName}.remove)

  return {
    mutate: (id: Id<"${tableName}">) => deleteItem({ id }),
    mutateAsync: async (id: Id<"${tableName}">) => deleteItem({ id }),
    isPending: false,
  }
}
`
    }
  }

  generateAPICall<T>(entity: Entity<T>, operation: string): string {
    const tableName = entity.db.table.name

    return ts`
export const ${operation}Api = api.${tableName}.${operation}
`
  }

  generateOptimisticUpdate<T>(
    entity: Entity<T>,
    operation: 'create' | 'update' | 'delete'
  ): string {
    // Convex handles optimistic updates automatically
    return `// Convex handles optimistic updates automatically`
  }

  generateInvalidation<T>(
    entity: Entity<T>,
    operation: 'create' | 'update' | 'delete'
  ): string {
    // Convex automatically invalidates queries via reactivity
    return `// Convex automatically invalidates queries via reactivity`
  }

  generateQueryKeys<T>(entity: Entity<T>): string {
    const tableName = entity.db.table.name
    const entityName = entity.name.singular

    return ts`
// Convex queries are identified by their function references
export const ${entityName.toLowerCase()}Queries = {
  list: api.${tableName}.list,
  get: api.${tableName}.get,
  listPaginated: api.${tableName}.listPaginated,
} as const
`
  }

  /**
   * Generate Convex backend function definitions
   */
  generateConvexFunctions<T>(entity: Entity<T>): string {
    const tableName = entity.db.table.name
    const entityName = entity.name.singular

    return ts`
import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

// List all ${entityName} items
export const list = query({
  args: {
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    filters: v.optional(v.any()),
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("${tableName}")

    // Apply filters
    if (args.filters) {
      query = query.filter((q) => {
        const filters = Object.entries(args.filters || {})
        return filters.every(([key, value]) => q.eq(q.field(key as any), value))
      })
    }

    // Apply sorting
    if (args.sortBy) {
      query = query.order(args.sortOrder === "desc" ? "desc" : "asc")
    }

    // Apply pagination
    const limit = args.limit || 50
    const items = await query.take(limit)

    return {
      items,
      pagination: {
        page: args.page || 1,
        limit,
        hasMore: items.length === limit
      }
    }
  },
})

// Get single ${entityName} by ID
export const get = query({
  args: { id: v.id("${tableName}") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

// Paginated list query
export const listPaginated = query({
  args: {
    filters: v.optional(v.any()),
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("${tableName}")

    // Apply filters
    if (args.filters) {
      query = query.filter((q) => {
        const filters = Object.entries(args.filters || {})
        return filters.every(([key, value]) => q.eq(q.field(key as any), value))
      })
    }

    // Apply sorting
    if (args.sortBy) {
      query = query.order(args.sortOrder === "desc" ? "desc" : "asc")
    }

    return await query.paginate(args.paginationOpts)
  },
})

// Create new ${entityName}
export const create = mutation({
  args: {
    // Add your ${entityName} fields here
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("${tableName}", args)
    return await ctx.db.get(id)
  },
})

// Update existing ${entityName}
export const update = mutation({
  args: {
    id: v.id("${tableName}"),
    // Add your ${entityName} fields here
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args
    await ctx.db.patch(id, data)
    return await ctx.db.get(id)
  },
})

// Delete ${entityName}
export const remove = mutation({
  args: { id: v.id("${tableName}") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return { success: true }
  },
})
`
  }
}

/**
 * Configuration options for Convex adapter
 */
export interface ConvexAdapterConfig {
  /** Generate backend functions as well as frontend hooks */
  includeBackendFunctions?: boolean
  /** Use Convex's built-in pagination */
  usePagination?: boolean
  /** Include real-time subscriptions */
  includeSubscriptions?: boolean
}
