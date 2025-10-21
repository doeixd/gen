/**
 * Mapping System - Single Source of Truth for Application Configuration
 *
 * A comprehensive system for defining entities with:
 * - Component registry (works with any UI library)
 * - Database types (works with any ORM/database)
 * - Permission system (role, ownership, organization, attribute-based, temporal, field-level)
 * - Mutation system (versioned, audited, with rollback support)
 * - Code generation (database schemas, API routes, frontend components)
 *
 * @example
 * ```ts
 * import { createEntity, ComponentRegistry, validators, dbTypes } from './mapping'
 *
 * // Register your UI components
 * ComponentRegistry.registerBulk({
 *   TextField: MyUILib.TextField,
 *   NumberField: MyUILib.NumberField,
 * })
 *
 * // Define an entity
 * const userEntity = createEntity({
 *   id: 'user',
 *   name: { singular: 'User', plural: 'Users' },
 *   db: {
 *     table: { name: 'users', primaryKey: ['id'], columns: new Map() },
 *     columns: {
 *       id: { type: dbTypes.id() },
 *       email: { type: dbTypes.string(255) },
 *       name: { type: dbTypes.string(100) },
 *     }
 *   },
 *   fields: {
 *     id: { standardSchema: validators.uuid },
 *     email: { standardSchema: validators.email },
 *     name: { standardSchema: validators.stringMin(1) },
 *   }
 * })
 * ```
 */

// ===== Components =====
export {
  ComponentRegistry,
  displayComponents,
  withProps,
  isComponentWithProps,
  isDisplayComponentConfig,
  getComponentProps,
} from './components'

export type {
  ComponentRef,
  ComponentWithProps,
  DisplayComponentConfig,
  InputComponentConfig,
  FormComponent,
  DisplayComponent,
} from './components'

// ===== Database =====
export {
  dbTypes,
} from './database'

export type {
  DbColumnType,
  DbColumn,
  DbTable,
  DbIndex,
  DbConstraint,
  DbRelationship,
  DbSchema,
} from './database'

// ===== Permissions =====
export {
  PermissionEngine,
} from './permissions'

export type {
  User,
  PermissionConfig,
  EntityPermissions,
  PermissionCheckResult,
  RoutePermissionConfig,
} from './permissions'

// ===== Mutations =====
export {
  MutatorFactory,
} from './mutations'

export type {
  MutationContext,
  MutationResult,
  MutationHistory,
  EntityMutator,
  InsertMutationFn,
  UpdateMutationFn,
  DeleteMutationFn,
} from './mutations'

// ===== Validators =====
export {
  validators,
  createValidator,
  extractStandardSchema,
} from './validators'

export type {
  StandardSchema,
  Validator,
  AsyncValidator,
  ValidationResult,
} from './validators'

// ===== Entity =====
export {
  routeConfig,
} from './entity'

export type {
  Entity,
  FieldMapping,
  NameConfig,
  RoutesConfig,
  ValidationConfig,
  TableConfig,
  RelationshipMapping,
  CRUDResult,
  SyncConfig,
  RouteConfig,
} from './entity'

// ===== Helpers =====
export {
  defaultTypeMappings,
  fieldNamePatterns,
  tableFieldOverrides,
  excludeFromForms,
  excludeFromList,
  tableDisplayConfig,
  resolveFieldConfig,
  createFieldMapping,
  createEntity,
  createRelationship,
  addTableOverride,
  addFieldPattern,
} from './helpers'

export type {
  TableFieldOverrides,
} from './helpers'

// ===== Generators =====
export {
  DatabaseGenerator,
  SchemaGenerator,
} from './generators/database'

export {
  APIGenerator,
} from './generators/api'

export {
  FrontendGenerator,
  TestGenerator,
  DocumentationGenerator,
} from './generators/frontend'

export type {
  GeneratedDatabaseCode,
} from './generators/database'

export type {
  GeneratedAPICode,
} from './generators/api'

export type {
  GeneratedFrontendCode,
  GeneratedTestCode,
  GeneratedDocumentation,
} from './generators/frontend'

// Re-export global types for convenience
export type { ComponentType, AllComponents, UIComponents, CustomComponents, RoleType } from './components'
