/**
 * Enhanced Convex Functions Template
 *
 * Generates robust, production-ready Convex CRUD functions with:
 * - Comprehensive typed error system
 * - Advanced permission checks (role-based, ownership, organization)
 * - Relational query helpers
 * - Pagination and search
 * - TypeScript interfaces
 * - neverthrow Result pattern
 */

import type { Entity } from '../entity'
import pluralize from 'pluralize'
import { ts } from '../tags'

export interface EnhancedConvexFunctionsTemplateOptions {
  entity: Entity<any>
  includeRelationalHelpers?: boolean
  includePermissions?: boolean
  includePagination?: boolean
  includeSearch?: boolean
  includeTypeScript?: boolean
  includeWorkOSIntegration?: boolean
  searchFieldName?: string
}

/**
 * Generate TypeScript interface from entity fields
 */
function generateTypeScriptInterface(entity: Entity<any>): string {
  const singularName = pluralize.singular(entity.db.table.name)
  const fields = Object.entries(entity.fields)

  const fieldTypes = fields.map(([fieldName, field]) => {
    const fieldConfig = field as any
    let tsType = fieldConfig.jsType || 'any'

    // Map common JS types to TS types
    if (tsType === 'Date') tsType = 'Date'
    else if (tsType === 'array') tsType = 'any[]'
    else if (tsType === 'object') tsType = 'object'

    const optional = field.optional ? '?' : ''
    return `  ${fieldName}${optional}: ${tsType};`
  }).join('\n')

  return ts`
/**
 * TypeScript interface for ${singularName}
 */
export interface ${singularName} {
${fieldTypes}
}
  `.trim()
}

/**
 * Generate comprehensive error types for an entity
 */
function generateErrorTypes(singularName: string): string {
  return ts`
/**
 * Error types for ${singularName} operations
 */
export interface ${singularName}Error {
  readonly _tag: string;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}

export interface ${singularName}NotFoundError extends ${singularName}Error {
  readonly _tag: '${singularName}NotFoundError';
  readonly id: string;
}

export interface ${singularName}UnauthorizedError extends ${singularName}Error {
  readonly _tag: '${singularName}UnauthorizedError';
  readonly reason: string;
}

export interface ${singularName}ForbiddenError extends ${singularName}Error {
  readonly _tag: '${singularName}ForbiddenError';
  readonly requiredRoles?: string[];
}

export interface ${singularName}ValidationError extends ${singularName}Error {
  readonly _tag: '${singularName}ValidationError';
  readonly field: string;
}

export interface ${singularName}DatabaseError extends ${singularName}Error {
  readonly _tag: '${singularName}DatabaseError';
  readonly operation: 'insert' | 'update' | 'delete' | 'query';
}

export type ${singularName}OperationError =
  | ${singularName}NotFoundError
  | ${singularName}UnauthorizedError
  | ${singularName}ForbiddenError
  | ${singularName}ValidationError
  | ${singularName}DatabaseError;

/**
 * Error constructors
 */
const ${singularName}Errors = {
  notFound: (id: string, message?: string): ${singularName}NotFoundError => ({
    _tag: '${singularName}NotFoundError',
    id,
    message: message || \`${singularName} with id \${id} not found\`,
  }),
  unauthorized: (reason: string, message?: string): ${singularName}UnauthorizedError => ({
    _tag: '${singularName}UnauthorizedError',
    reason,
    message: message || \`Unauthorized: \${reason}\`,
  }),
  forbidden: (message: string, requiredRoles?: string[]): ${singularName}ForbiddenError => ({
    _tag: '${singularName}ForbiddenError',
    message,
    requiredRoles,
  }),
  validation: (field: string, message: string): ${singularName}ValidationError => ({
    _tag: '${singularName}ValidationError',
    field,
    message,
  }),
  database: (operation: ${singularName}DatabaseError['operation'], message: string): ${singularName}DatabaseError => ({
    _tag: '${singularName}DatabaseError',
    operation,
    message,
  }),
};

/**
 * Helper to throw error from Result
 * Convex requires throwing errors for client-side error handling
 */
function throwFromResult<T>(result: Result<T, ${singularName}OperationError>): T {
  return result.match(
    (value) => value,
    (error) => {
      // Convert typed error to Error object for Convex
      const err = new Error(error.message);
      (err as any).code = error._tag;
      (err as any).details = error;
      throw err;
    }
  );
}
  `.trim()
}

/**
 * Generate permission checking helpers
 */
function generatePermissionHelpers(entity: Entity<any>, includeWorkOS: boolean): string {
  const tableName = entity.db.table.name
  const permissions = entity.permissions || {}

  return ts`
/**
 * Check if user has permission for an action
 */
function checkPermission(
  userId: string,
  userRoles: string[],
  action: 'read' | 'write' | 'create' | 'update' | 'delete',
  recordOwnerId?: string
): boolean {
  // Map write action to update for backwards compatibility
  const permAction = action === 'write' ? 'update' : action;

  // Permission configuration for ${tableName}
  const permissions = ${JSON.stringify(permissions, null, 2)};

  const actionPermissions = permissions[permAction];
  if (!actionPermissions) return true;

  // Check role-based permissions
  const requiredRoles = actionPermissions.roles as string[];
  const hasRolePermission = !requiredRoles || requiredRoles.length === 0 ||
    requiredRoles.some((role: string) => userRoles.includes(role));

  // Check owner requirement
  const requiresOwner = 'owner' in actionPermissions && actionPermissions.owner;
  const isOwner = recordOwnerId === userId;

  if (requiresOwner && recordOwnerId && !isOwner) return false;

  return hasRolePermission;
}

${includeWorkOS ? `
/**
 * Get user roles from WorkOS organizations
 *
 * Fetches the user's organization memberships via WorkOS and extracts their roles.
 * Falls back to 'user' role if WorkOS is not configured or if there's an error.
 */
async function getUserRoles(ctx: QueryCtx | MutationCtx): Promise<string[]> {
  try {
    // First, look up the Convex user from tokenIdentifier to get the Id<"users">
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return ['user'];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      return ['user'];
    }

    // Call the WorkOS getUserMemberships query with proper Id<"users"> type
    const memberships = await ctx.runQuery(api.workos.getUserMemberships, { userId: user._id });

    // Extract roles from memberships
    const roles: string[] = [];
    for (const membership of memberships) {
      if (membership.role?.slug) {
        roles.push(membership.role.slug);
      }
    }

    // If no roles found, default to 'user'
    return roles.length > 0 ? roles : ['user'];
  } catch (error) {
    console.error('Failed to fetch user roles:', error);
    // Fallback to basic user role
    return ['user'];
  }
}
` : `
/**
 * Get user roles (simple implementation)
 */
async function getUserRoles(ctx: QueryCtx | MutationCtx): Promise<string[]> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return ['guest'];

  // TODO: Implement role lookup from your user management system
  return ['user'];
}
`}

/**
 * Check if user owns the record
 */
function isRecordOwner(record: any, userId: string): boolean {
  // Check common owner fields
  return record.userId === userId || record.ownerId === userId || record.createdBy === userId;
}
  `.trim()
}

/**
 * Generate relational query helpers
 */
function generateRelationalHelpers(entity: Entity<any>): string {
  const tableName = entity.db.table.name
  const singularName = pluralize.singular(tableName)

  if (!entity.relationships || entity.relationships.length === 0) {
    return ''
  }

  const helpers = entity.relationships.map(rel => {
    const foreignTable = typeof rel.foreignEntity === 'string'
      ? rel.foreignEntity
      : rel.foreignEntity.db.table.name
    const foreignSingular = pluralize.singular(foreignTable)
    const fieldName = rel.db.foreignKey.localColumn

    return ts`
/**
 * Get ${singularName} with ${foreignSingular} data
 */
async function get${singularName}With${foreignSingular}(
  ctx: QueryCtx,
  ${singularName}Id: string
): Promise<(${singularName} & { ${fieldName}Data: ${foreignSingular} | null }) | null> {
  const ${singularName} = await ctx.db
    .query('${tableName}')
    .withIndex('idIndex', (q) => q.eq('id', ${singularName}Id))
    .first();

  if (!${singularName}) return null;

  const ${foreignSingular} = ${singularName}.${fieldName} ?
    await ctx.db
      .query('${foreignTable}')
      .withIndex('idIndex', (q) => q.eq('id', ${singularName}.${fieldName}))
      .first() : null;

  return {
    ...${singularName},
    ${fieldName}Data: ${foreignSingular},
  };
}
    `.trim()
  }).join('\n\n')

  return helpers
}

/**
 * Generate CRUD query and mutation functions
 */
function generateCRUDFunctions(
  entity: Entity<any>,
  options: EnhancedConvexFunctionsTemplateOptions
): string {
  const tableName = entity.db.table.name
  const singularName = pluralize.singular(tableName)
  const pluralName = pluralize.plural(tableName)
  const searchFieldName = options.searchFieldName || 'title'

  // Find first string field for search
  const firstStringField = Object.entries(entity.fields).find(
    ([name, field]) => (field as any).jsType === 'string' && name !== 'id'
  )
  const actualSearchField = firstStringField ? firstStringField[0] : searchFieldName

  // Get field definitions for insert args
  const insertFields = Object.entries(entity.fields)
    .filter(([name]) => name !== 'id') // Exclude id as it's added separately
    .map(([name, field]) => {
      // For now, assume all fields are strings - in production, use proper type mapping
      return `${name}: v.string()`
    })
    .join(', ')

  const insertArgs = insertFields ? `{ id: v.string(), ${insertFields} }` : `{ id: v.string() }`

  return ts`
/**
 * Query to list all ${pluralName}
 * @returns Array of all ${pluralName} in the database
 */
export const list${capitalize(singularName)}s = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new Error('Unauthorized');

    const userRoles = await getUserRoles(ctx);
    if (!checkPermission(userId, userRoles, 'read')) {
      throw new Error('Insufficient permissions to list ${pluralName}');
    }

    return await ctx.db.query('${tableName}').collect();
  },
});

/**
 * Query to get a single ${singularName} by ID
 * @param id - The unique id of the ${singularName}
 * @returns The ${singularName} object or throws typed error
 */
export const get${capitalize(singularName)} = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const result = await getById(ctx, id);
    return throwFromResult(result);
  },
});

/**
 * Internal function that returns Result type for composition
 */
async function getById(
  ctx: QueryCtx,
  id: string
): Promise<Result<${singularName}, ${singularName}OperationError>> {
  const identity = await ctx.auth.getUserIdentity();
  const userId = identity?.subject;
  if (!userId) {
    return err(${singularName}Errors.unauthorized('no_user_id', 'User not authenticated'));
  }

  const userRoles = await getUserRoles(ctx);

  const record = await ctx.db
    .query('${tableName}')
    .withIndex('idIndex', (q) => q.eq('id', id))
    .first();

  if (!record) {
    return err(${singularName}Errors.notFound(id));
  }

  const hasPermission = checkPermission(
    userId,
    userRoles,
    'read',
    isRecordOwner(record, userId) ? userId : undefined
  );

  if (!hasPermission) {
    return err(${singularName}Errors.forbidden(
      'Insufficient permissions to read this ${singularName}',
      ['admin', 'user']
    ));
  }

  return ok(record);
}

${options.includePagination ? ts`
/**
 * Query to list ${pluralName} with pagination
 * @param paginationOpts - Pagination options
 * @returns Paginated list of ${pluralName}
 */
export const list${capitalize(singularName)}sPaginated = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { limit = 20, cursor }) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new Error('Unauthorized');

    const userRoles = await getUserRoles(ctx);
    if (!checkPermission(userId, userRoles, 'read')) {
      throw new Error('Insufficient permissions to list ${pluralName}');
    }

    const query = ctx.db.query('${tableName}');
    return await query.paginate({
      numItems: limit,
      cursor: cursor || null,
    });
  },
});
` : ''}

${options.includeSearch ? ts`
/**
 * Query to search ${pluralName} by text
 * @param searchTerm - The search term to match
 * @param limit - Maximum number of results to return
 * @returns Array of ${pluralName} matching the search term
 */
export const search${capitalize(singularName)}s = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { searchTerm, limit = 20 }) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new Error('Unauthorized');

    const userRoles = await getUserRoles(ctx);
    if (!checkPermission(userId, userRoles, 'read')) {
      throw new Error('Insufficient permissions to search ${pluralName}');
    }

    // Sanitize and validate search term
    const sanitizedSearchTerm = searchTerm.trim().slice(0, 200); // Limit length
    if (!sanitizedSearchTerm) {
      return []; // Return empty results for empty search
    }

    // Validate and limit the limit parameter
    const safeLimit = Math.min(Math.max(1, limit), 100); // Between 1 and 100

    const results = await ctx.db
      .query('${tableName}')
      .withSearchIndex('search_${actualSearchField}', (q) =>
        q.search('${actualSearchField}', sanitizedSearchTerm)
      )
      .take(safeLimit);

    return results;
  },
});
` : ''}

/**
 * Mutation to insert a new ${singularName}
 * @param args - The ${singularName} data to insert (must include unique id)
 */
export const insert${capitalize(singularName)} = mutation({
  args: ${insertArgs},
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new Error('Unauthorized');

    const userRoles = await getUserRoles(ctx);
    if (!checkPermission(userId, userRoles, 'create')) {
      throw new Error('Insufficient permissions to create ${singularName}');
    }

    await ctx.db.insert('${tableName}', args);
  },
});

/**
 * Mutation to update an existing ${singularName}
 * @param key - The unique id of the ${singularName} to update
 * @param changes - Partial object containing the fields to update
 */
export const update${capitalize(singularName)} = mutation({
  args: { key: v.string(), changes: v.any() },
  handler: async (ctx, { key, changes }) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new Error('Unauthorized');

    const userRoles = await getUserRoles(ctx);
    const doc = await ctx.db
      .query('${tableName}')
      .withIndex('idIndex', (q) => q.eq('id', key))
      .first();

    if (!doc) {
      throw new Error(\`${singularName} with id \${key} not found\`);
    }

    if (!checkPermission(userId, userRoles, 'write', isRecordOwner(doc, userId) ? userId : undefined)) {
      throw new Error('Insufficient permissions to update this ${singularName}');
    }

    await ctx.db.patch(doc._id, changes);
  },
});

/**
 * Mutation to delete a ${singularName}
 * @param key - The unique id of the ${singularName} to delete
 */
export const delete${capitalize(singularName)} = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new Error('Unauthorized');

    const userRoles = await getUserRoles(ctx);
    const doc = await ctx.db
      .query('${tableName}')
      .withIndex('idIndex', (q) => q.eq('id', key))
      .first();

    if (!doc) {
      throw new Error(\`${singularName} with id \${key} not found\`);
    }

    if (!checkPermission(userId, userRoles, 'delete', isRecordOwner(doc, userId) ? userId : undefined)) {
      throw new Error('Insufficient permissions to delete this ${singularName}');
    }

    await ctx.db.delete(doc._id);
  },
});
  `.trim()
}

/**
 * Main template generation function
 */
export function generateEnhancedConvexFunctions(
  options: EnhancedConvexFunctionsTemplateOptions
): string {
  const { entity } = options
  const tableName = entity.db.table.name
  const singularName = pluralize.singular(tableName)

  const includeTS = options.includeTypeScript ?? true
  const includePermissions = options.includePermissions ?? true
  const includeRelational = options.includeRelationalHelpers ?? true
  const includePagination = options.includePagination ?? true
  const includeSearch = options.includeSearch ?? true
  const includeWorkOS = options.includeWorkOSIntegration ?? false

  const tsInterface = includeTS ? generateTypeScriptInterface(entity) : ''
  const errorTypes = generateErrorTypes(singularName)
  const permissionHelpers = includePermissions ? generatePermissionHelpers(entity, includeWorkOS) : ''
  const relationalHelpers = includeRelational ? generateRelationalHelpers(entity) : ''
  const crudFunctions = generateCRUDFunctions(entity, options)

  return ts`
import { mutation, query, type QueryCtx, type MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import { Result, ok, err } from 'neverthrow';
${includeWorkOS ? "import { api } from './_generated/api';" : ''}

${tsInterface}

${errorTypes}

${permissionHelpers}

${relationalHelpers}

${crudFunctions}
  `.trim()
}

/**
 * Helper to capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
