import type { Entity } from '../entity'

/**
 * Backend adapter interface for database-agnostic code generation.
 * Each adapter implements query/mutation code generation for a specific backend.
 */
export interface BackendAdapter {
  /** Adapter name identifier */
  name: 'convex' | 'rest' | 'trpc' | 'nextjs' | 'graphql'

  /**
   * Generate a query hook for fetching data
   * @param entity Entity definition
   * @param operation Type of query operation
   * @param options Additional generation options
   */
  generateQueryHook<T>(
    entity: Entity<T>,
    operation: 'list' | 'get' | 'infinite',
    options?: QueryHookOptions
  ): string

  /**
   * Generate a mutation hook for data modification
   * @param entity Entity definition
   * @param operation Type of mutation operation
   * @param options Additional generation options
   */
  generateMutationHook<T>(
    entity: Entity<T>,
    operation: 'create' | 'update' | 'delete',
    options?: MutationHookOptions
  ): string

  /**
   * Generate the API call function for a specific operation
   * @param entity Entity definition
   * @param operation Operation name
   */
  generateAPICall<T>(entity: Entity<T>, operation: string): string

  /**
   * Generate optimistic update logic for mutations
   * @param entity Entity definition
   * @param operation Type of mutation operation
   */
  generateOptimisticUpdate<T>(
    entity: Entity<T>,
    operation: 'create' | 'update' | 'delete'
  ): string

  /**
   * Generate cache invalidation logic after mutations
   * @param entity Entity definition
   * @param operation Type of mutation operation
   */
  generateInvalidation<T>(
    entity: Entity<T>,
    operation: 'create' | 'update' | 'delete'
  ): string

  /**
   * Generate query key factory for an entity
   * @param entity Entity definition
   */
  generateQueryKeys<T>(entity: Entity<T>): string
}

/**
 * Options for query hook generation
 */
export interface QueryHookOptions {
  /** Include filtering support */
  includeFilters?: boolean
  /** Include pagination support */
  includePagination?: boolean
  /** Include sorting support */
  includeSorting?: boolean
  /** Enable query on mount (default: true) */
  enabledByDefault?: boolean
  /** Custom stale time in milliseconds */
  staleTime?: number
  /** Custom cache time in milliseconds */
  cacheTime?: number
}

/**
 * Options for mutation hook generation
 */
export interface MutationHookOptions {
  /** Include optimistic updates */
  includeOptimisticUpdates?: boolean
  /** Include automatic cache invalidation */
  includeInvalidation?: boolean
  /** Success callback template */
  onSuccessTemplate?: string
  /** Error callback template */
  onErrorTemplate?: string
  /** Retry configuration */
  retry?: {
    maxAttempts: number
    backoffMs: number
    exponential?: boolean
  }
}

/**
 * Adapter registry for managing available adapters
 */
export class AdapterRegistry {
  private static adapters = new Map<string, BackendAdapter>()

  /**
   * Register a backend adapter
   */
  static register(adapter: BackendAdapter): void {
    this.adapters.set(adapter.name, adapter)
  }

  /**
   * Get a backend adapter by name
   */
  static get(name: string): BackendAdapter | undefined {
    return this.adapters.get(name)
  }

  /**
   * Get all registered adapter names
   */
  static getNames(): string[] {
    return Array.from(this.adapters.keys())
  }

  /**
   * Check if an adapter is registered
   */
  static has(name: string): boolean {
    return this.adapters.has(name)
  }
}
