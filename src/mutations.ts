/**
 * Mutation System - Track all changes with audit trail
 * Named, versioned mutations with complete history tracking
 */

import { z } from 'zod'
import type { PermissionConfig } from './permissions'

// StandardSchema type (Zod 3.24+ implements this via ~standard property)
type StandardSchema<T = any> = z.ZodType<T>

/**
 * Context for mutation execution
 */
export interface MutationContext {
  userId: string
  userRoles?: string[]
  timestamp: Date
  requestId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

/**
 * Result of a mutation
 */
export interface MutationResult<T> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
  mutationId: string
  version: number
  timestamp: Date
  changedFields?: Array<keyof T>
  previousValues?: Partial<T>
  warnings?: string[]
}

/**
 * History record for a mutation
 */
export interface MutationHistory<T> {
  mutationId: string
  mutatorName: string
  mutatorVersion: number
  version?: number // Alias for mutatorVersion for convenience
  timestamp: Date
  userId: string
  userRoles: string[]
  input: any
  output?: T
  previousState?: Partial<T>
  newState?: Partial<T>
  changedFields: Array<keyof T>
  success: boolean
  error?: string
  errorCode?: string
  rollbackAt?: Date
  rollbackBy?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

/**
 * Entity mutator - Named, versioned, audited mutations
 */
export interface EntityMutator<T, TInput = Partial<T>> {
  // Identity
  name: string // e.g., 'createUser', 'approveOrder', 'archivePost'
  version: number
  createdAt: Date
  updatedAt?: Date
  description?: string
  category?: string // Group related mutators

  // Mutation logic
  mutate: (input: TInput, context: MutationContext) => Promise<MutationResult<T>>

  // Validation
  validateInput?: StandardSchema<TInput>
  validateOutput?: StandardSchema<T>

  // Permissions
  permissions: PermissionConfig
  requiresApproval?: boolean
  approvers?: string[] // Roles that can approve

  // Audit trail
  audit: {
    enabled: boolean
    logLevel: 'none' | 'basic' | 'detailed' | 'full'
    retentionDays?: number
    anonymize?: boolean
    excludeFields?: string[] // Don't log these fields (e.g., passwords)
  }

  // Lifecycle hooks
  beforeMutate?: (input: TInput, context: MutationContext) => Promise<void>
  afterMutate?: (result: T, context: MutationContext) => Promise<void>
  onSuccess?: (result: T, context: MutationContext) => Promise<void>
  onError?: (error: Error, context: MutationContext) => Promise<void>

  // Rollback support
  rollback?: (id: string, context: MutationContext) => Promise<void>
  canRollback?: (id: string, context: MutationContext) => Promise<boolean>

  // Rate limiting
  rateLimit?: {
    maxCalls: number
    windowMs: number
    perUser?: boolean
    perOrganization?: boolean
  }

  // Idempotency
  idempotencyKey?: (input: TInput) => string

  // Retry configuration
  retry?: {
    maxAttempts: number
    backoffMs: number
    exponential?: boolean
  }
}

/**
 * Executable mutator with validation and history tracking
 */
export interface ExecutableMutator<T, TInput> {
  name: string
  version: number
  type: 'insert' | 'update' | 'delete'
  inputSchema?: StandardSchema<TInput>
  beforeMutate?: (input: TInput, context: MutationContext) => Promise<TInput>
  afterMutate?: (result: T, context: MutationContext) => Promise<T>
  onSuccess?: (result: T, context: MutationContext) => Promise<void>
  onError?: (error: Error, context: MutationContext) => Promise<void>
  requiresApproval?: boolean
  rollback?: (history: MutationHistory<T>, context: MutationContext) => Promise<any>
  execute: (input: TInput, context: MutationContext) => Promise<{
    success: boolean
    data?: T
    error?: string
    history?: MutationHistory<T>
  }>
}

/**
 * Mutator factory - Create standard and custom mutators
 */
export class MutatorFactory {
  /**
   * Create an insert mutator
   */
  static createInsert<T, TInput = Partial<T>>(config: {
    name: string
    version: number
    inputSchema: StandardSchema<TInput>
    execute: (input: TInput) => Promise<T>
    beforeMutate?: (input: TInput, context: MutationContext) => Promise<TInput>
    afterMutate?: (result: T, context: MutationContext) => Promise<T>
    onSuccess?: (result: T, context: MutationContext) => Promise<void>
    onError?: (error: Error, context: MutationContext) => Promise<void>
    requiresApproval?: boolean
  }): ExecutableMutator<T, TInput> {
    return {
      name: config.name,
      version: config.version,
      type: 'insert',
      inputSchema: config.inputSchema,
      beforeMutate: config.beforeMutate,
      afterMutate: config.afterMutate,
      onSuccess: config.onSuccess,
      onError: config.onError,
      requiresApproval: config.requiresApproval,
      execute: async (input: TInput, context: MutationContext) => {
        try {
          // Validate input
          if (config.inputSchema) {
            try {
              input = config.inputSchema.parse(input) as TInput
            } catch (validationError) {
              return {
                success: false,
                error: validationError instanceof Error ? validationError.message : 'Validation failed',
              }
            }
          }

          // Call beforeMutate hook
          if (config.beforeMutate) {
            input = await config.beforeMutate(input, context)
          }

          // Execute mutation
          let result = await config.execute(input)

          // Call afterMutate hook
          if (config.afterMutate) {
            result = await config.afterMutate(result, context)
          }

          // Create history record
          const history: MutationHistory<T> = {
            mutationId: `${config.name}-${Date.now()}`,
            mutatorName: config.name,
            mutatorVersion: config.version,
            version: config.version,
            timestamp: context.timestamp,
            userId: context.userId,
            userRoles: context.userRoles || [],
            input,
            output: result,
            newState: result as Partial<T>,
            changedFields: Object.keys(result as any) as Array<keyof T>,
            success: true,
          }

          // Call onSuccess hook
          if (config.onSuccess) {
            await config.onSuccess(result, context)
          }

          return {
            success: true,
            data: result,
            history,
          }
        } catch (error) {
          // Call onError hook
          if (config.onError && error instanceof Error) {
            await config.onError(error, context)
          }

          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      },
    }
  }

  /**
   * Create an update mutator
   */
  static createUpdate<T, TInput = Partial<T>>(config: {
    name: string
    version: number
    inputSchema: StandardSchema<TInput>
    execute: (input: TInput) => Promise<T>
    beforeMutate?: (input: TInput, context: MutationContext) => Promise<TInput>
    afterMutate?: (result: T, context: MutationContext) => Promise<T>
    onSuccess?: (result: T, context: MutationContext) => Promise<void>
    onError?: (error: Error, context: MutationContext) => Promise<void>
    requiresApproval?: boolean
    rollback?: (history: MutationHistory<T>, context: MutationContext) => Promise<any>
  }): ExecutableMutator<T, TInput> {
    return {
      name: config.name,
      version: config.version,
      type: 'update',
      inputSchema: config.inputSchema,
      beforeMutate: config.beforeMutate,
      afterMutate: config.afterMutate,
      onSuccess: config.onSuccess,
      onError: config.onError,
      requiresApproval: config.requiresApproval,
      rollback: config.rollback,
      execute: async (input: TInput, context: MutationContext) => {
        try {
          // Validate input
          if (config.inputSchema) {
            try {
              input = config.inputSchema.parse(input) as TInput
            } catch (validationError) {
              return {
                success: false,
                error: validationError instanceof Error ? validationError.message : 'Validation failed',
              }
            }
          }

          // Call beforeMutate hook
          if (config.beforeMutate) {
            input = await config.beforeMutate(input, context)
          }

          // Execute mutation
          let result = await config.execute(input)

          // Call afterMutate hook
          if (config.afterMutate) {
            result = await config.afterMutate(result, context)
          }

          // Create history record
          const history: MutationHistory<T> = {
            mutationId: `${config.name}-${Date.now()}`,
            mutatorName: config.name,
            mutatorVersion: config.version,
            version: config.version,
            timestamp: context.timestamp,
            userId: context.userId,
            userRoles: context.userRoles || [],
            input,
            output: result,
            newState: result as Partial<T>,
            changedFields: Object.keys(result as any) as Array<keyof T>,
            success: true,
          }

          // Call onSuccess hook
          if (config.onSuccess) {
            await config.onSuccess(result, context)
          }

          return {
            success: true,
            data: result,
            history,
          }
        } catch (error) {
          // Call onError hook
          if (config.onError && error instanceof Error) {
            await config.onError(error, context)
          }

          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      },
    }
  }

  /**
   * Create a delete mutator
   */
  static createDelete<T, TInput = { id: string }>(config: {
    name: string
    version: number
    inputSchema: StandardSchema<TInput>
    execute: (input: TInput) => Promise<T>
    beforeMutate?: (input: TInput, context: MutationContext) => Promise<TInput>
    afterMutate?: (result: T, context: MutationContext) => Promise<T>
    onSuccess?: (result: T, context: MutationContext) => Promise<void>
    onError?: (error: Error, context: MutationContext) => Promise<void>
  }): ExecutableMutator<T, TInput> {
    return {
      name: config.name,
      version: config.version,
      type: 'delete',
      inputSchema: config.inputSchema,
      beforeMutate: config.beforeMutate,
      afterMutate: config.afterMutate,
      onSuccess: config.onSuccess,
      onError: config.onError,
      execute: async (input: TInput, context: MutationContext) => {
        try {
          // Validate input
          if (config.inputSchema) {
            try {
              input = config.inputSchema.parse(input) as TInput
            } catch (validationError) {
              return {
                success: false,
                error: validationError instanceof Error ? validationError.message : 'Validation failed',
              }
            }
          }

          // Call beforeMutate hook
          if (config.beforeMutate) {
            input = await config.beforeMutate(input, context)
          }

          // Execute mutation
          let result = await config.execute(input)

          // Call afterMutate hook
          if (config.afterMutate) {
            result = await config.afterMutate(result, context)
          }

          // Create history record
          const history: MutationHistory<T> = {
            mutationId: `${config.name}-${Date.now()}`,
            mutatorName: config.name,
            mutatorVersion: config.version,
            version: config.version,
            timestamp: context.timestamp,
            userId: context.userId,
            userRoles: context.userRoles || [],
            input,
            output: result,
            changedFields: [],
            success: true,
          }

          // Call onSuccess hook
          if (config.onSuccess) {
            await config.onSuccess(result, context)
          }

          return {
            success: true,
            data: result,
            history,
          }
        } catch (error) {
          // Call onError hook
          if (config.onError && error instanceof Error) {
            await config.onError(error, context)
          }

          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      },
    }
  }

  /**
   * Create standard insert, update, delete mutators for an entity
   */
  static createStandardMutators<TInsert, TUpdate, TDelete>(
    entityName: string,
    schemas: {
      insert: StandardSchema<TInsert>
      update: StandardSchema<TUpdate>
      delete: StandardSchema<TDelete>
    }
  ): {
    insert: ExecutableMutator<any, TInsert>
    update: ExecutableMutator<any, TUpdate>
    delete: ExecutableMutator<any, TDelete>
  } {
    return {
      insert: MutatorFactory.createInsert({
        name: `insert${entityName.charAt(0).toUpperCase()}${entityName.slice(1)}`,
        version: 1,
        inputSchema: schemas.insert,
        execute: async (input) => input,
      }),
      update: MutatorFactory.createUpdate({
        name: `update${entityName.charAt(0).toUpperCase()}${entityName.slice(1)}`,
        version: 1,
        inputSchema: schemas.update,
        execute: async (input) => input,
      }),
      delete: MutatorFactory.createDelete({
        name: `delete${entityName.charAt(0).toUpperCase()}${entityName.slice(1)}`,
        version: 1,
        inputSchema: schemas.delete,
        execute: async (input) => input,
      }),
    }
  }

  /**
   * Create standard CRUD mutators for an entity
   */
  static createStandardCRUD<T>(
    entityName: string,
    permissions?: Partial<Record<'create' | 'update' | 'delete', PermissionConfig>>
  ): {
    create: EntityMutator<T, Partial<T>>
    update: EntityMutator<T, {id: string, data: Partial<T>}>
    delete: EntityMutator<void, string>
    softDelete: EntityMutator<T, string>
    restore: EntityMutator<T, string>
  } {
    const now = new Date()

    return {
      create: {
        name: `create${entityName}`,
        version: 1,
        createdAt: now,
        description: `Create a new ${entityName}`,
        category: 'crud',
         mutate: async (_input, _ctx) => {
           // Auto-generated create logic will be implemented
           throw new Error('Not implemented - will be generated')
         },
        permissions: permissions?.create || {},
        audit: { enabled: true, logLevel: 'detailed' },
      },
      update: {
        name: `update${entityName}`,
        version: 1,
        createdAt: now,
        description: `Update an existing ${entityName}`,
        category: 'crud',
         mutate: async (_input, _ctx) => {
           // Auto-generated update logic
           throw new Error('Not implemented - will be generated')
         },
        permissions: permissions?.update || {},
        audit: { enabled: true, logLevel: 'full' },
      },
      delete: {
        name: `delete${entityName}`,
        version: 1,
        createdAt: now,
        description: `Delete a ${entityName}`,
        category: 'crud',
         mutate: async (_id, _ctx) => {
           // Auto-generated delete logic
           throw new Error('Not implemented - will be generated')
         },
        permissions: permissions?.delete || {},
        audit: { enabled: true, logLevel: 'full' },
      },
      softDelete: {
        name: `softDelete${entityName}`,
        version: 1,
        createdAt: now,
        description: `Soft delete a ${entityName}`,
        category: 'crud',
         mutate: async (_id, _ctx) => {
           // Auto-generated soft delete logic
           throw new Error('Not implemented - will be generated')
        },
        permissions: permissions?.delete || {},
        audit: { enabled: true, logLevel: 'detailed' },
      },
      restore: {
        name: `restore${entityName}`,
        version: 1,
        createdAt: now,
        description: `Restore a soft-deleted ${entityName}`,
        category: 'crud',
         mutate: async (_id, _ctx) => {
           // Auto-generated restore logic
           throw new Error('Not implemented - will be generated')
         },
        permissions: permissions?.update || {},
        audit: { enabled: true, logLevel: 'detailed' },
      },
    }
  }

  /**
   * Create a custom mutator
   */
  static createCustom<T, TInput>(
    config: Omit<EntityMutator<T, TInput>, 'createdAt'> & {createdAt?: Date}
  ): EntityMutator<T, TInput> {
    return {
      ...config,
      createdAt: config.createdAt || new Date(),
    }
  }
}

/**
 * Mutation function types
 */
export type InsertMutationFn<T> = (data: Partial<T>) => Promise<T> | T
export type UpdateMutationFn<T> = (id: string, data: Partial<T>) => Promise<T> | T
export type DeleteMutationFn = (id: string) => Promise<void> | void
