import type { Entity } from '../entity'
import { ts } from '../tags'

/**
 * Options for generating query utilities
 */
export interface TanStackQueryUtilsOptions {
  /** Include query key factories */
  includeQueryKeys?: boolean
  /** Include serialization helpers */
  includeSerialization?: boolean
  /** Include optimistic update helpers */
  includeOptimisticHelpers?: boolean
  /** Include cache management utilities */
  includeCacheUtils?: boolean
}

/**
 * Generate query utilities for TanStack Query
 */
export function generateQueryUtils(
  entities: Entity<any>[],
  options: TanStackQueryUtilsOptions = {}
): string {
  const {
    includeQueryKeys = true,
    includeSerialization = true,
    includeOptimisticHelpers = true,
    includeCacheUtils = true,
  } = options

  return ts`
/**
 * Query utilities for TanStack Query
 * Auto-generated from entity definitions
 */

${includeSerialization ? generateSerializationHelpers() : ''}

${includeQueryKeys ? generateQueryKeyFactories(entities) : ''}

${includeOptimisticHelpers ? generateOptimisticUpdateHelpers() : ''}

${includeCacheUtils ? generateCacheManagementUtils() : ''}
`
}

/**
 * Generate serialization helpers for query parameters
 */
function generateSerializationHelpers(): string {
  return ts`
/**
 * Serialization Helpers
 */

/** Serialize filter object to URL search params */
export function serializeFilters(filters?: Record<string, any>): Record<string, string> {
  if (!filters) return {}

  const serialized: Record<string, string> = {}

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue

    if (typeof value === 'object' && !Array.isArray(value)) {
      // Handle nested objects (e.g., { age: { $gt: 18 } })
      serialized[key] = JSON.stringify(value)
    } else if (Array.isArray(value)) {
      // Handle arrays
      serialized[key] = value.join(',')
    } else {
      // Handle primitives
      serialized[key] = String(value)
    }
  }

  return serialized
}

/** Serialize pagination params */
export function serializePagination(page?: number, limit?: number): Record<string, string> {
  const params: Record<string, string> = {}
  if (page !== undefined) params.page = String(page)
  if (limit !== undefined) params.limit = String(limit)
  return params
}

/** Serialize sorting params */
export function serializeSorting(sortBy?: string, sortOrder?: 'asc' | 'desc'): Record<string, string> {
  const params: Record<string, string> = {}
  if (sortBy) params.sortBy = sortBy
  if (sortOrder) params.sortOrder = sortOrder
  return params
}

/** Serialize all query params */
export function serializeQueryParams(params?: {
  page?: number
  limit?: number
  filters?: Record<string, any>
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}): Record<string, string> {
  if (!params) return {}

  return {
    ...serializePagination(params.page, params.limit),
    ...serializeFilters(params.filters),
    ...serializeSorting(params.sortBy, params.sortOrder),
  }
}
`
}

/**
 * Generate query key factories for all entities
 */
function generateQueryKeyFactories(entities: Entity<any>[]): string {
  const factories = entities.map((entity) => {
    const tableName = entity.db.table.name
    const entityName = entity.name.singular.toLowerCase()

    return `
export const ${entityName}Keys = {
  all: ['${tableName}'] as const,
  lists: () => [...${entityName}Keys.all, 'list'] as const,
  list: (filters?: any) => [...${entityName}Keys.lists(), filters] as const,
  details: () => [...${entityName}Keys.all, 'detail'] as const,
  detail: (id: string) => [...${entityName}Keys.details(), id] as const,
  infinite: (filters?: any) => [...${entityName}Keys.all, 'infinite', filters] as const,
  related: (id: string, relation: string) => [...${entityName}Keys.detail(id), relation] as const,
}`
  })

  return ts`
/**
 * Query Key Factories
 *
 * Standardized query keys for all entities following TanStack Query best practices
 * @see https://tkdodo.eu/blog/effective-react-query-keys
 */

${factories.join('\n')}

/** Get all query keys for an entity */
export function getEntityKeys(entityName: string) {
  const keys = {
    all: [entityName] as const,
    lists: () => [...keys.all, 'list'] as const,
    list: (filters?: any) => [...keys.lists(), filters] as const,
    details: () => [...keys.all, 'detail'] as const,
    detail: (id: string) => [...keys.details(), id] as const,
    infinite: (filters?: any) => [...keys.all, 'infinite', filters] as const,
    related: (id: string, relation: string) => [...keys.detail(id), relation] as const,
  }
  return keys
}
`
}

/**
 * Generate optimistic update helpers
 */
function generateOptimisticUpdateHelpers(): string {
  return ts`
/**
 * Optimistic Update Helpers
 */

/** Helper to create optimistic item with temporary ID */
export function createOptimisticItem<T extends Record<string, any>>(
  data: Partial<T>,
  tempIdPrefix = 'temp-'
): T {
  return {
    ...data,
    id: \`\${tempIdPrefix}\${Date.now()}\`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as T
}

/** Helper to update item in list optimistically */
export function updateItemInList<T extends { id: string }>(
  list: T[] | undefined,
  id: string,
  updates: Partial<T>
): T[] {
  if (!list) return []
  return list.map((item) => (item.id === id ? { ...item, ...updates } : item))
}

/** Helper to remove item from list optimistically */
export function removeItemFromList<T extends { id: string }>(
  list: T[] | undefined,
  id: string
): T[] {
  if (!list) return []
  return list.filter((item) => item.id !== id)
}

/** Helper to add item to list optimistically */
export function addItemToList<T>(
  list: T[] | undefined,
  item: T,
  position: 'start' | 'end' = 'end'
): T[] {
  if (!list) return [item]
  return position === 'start' ? [item, ...list] : [...list, item]
}

/** Check if an item is optimistic (has temporary ID) */
export function isOptimistic(id: string, tempIdPrefix = 'temp-'): boolean {
  return id.startsWith(tempIdPrefix)
}
`
}

/**
 * Generate cache management utilities
 */
function generateCacheManagementUtils(): string {
  return ts`
/**
 * Cache Management Utilities
 */

import { QueryClient } from '@tanstack/react-query'

/** Invalidate all queries for an entity */
export function invalidateEntity(
  queryClient: QueryClient,
  entityName: string
): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: [entityName] })
}

/** Invalidate list queries for an entity */
export function invalidateEntityLists(
  queryClient: QueryClient,
  entityName: string
): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: [entityName, 'list'] })
}

/** Invalidate a specific entity detail */
export function invalidateEntityDetail(
  queryClient: QueryClient,
  entityName: string,
  id: string
): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: [entityName, 'detail', id] })
}

/** Clear all cache for an entity */
export function clearEntityCache(
  queryClient: QueryClient,
  entityName: string
): void {
  queryClient.removeQueries({ queryKey: [entityName] })
}

/** Prefetch entity list */
export function prefetchEntityList(
  queryClient: QueryClient,
  entityName: string,
  fetcher: () => Promise<any>,
  filters?: any
): Promise<void> {
  return queryClient.prefetchQuery({
    queryKey: [entityName, 'list', filters],
    queryFn: fetcher,
  })
}

/** Prefetch entity detail */
export function prefetchEntityDetail(
  queryClient: QueryClient,
  entityName: string,
  id: string,
  fetcher: () => Promise<any>
): Promise<void> {
  return queryClient.prefetchQuery({
    queryKey: [entityName, 'detail', id],
    queryFn: fetcher,
  })
}

/** Set entity list data in cache */
export function setEntityListData<T>(
  queryClient: QueryClient,
  entityName: string,
  data: T[],
  filters?: any
): void {
  queryClient.setQueryData([entityName, 'list', filters], {
    items: data,
    pagination: { page: 1, limit: data.length, hasMore: false },
  })
}

/** Set entity detail data in cache */
export function setEntityDetailData<T>(
  queryClient: QueryClient,
  entityName: string,
  id: string,
  data: T
): void {
  queryClient.setQueryData([entityName, 'detail', id], data)
}

/** Get entity list data from cache */
export function getEntityListData<T>(
  queryClient: QueryClient,
  entityName: string,
  filters?: any
): T[] | undefined {
  const data = queryClient.getQueryData<{ items: T[] }>([entityName, 'list', filters])
  return data?.items
}

/** Get entity detail data from cache */
export function getEntityDetailData<T>(
  queryClient: QueryClient,
  entityName: string,
  id: string
): T | undefined {
  return queryClient.getQueryData([entityName, 'detail', id])
}

/** Optimistically update entity in both list and detail caches */
export function optimisticallyUpdateEntity<T extends { id: string }>(
  queryClient: QueryClient,
  entityName: string,
  id: string,
  updates: Partial<T>
): { previousList: any; previousDetail: any } {
  // Save previous state
  const previousList = queryClient.getQueryData([entityName, 'list'])
  const previousDetail = queryClient.getQueryData([entityName, 'detail', id])

  // Update detail cache
  queryClient.setQueryData([entityName, 'detail', id], (old: any) => ({
    ...old,
    ...updates,
  }))

  // Update list cache
  queryClient.setQueriesData(
    { queryKey: [entityName, 'list'] },
    (old: any) => {
      if (!old?.items) return old
      return {
        ...old,
        items: old.items.map((item: T) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      }
    }
  )

  return { previousList, previousDetail }
}

/** Rollback optimistic update */
export function rollbackOptimisticUpdate(
  queryClient: QueryClient,
  entityName: string,
  id: string,
  context: { previousList: any; previousDetail: any }
): void {
  if (context.previousList) {
    queryClient.setQueryData([entityName, 'list'], context.previousList)
  }
  if (context.previousDetail) {
    queryClient.setQueryData([entityName, 'detail', id], context.previousDetail)
  }
}
`
}
