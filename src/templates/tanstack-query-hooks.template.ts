import type { Entity } from '../entity'
import type { BackendAdapter } from '../adapters/backend-adapter'
import { ts } from '../tags'

/**
 * Options for generating query hooks
 */
export interface TanStackQueryHooksOptions {
  /** Backend adapter to use */
  adapter: BackendAdapter
  /** Include list query hook */
  includeList?: boolean
  /** Include detail query hook */
  includeDetail?: boolean
  /** Include infinite query hook */
  includeInfinite?: boolean
  /** Include create mutation hook */
  includeCreate?: boolean
  /** Include update mutation hook */
  includeUpdate?: boolean
  /** Include delete mutation hook */
  includeDelete?: boolean
  /** Include optimistic updates */
  includeOptimisticUpdates?: boolean
  /** Include permission checks */
  includePermissions?: boolean
  /** Include relationship queries */
  includeRelationships?: boolean
}

/**
 * Generate all query hooks for an entity
 */
export function generateTanStackQueryHooks<T>(
  entity: Entity<T>,
  options: TanStackQueryHooksOptions
): string {
  const {
    adapter,
    includeList = true,
    includeDetail = true,
    includeInfinite = true,
    includeCreate = true,
    includeUpdate = true,
    includeDelete = true,
    includeOptimisticUpdates = true,
    includePermissions = false,
    includeRelationships = false,
  } = options

  const entityName = entity.name.singular
  const pluralName = entity.name.plural
  const tableName = entity.db.table.name

  return ts`
/**
 * TanStack Query hooks for ${entityName}
 * Auto-generated from entity definition
 */

import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
${adapter.name === 'convex' ? "import { useQuery as useConvexQuery, useMutation as useConvexMutation, usePaginatedQuery } from 'convex/react'" : ''}
${adapter.name === 'convex' ? "import { api } from '../convex/_generated/api'" : ''}
${adapter.name === 'convex' ? "import type { Id } from '../convex/_generated/dataModel'" : ''}
${includePermissions ? "import { usePermissions } from '@/hooks/usePermissions'" : ''}

/**
 * Type Definitions
 */

export interface ${entityName} {
  id: string
  ${generateFieldTypes(entity)}
  createdAt?: string
  updatedAt?: string
}

export interface ${entityName}ListResponse {
  items: ${entityName}[]
  pagination: {
    page: number
    limit: number
    total?: number
    hasMore: boolean
  }
}

/**
 * Query Hooks
 */

${includeList ? adapter.generateQueryHook(entity, 'list', {
  includeFilters: true,
  includePagination: true,
  includeSorting: true,
}) : ''}

${includeDetail ? adapter.generateQueryHook(entity, 'get', {
  enabledByDefault: true,
}) : ''}

${includeInfinite ? adapter.generateQueryHook(entity, 'infinite', {
  includeFilters: true,
  includeSorting: true,
}) : ''}

/**
 * Mutation Hooks
 */

${includeCreate ? adapter.generateMutationHook(entity, 'create', {
  includeOptimisticUpdates,
  includeInvalidation: true,
}) : ''}

${includeUpdate ? adapter.generateMutationHook(entity, 'update', {
  includeOptimisticUpdates,
  includeInvalidation: true,
}) : ''}

${includeDelete ? adapter.generateMutationHook(entity, 'delete', {
  includeOptimisticUpdates,
  includeInvalidation: true,
}) : ''}

${includeRelationships ? generateRelationshipHooks(entity, adapter) : ''}

${includePermissions ? generatePermissionHooks(entity) : ''}

/**
 * Query Keys
 */

${adapter.generateQueryKeys(entity)}
`
}

/**
 * Generate TypeScript field types from entity
 */
function generateFieldTypes<T>(entity: Entity<T>): string {
  const fields: string[] = []

  for (const [fieldName, fieldConfig] of Object.entries(entity.fields)) {
    if (fieldName === 'id' || fieldName === 'createdAt' || fieldName === 'updatedAt') {
      continue // Already defined
    }

    const column = entity.db.columns.get(fieldName)
    if (!column) continue

    const tsType = mapDbTypeToTsType(column.type)
    const optional = !column.required ? '?' : ''

    fields.push(`${fieldName}${optional}: ${tsType}`)
  }

  return fields.join('\n  ')
}

/**
 * Map database column type to TypeScript type
 */
function mapDbTypeToTsType(dbType: any): string {
  const typeName = dbType.name || dbType.constructor.name.toLowerCase()

  if (typeName.includes('string') || typeName.includes('text')) return 'string'
  if (typeName.includes('number') || typeName.includes('int') || typeName.includes('float')) return 'number'
  if (typeName.includes('boolean') || typeName.includes('bool')) return 'boolean'
  if (typeName.includes('date') || typeName.includes('time')) return 'string'
  if (typeName.includes('json')) return 'any'
  if (typeName.includes('array')) return 'any[]'

  return 'any'
}

/**
 * Generate relationship query hooks
 */
function generateRelationshipHooks<T>(
  entity: Entity<T>,
  adapter: BackendAdapter
): string {
  if (!entity.relationships || entity.relationships.length === 0) {
    return ''
  }

  const entityName = entity.name.singular
  const hooks: string[] = []

  for (const rel of entity.relationships) {
    const relatedEntityName = rel.foreignEntity
    const relationName = rel.name || relatedEntityName

    if (rel.type === 'one-to-many' || rel.type === 'many-to-many') {
      hooks.push(`
/**
 * Query hook for ${entityName} ${relationName}
 */
export function use${entityName}${capitalize(relationName)}(
  id: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['${entity.db.table.name}', 'detail', id, '${relationName}'],
    queryFn: async () => {
      const response = await fetch(\`/api/${entity.db.table.name}/\${id}/${relationName}\`)
      if (!response.ok) throw new Error('Failed to fetch ${relationName}')
      return response.json()
    },
    enabled: !!id && (options?.enabled ?? true),
  })
}
`)
    }
  }

  return hooks.join('\n')
}

/**
 * Generate permission-aware hooks
 */
function generatePermissionHooks<T>(entity: Entity<T>): string {
  const entityName = entity.name.singular
  const tableName = entity.db.table.name

  return ts`
/**
 * Permission-aware hooks
 */

export function use${entityName}WithPermissions(id: string) {
  const query = use${entityName}(id)
  const { canRead, canUpdate, canDelete } = usePermissions({
    entity: '${tableName}',
    action: 'read',
  })

  return {
    ...query,
    canRead,
    canUpdate: canUpdate(),
    canDelete: canDelete(),
  }
}

export function use${entityName}ListWithPermissions(options?: any) {
  const query = use${entity.name.plural}(options)
  const { canCreate, canRead } = usePermissions({
    entity: '${tableName}',
    action: 'read',
  })

  return {
    ...query,
    canCreate: canCreate(),
    canRead,
  }
}
`
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Generate hooks for bulk operations
 */
export function generateBulkOperationHooks<T>(
  entity: Entity<T>,
  adapter: BackendAdapter
): string {
  const entityName = entity.name.singular
  const pluralName = entity.name.plural
  const tableName = entity.db.table.name

  return ts`
/**
 * Bulk Operation Hooks
 */

export interface BulkCreate${entityName}Input {
  items: Partial<${entityName}>[]
}

export function useBulkCreate${pluralName}() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: BulkCreate${entityName}Input) => {
      const response = await fetch('/api/${tableName}/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })

      if (!response.ok) {
        throw new Error('Failed to create ${pluralName}')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${tableName}', 'list'] })
    },
  })
}

export interface BulkUpdate${entityName}Input {
  ids: string[]
  data: Partial<${entityName}>
}

export function useBulkUpdate${pluralName}() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: BulkUpdate${entityName}Input) => {
      const response = await fetch('/api/${tableName}/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })

      if (!response.ok) {
        throw new Error('Failed to update ${pluralName}')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${tableName}'] })
    },
  })
}

export function useBulkDelete${pluralName}() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch('/api/${tableName}/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      })

      if (!response.ok) {
        throw new Error('Failed to delete ${pluralName}')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${tableName}'] })
    },
  })
}
`
}

/**
 * Generate prefetch helpers
 */
export function generatePrefetchHelpers<T>(
  entity: Entity<T>,
  adapter: BackendAdapter
): string {
  const entityName = entity.name.singular
  const pluralName = entity.name.plural
  const tableName = entity.db.table.name

  return ts`
/**
 * Prefetch Helpers
 */

import { QueryClient } from '@tanstack/react-query'

export async function prefetch${pluralName}(
  queryClient: QueryClient,
  options?: any
) {
  await queryClient.prefetchQuery({
    queryKey: ['${tableName}', 'list', options],
    queryFn: async () => {
      const response = await fetch('/api/${tableName}')
      return response.json()
    },
  })
}

export async function prefetch${entityName}(
  queryClient: QueryClient,
  id: string
) {
  await queryClient.prefetchQuery({
    queryKey: ['${tableName}', 'detail', id],
    queryFn: async () => {
      const response = await fetch(\`/api/${tableName}/\${id}\`)
      return response.json()
    },
  })
}
`
}
