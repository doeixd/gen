import type { Entity } from '../entity'
import type {
  BackendAdapter,
  QueryHookOptions,
  MutationHookOptions,
} from './backend-adapter'
import { ts } from '../tags'

/**
 * REST API adapter for standard REST endpoints (Express, Fastify, Hono, etc.)
 * Generates fetch-based query and mutation hooks for TanStack Query
 */
export class RESTAdapter implements BackendAdapter {
  name = 'rest' as const

  constructor(private config?: RESTAdapterConfig) {}

  generateQueryHook<T>(
    entity: Entity<T>,
    operation: 'list' | 'get' | 'infinite',
    options?: QueryHookOptions
  ): string {
    const tableName = entity.db.table.name
    const entityName = entity.name.singular
    const pluralName = entity.name.plural
    const baseEndpoint = this.config?.baseUrl
      ? `\${${this.config.baseUrl}}`
      : `/api/${tableName}`

    const includeFilters = options?.includeFilters ?? true
    const includePagination = options?.includePagination ?? true
    const includeSorting = options?.includeSorting ?? true
    const enabledByDefault = options?.enabledByDefault ?? true
    const staleTime = options?.staleTime ?? 0
    const cacheTime = options?.cacheTime ?? 300000 // 5 minutes

    if (operation === 'list') {
      return ts`
export interface Use${pluralName}Options {
  ${includePagination ? 'page?: number\n  limit?: number' : ''}
  ${includeFilters ? `filters?: Partial<${entityName}>` : ''}
  ${includeSorting ? 'sortBy?: string\n  sortOrder?: \'asc\' | \'desc\'' : ''}
  enabled?: boolean
  staleTime?: number
  cacheTime?: number
}

export function use${pluralName}(options?: Use${pluralName}Options) {
  return useQuery({
    queryKey: ['${tableName}', 'list', options],
    queryFn: async () => {
      const params = new URLSearchParams()
      ${includePagination ? `
      if (options?.page) params.append('page', String(options.page))
      if (options?.limit) params.append('limit', String(options.limit))
      ` : ''}
      ${includeFilters ? `
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value))
          }
        })
      }
      ` : ''}
      ${includeSorting ? `
      if (options?.sortBy) params.append('sortBy', options.sortBy)
      if (options?.sortOrder) params.append('sortOrder', options.sortOrder)
      ` : ''}

      const url = \`${baseEndpoint}?\${params.toString()}\`
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch ${pluralName}' }))
        throw new Error(error.message || 'Failed to fetch ${pluralName}')
      }

      return response.json()
    },
    enabled: options?.enabled ?? ${enabledByDefault},
    staleTime: options?.staleTime ?? ${staleTime},
    gcTime: options?.cacheTime ?? ${cacheTime}
  })
}
`
    } else if (operation === 'get') {
      return ts`
export interface Use${entityName}Options {
  enabled?: boolean
  staleTime?: number
  cacheTime?: number
}

export function use${entityName}(id: string, options?: Use${entityName}Options) {
  return useQuery({
    queryKey: ['${tableName}', 'detail', id],
    queryFn: async () => {
      const response = await fetch(\`${baseEndpoint}/\${id}\`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch ${entityName}' }))
        throw new Error(error.message || 'Failed to fetch ${entityName}')
      }

      return response.json()
    },
    enabled: !!id && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? ${staleTime},
    gcTime: options?.cacheTime ?? ${cacheTime}
  })
}
`
    } else {
      // infinite query
      return ts`
export interface UseInfinite${pluralName}Options {
  ${includeFilters ? `filters?: Partial<${entityName}>` : ''}
  ${includeSorting ? 'sortBy?: string\n  sortOrder?: \'asc\' | \'desc\'' : ''}
  limit?: number
  enabled?: boolean
}

export function useInfinite${pluralName}(options?: UseInfinite${pluralName}Options) {
  return useInfiniteQuery({
    queryKey: ['${tableName}', 'infinite', options],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: String(options?.limit || 20)
      })
      ${includeFilters ? `
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value))
          }
        })
      }
      ` : ''}
      ${includeSorting ? `
      if (options?.sortBy) params.append('sortBy', options.sortBy)
      if (options?.sortOrder) params.append('sortOrder', options.sortOrder)
      ` : ''}

      const url = \`${baseEndpoint}?\${params.toString()}\`
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch ${pluralName}' }))
        throw new Error(error.message || 'Failed to fetch ${pluralName}')
      }

      return response.json()
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.hasMore) {
        return lastPage.pagination.page + 1
      }
      return undefined
    },
    initialPageParam: 1,
    enabled: options?.enabled ?? true
  })
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
    const baseEndpoint = this.config?.baseUrl
      ? `\${${this.config.baseUrl}}`
      : `/api/${tableName}`

    const includeOptimistic = options?.includeOptimisticUpdates ?? true
    const includeInvalidation = options?.includeInvalidation ?? true

    if (operation === 'create') {
      return ts`
export function useCreate${entityName}() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<${entityName}>) => {
      const response = await fetch('${baseEndpoint}', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': crypto.randomUUID()
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create ${entityName}' }))
        throw new Error(error.message || 'Failed to create ${entityName}')
      }

      return response.json()
    },
    ${includeOptimistic ? this.generateOptimisticUpdate(entity, operation) : ''}
    ${includeInvalidation ? `onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${tableName}', 'list'] })
    },` : ''}
    ${options?.onSuccessTemplate || ''}
    ${options?.onErrorTemplate || ''}
    ${options?.retry ? `retry: ${options.retry.maxAttempts},` : ''}
  })
}
`
    } else if (operation === 'update') {
      return ts`
export interface Update${entityName}Input {
  id: string
  data: Partial<${entityName}>
}

export function useUpdate${entityName}() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: Update${entityName}Input) => {
      const response = await fetch(\`${baseEndpoint}/\${id}\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': crypto.randomUUID()
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update ${entityName}' }))
        throw new Error(error.message || 'Failed to update ${entityName}')
      }

      return response.json()
    },
    ${includeOptimistic ? this.generateOptimisticUpdate(entity, operation) : ''}
    ${includeInvalidation ? `onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['${tableName}', 'detail', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['${tableName}', 'list'] })
    },` : ''}
    ${options?.onSuccessTemplate || ''}
    ${options?.onErrorTemplate || ''}
  })
}
`
    } else {
      // delete
      return ts`
export function useDelete${entityName}() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(\`${baseEndpoint}/\${id}\`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': crypto.randomUUID()
        }
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete ${entityName}' }))
        throw new Error(error.message || 'Failed to delete ${entityName}')
      }

      return response.json()
    },
    ${includeOptimistic ? this.generateOptimisticUpdate(entity, operation) : ''}
    ${includeInvalidation ? `onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['${tableName}', 'detail', id] })
      queryClient.invalidateQueries({ queryKey: ['${tableName}', 'list'] })
    },` : ''}
    ${options?.onSuccessTemplate || ''}
    ${options?.onErrorTemplate || ''}
  })
}
`
    }
  }

  generateAPICall<T>(entity: Entity<T>, operation: string): string {
    const tableName = entity.db.table.name
    const baseEndpoint = this.config?.baseUrl
      ? `\${${this.config.baseUrl}}`
      : `/api/${tableName}`

    return ts`
export const ${operation}Api = async (data: any) => {
  const response = await fetch('${baseEndpoint}/${operation}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    throw new Error('API call failed')
  }

  return response.json()
}
`
  }

  generateOptimisticUpdate<T>(
    entity: Entity<T>,
    operation: 'create' | 'update' | 'delete'
  ): string {
    const tableName = entity.db.table.name
    const entityName = entity.name.singular

    if (operation === 'create') {
      return `onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['${tableName}', 'list'] })
      const previousData = queryClient.getQueryData(['${tableName}', 'list'])

      queryClient.setQueryData(['${tableName}', 'list'], (old: any) => {
        if (!old) return { items: [{ ...newData, id: 'temp-' + Date.now() }] }
        return {
          ...old,
          items: [...(old.items || []), { ...newData, id: 'temp-' + Date.now() }]
        }
      })

      return { previousData }
    },
    onError: (err, newData, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['${tableName}', 'list'], context.previousData)
      }
    },`
    } else if (operation === 'update') {
      return `onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['${tableName}', 'detail', id] })
      await queryClient.cancelQueries({ queryKey: ['${tableName}', 'list'] })

      const previousDetail = queryClient.getQueryData(['${tableName}', 'detail', id])
      const previousList = queryClient.getQueryData(['${tableName}', 'list'])

      queryClient.setQueryData(['${tableName}', 'detail', id], (old: any) => ({
        ...old,
        ...data
      }))

      queryClient.setQueryData(['${tableName}', 'list'], (old: any) => {
        if (!old?.items) return old
        return {
          ...old,
          items: old.items.map((item: any) =>
            item.id === id ? { ...item, ...data } : item
          )
        }
      })

      return { previousDetail, previousList }
    },
    onError: (err, { id }, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(['${tableName}', 'detail', id], context.previousDetail)
      }
      if (context?.previousList) {
        queryClient.setQueryData(['${tableName}', 'list'], context.previousList)
      }
    },`
    } else {
      // delete
      return `onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['${tableName}', 'detail', id] })
      await queryClient.cancelQueries({ queryKey: ['${tableName}', 'list'] })

      const previousDetail = queryClient.getQueryData(['${tableName}', 'detail', id])
      const previousList = queryClient.getQueryData(['${tableName}', 'list'])

      queryClient.setQueryData(['${tableName}', 'list'], (old: any) => {
        if (!old?.items) return old
        return {
          ...old,
          items: old.items.filter((item: any) => item.id !== id)
        }
      })

      return { previousDetail, previousList }
    },
    onError: (err, id, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(['${tableName}', 'detail', id], context.previousDetail)
      }
      if (context?.previousList) {
        queryClient.setQueryData(['${tableName}', 'list'], context.previousList)
      }
    },`
    }
  }

  generateInvalidation<T>(
    entity: Entity<T>,
    operation: 'create' | 'update' | 'delete'
  ): string {
    const tableName = entity.db.table.name

    if (operation === 'create') {
      return `queryClient.invalidateQueries({ queryKey: ['${tableName}', 'list'] })`
    } else if (operation === 'update') {
      return `queryClient.invalidateQueries({ queryKey: ['${tableName}'] })`
    } else {
      return `queryClient.invalidateQueries({ queryKey: ['${tableName}'] })`
    }
  }

  generateQueryKeys<T>(entity: Entity<T>): string {
    const tableName = entity.db.table.name
    const entityName = entity.name.singular

    return ts`
export const ${entityName.toLowerCase()}Keys = {
  all: ['${tableName}'] as const,
  lists: () => [...${entityName.toLowerCase()}Keys.all, 'list'] as const,
  list: (filters?: any) => [...${entityName.toLowerCase()}Keys.lists(), filters] as const,
  details: () => [...${entityName.toLowerCase()}Keys.all, 'detail'] as const,
  detail: (id: string) => [...${entityName.toLowerCase()}Keys.details(), id] as const,
  infinite: (filters?: any) => [...${entityName.toLowerCase()}Keys.all, 'infinite', filters] as const,
}
`
  }
}

/**
 * Configuration options for REST adapter
 */
export interface RESTAdapterConfig {
  /** Base URL for API (e.g., process.env.API_URL) */
  baseUrl?: string
  /** Include authentication headers */
  includeAuth?: boolean
  /** Custom headers to include in all requests */
  customHeaders?: Record<string, string>
}
