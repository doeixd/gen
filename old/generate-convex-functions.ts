#!/usr/bin/env node

/**
 * Robust Type-Safe Convex Function Generator
 *
 * Production-ready with comprehensive error handling, logging, and validation
 */

import path from 'path';
import { Result, ok, err } from 'neverthrow';
import pluralize from 'pluralize';
import {
  readSchemaFile,
  parseSchema,
  type ParsedTable,
  type ParsedField,
} from './utils/schema-parser';
import {
  writeFile,
  type FileOptions,
} from './utils/file-system';
import {
  DEFAULT_CONFIG,
  parseCliArgs,
  mergeConfig,
  validateConfig,
  generateFileHeader,
  addEslintDisable,
  type GeneratorConfig,
} from './utils/config';
import { logger } from './utils/logger';
import { GeneratorError, GeneratorErrorCode, fromError } from './utils/errors';
import {
  tableDisplayConfig,
} from './field-mappings.config';

/**
 * Get generator configuration
 */
function getConfig(): Result<GeneratorConfig, GeneratorError> {
  try {
    const cliArgs = parseCliArgs(process.argv.slice(2));
    const config = mergeConfig(DEFAULT_CONFIG, cliArgs);

    const validationResult = validateConfig(config);
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    return ok(config);
  } catch (error) {
    return err(
      new GeneratorError(
        GeneratorErrorCode.INVALID_CONFIG,
        `Failed to parse configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Generate TypeScript interface from table fields
 */
function generateTypeScriptInterface(tableName: string, fields: ParsedField[], config: GeneratorConfig): Result<string, GeneratorError> {
  try {
    const singularName = pluralize.singular(tableName);

    const fieldTypes = fields.map(field => {
      let tsType: string;
      switch (field.type) {
        case 'string':
        case 'id':
          tsType = 'string';
          break;
        case 'number':
          tsType = 'number';
          break;
        case 'boolean':
          tsType = 'boolean';
          break;
        case 'array':
          tsType = 'any[]';
          break;
        case 'object':
          tsType = 'object';
          break;
        case 'union':
          tsType = 'any';
          break;
        default:
          tsType = 'any';
      }

      const optional = field.isOptional ? '?' : '';
      return `  ${field.name}${optional}: ${tsType};`;
    }).join('\n');

    const header = generateFileHeader(config, `TypeScript interface for ${singularName}`);
    const eslintDisable = addEslintDisable(config);

    const interfaceCode = `${header}${eslintDisable}/**
 * TypeScript interface for ${singularName}
 */
export interface ${singularName} {
${fieldTypes}
}`;

    return ok(interfaceCode);
  } catch (error) {
    return err(
      new GeneratorError(
        GeneratorErrorCode.CODE_GENERATION_ERROR,
        `Failed to generate TypeScript interface for ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { tableName },
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Generate insert args with proper types
 */
function generateInsertArgs(fields: ParsedField[]): string {
  const args = fields
    .filter(field => field.name !== 'id') // Exclude id field as we add it separately
    .map(field => `${field.name}: ${field.typeExpression}`)
    .join(', ');

  // Only add comma if there are other fields
  return args ? `{ id: v.string(), ${args} }` : `{ id: v.string() }`;
}

/**
 * Generate detailed field information for logging
 */
function generateFieldSummary(fields: ParsedField[]): string {
  return fields.map(field => {
    let typeDesc = field.type;
    if (field.isOptional) typeDesc = `optional ${typeDesc}`;
    if (field.isArray) typeDesc = `array of ${typeDesc}`;
    return `    - ${field.name}: ${typeDesc}`;
  }).join('\n');
}

/**
 * Generate permission checking helpers
 */
function generatePermissionHelpers(tableName: string, _singularName: string): string {
  const tableConfig = tableDisplayConfig[tableName];
  const permissions = tableConfig?.permissions;

  if (!permissions) return '';

  return `
/**
 * Check if user has permission for an action
 */
function checkPermission(
  userId: string,
  userRoles: string[],
  action: 'read' | 'write' | 'create' | 'delete',
  recordOwnerId?: string
): boolean {
  // Map write action to update for backwards compatibility
  const permAction = action === 'write' ? 'update' : action;

  // Permission configuration for ${tableName}
  const permissions = ${JSON.stringify(permissions)};

  const actionPermissions = permissions[permAction];
  if (!actionPermissions) return true;

  // Check role-based permissions
  const requiredRoles = actionPermissions.roles as string[];
  const hasRolePermission = !requiredRoles || requiredRoles.length === 0 ||
    requiredRoles.some((role: string) => userRoles.includes(role));

  // Check owner requirement
  const requiresOwner = 'owner' in actionPermissions && actionPermissions.owner;
  const isOwner = recordOwnerId === userId;

  // For ${tableName}, we don't have owner fields defined, so skip owner check for now
  // TODO: Add owner fields to schema if ownership is required
  if (requiresOwner && recordOwnerId && !isOwner) return false;

  return hasRolePermission;
}

/**
 * Get user roles from WorkOS organizations
 *
 * Fetches the user's organization memberships via WorkOS and extracts their roles.
 * Falls back to 'user' role if WorkOS is not configured or if there's an error.
 */
async function getUserRoles(ctx: QueryCtx | MutationCtx, userId: string): Promise<string[]> {
  try {
    // Call the WorkOS getUserMemberships query
    const memberships = await ctx.runQuery(api.workos.getUserMemberships, { userId });

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

/**
 * Check if user owns the record
 */
function isRecordOwner(record: any, userId: string): boolean {
  // Check common owner fields
  return record.userId === userId || record.ownerId === userId || record.createdBy === userId;
}`;
}

/**
 * Generate relational query helpers
 */
function generateRelationalHelpers(tableName: string, fields: ParsedField[]): string {
  const singularName = pluralize.singular(tableName);
  const relationalFields = fields.filter(field => field.parsedType.idTable);

  if (relationalFields.length === 0) return '';

  const helpers = relationalFields.map(field => {
    const relatedTable = field.parsedType.idTable!;
    const relatedSingular = pluralize.singular(relatedTable);

    return `/**
 * Get ${singularName} with ${relatedSingular} data
 */
async function get${singularName}With${relatedSingular}(ctx: QueryCtx, ${singularName}Id: string): Promise<(${singularName} & { ${field.name}Data: ${relatedSingular} | null }) | null> {
  const ${singularName} = await ctx.db
    .query('${tableName}')
    .withIndex('by_id', (q) => q.eq(${singularName}Id))
    .first();

  if (!${singularName}) return null;

  const ${relatedSingular} = ${singularName}.${field.name} ?
    await ctx.db
      .query('${relatedTable}')
      .withIndex('by_id', (q) => q.eq('id', ${singularName}.${field.name}))
      .first() : null;

  return {
    ...${singularName},
    ${field.name}Data: ${relatedSingular},
  };
}`;
  });

  return helpers.join('\n\n');
}

/**
 * Generate Convex functions for a table with enhanced types and relational support
 */
function generateTableFunctions(tableName: string, fields: ParsedField[], config: GeneratorConfig): Result<string, GeneratorError> {
  try {
    const singularName = pluralize.singular(tableName);
    const insertArgs = generateInsertArgs(fields);
    const relationalHelpers = generateRelationalHelpers(tableName, fields);
    const hasRelations = fields.some(field => field.parsedType.idTable);

    // Find the first string field for search functionality (excluding id)
    const searchFieldName = fields.find(f => f.type === 'string' && f.name !== 'id')?.name || 'title';

    const interfaceResult = generateTypeScriptInterface(tableName, fields, config);
    if (interfaceResult.isErr()) return err(interfaceResult.error);

    const header = generateFileHeader(config, `Convex CRUD functions for ${tableName} table`);
    const eslintDisable = addEslintDisable(config);

    const permissionHelpers = generatePermissionHelpers(tableName, singularName);

    const functionsCode = `${header}${eslintDisable}import { mutation, query, type QueryCtx, type MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import { Result, ok, err } from 'neverthrow';
import { api } from './_generated/api';

${interfaceResult.value}

/**
 * Error types for ${tableName} operations
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

${permissionHelpers}

${relationalHelpers}

/**
 * Query to list all ${tableName}
 * @returns Array of all ${tableName} in the database
 */
export const list = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new Error('Unauthorized');

    const userRoles = await getUserRoles(ctx, userId);
    if (!checkPermission(userId, userRoles, 'read')) {
      throw new Error('Insufficient permissions to list ${tableName}');
    }

    return await ctx.db.query('${tableName}').collect();
  },
});

/**
 * Query to get a single ${singularName} by ID
 * @param id - The unique id of the ${singularName}
 * @returns The ${singularName} object or throws typed error
 */
export const get = query({
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

  const userRoles = await getUserRoles(ctx, userId);

  // @ts-expect-error - Convex type inference doesn't recognize runtime indexes
  const record = await ctx.db
    .query('${tableName}')
    .withIndex('by_id', (q) => q.eq('id', id))
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
}${hasRelations ? `

/**
 * Query to get a ${singularName} with related data
 * @param id - The unique id of the ${singularName}
 * @returns The ${singularName} with populated relationships
 */
export const getWithRelations = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new Error('Unauthorized');

    const userRoles = await getUserRoles(ctx, userId);

    ${fields.filter(field => field.parsedType.idTable).map(field => {
      const relatedTable = field.parsedType.idTable!;
      const relatedSingular = pluralize.singular(relatedTable);
      return `// @ts-expect-error - Convex type inference doesn't recognize runtime indexes
    const ${singularName} = await ctx.db
      .query('${tableName}')
      .withIndex('by_id', (q) => q.eq('id', id))
      .first();

    if (!${singularName}) return null;

    if (!checkPermission(userId, userRoles, 'read', isRecordOwner(${singularName}, userId) ? userId : undefined)) {
      throw new Error('Insufficient permissions to read this ${singularName}');
    }

    // @ts-expect-error - Convex type inference doesn't recognize runtime indexes
    const ${relatedSingular} = ${singularName}.${field.name} ?
      await ctx.db
        .query('${relatedTable}')
        .withIndex('by_id', (q) => q.eq('id', ${singularName}.${field.name}))
        .first() : null;

    return {
      ...${singularName},
      ${field.name}Data: ${relatedSingular},
    };`;
    }).join('\n\n    ')}
  },
});` : ''}

/**
 * Query to list ${tableName} with pagination
 * @param paginationOpts - Pagination options
 * @returns Paginated list of ${tableName}
 */
export const listPaginated = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { limit = 20, cursor }) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new Error('Unauthorized');

    const userRoles = await getUserRoles(ctx, userId);
    if (!checkPermission(userId, userRoles, 'read')) {
      throw new Error('Insufficient permissions to list ${tableName}');
    }

    const query = ctx.db.query('${tableName}');
    return await query.paginate({
      numItems: limit,
      cursor: cursor || null,
    });
  },
});

/**
 * Query to search ${tableName} by text
 * @param searchTerm - The search term to match
 * @param limit - Maximum number of results to return
 * @returns Array of ${tableName} matching the search term
 */
export const search = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { searchTerm, limit = 20 }) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new Error('Unauthorized');

    const userRoles = await getUserRoles(ctx, userId);
    if (!checkPermission(userId, userRoles, 'read')) {
      throw new Error('Insufficient permissions to search ${tableName}');
    }

    // Sanitize and validate search term
    const sanitizedSearchTerm = searchTerm.trim().slice(0, 200); // Limit length
    if (!sanitizedSearchTerm) {
      return []; // Return empty results for empty search
    }

    // Validate and limit the limit parameter
    const safeLimit = Math.min(Math.max(1, limit), 100); // Between 1 and 100

    // Search using the primary string field
    const searchField = '${searchFieldName}';

    const results = await ctx.db
      .query('${tableName}')
      .withSearchIndex('search_${searchFieldName}', (q) =>
        q.search('${searchFieldName}', sanitizedSearchTerm)
      )
      .take(safeLimit);

    return results;
  },
});

/**
 * Mutation to insert a new ${singularName}
 * @param args - The ${singularName} data to insert (must include unique id)
 */
export const insert = mutation({
  args: ${insertArgs},
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new Error('Unauthorized');

    const userRoles = await getUserRoles(ctx, userId);
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
export const update = mutation({
  args: { key: v.string(), changes: v.any() },
  handler: async (ctx, { key, changes }) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new Error('Unauthorized');

    const userRoles = await getUserRoles(ctx, userId);
    // @ts-expect-error - Convex type inference doesn't recognize runtime indexes
    const doc = await ctx.db
      .query('${tableName}')
      .withIndex('by_id', (q) => q.eq('id', key))
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
export const deleteFn = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new Error('Unauthorized');

    const userRoles = await getUserRoles(ctx, userId);
    // @ts-expect-error - Convex type inference doesn't recognize runtime indexes
    const doc = await ctx.db
      .query('${tableName}')
      .withIndex('by_id', (q) => q.eq('id', key))
      .first();

    if (!doc) {
      throw new Error(\`${singularName} with id \${key} not found\`);
    }

    if (!checkPermission(userId, userRoles, 'delete', isRecordOwner(doc, userId) ? userId : undefined)) {
      throw new Error('Insufficient permissions to delete this ${singularName}');
    }

    await ctx.db.delete(doc._id);
  },
});`;

    return ok(functionsCode);
  } catch (error) {
    return err(
      new GeneratorError(
        GeneratorErrorCode.CODE_GENERATION_ERROR,
        `Failed to generate Convex functions for ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { tableName },
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Update schema to add 'id' field and 'by_id' index to each table
 */
function updateSchema(tables: Map<string, ParsedTable>, config: GeneratorConfig): Result<boolean, GeneratorError> {
  try {
    const schemaPath = config.paths.schema;
    const readResult = readSchemaFile(schemaPath);
    if (readResult.isErr()) return err(readResult.error);

    let schemaContent = readResult.value;
    let modified = false;

    for (const [tableName, tableData] of tables.entries()) {
      // Check if table already has an id field
      const hasIdField = tableData.fields.some((f) => f.name === 'id');

      if (!hasIdField) {
        logger.info(`Adding 'id' field to ${tableName}...`);
        // Add id field to the table definition
        const tableRegex = new RegExp(
          `(${tableName}:\\s*defineTable\\(\\{)([^}]+)(\\}\\))`,
          'g'
        );

        schemaContent = schemaContent.replace(tableRegex, (match, start, fields, end) => {
          // Add id field at the beginning
          return `${start}\n    id: v.string(),${fields}${end}`;
        });
        modified = true;
      }

      // Check if table already has by_id index
      const hasIndex = schemaContent.includes(`${tableName}:`) &&
                       schemaContent.includes(`.index('by_id'`);

      if (!hasIndex) {
        logger.info(`Adding 'by_id' index to ${tableName}...`);
        // Add index to the table - need to find the closing parenthesis and brace
        // Pattern: tablename: defineTable({ ... })
        const tableDefRegex = new RegExp(
          `(${tableName}:\\s*defineTable\\(\\{[^}]+\\}\\))(?!\\.index)`,
          'g'
        );

        schemaContent = schemaContent.replace(
          tableDefRegex,
          `$1.index('by_id', ['id'])`
        );
        modified = true;
      }
    }

    if (modified) {
      const writeOptions: FileOptions = {
        overwrite: true,
        backup: config.createBackups,
        dryRun: config.dryRun,
      };

      const writeResult = writeFile(schemaPath, schemaContent, writeOptions);
      if (writeResult.isErr()) return err(writeResult.error);

      logger.success('Updated schema.ts with id fields and by_id indexes');
    } else {
      logger.info('Schema already up to date');
    }

    return ok(modified);
  } catch (error) {
    return err(
      new GeneratorError(
        GeneratorErrorCode.CODE_GENERATION_ERROR,
        `Failed to update schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Generate Convex functions for all tables
 */
async function generateConvexFunctions(
  tables: Map<string, ParsedTable>,
  config: GeneratorConfig
): Promise<Result<void, GeneratorError>> {
  try {
    logger.section('Generating Convex Functions');

    // Filter tables based on configuration
    let tablesToProcess = Array.from(tables.entries());

    if (config.mode === 'selective' && config.tables) {
      tablesToProcess = tablesToProcess.filter(([tableName]) =>
        config.tables!.includes(tableName)
      );
    }

    if (config.skipTables) {
      tablesToProcess = tablesToProcess.filter(([tableName]) =>
        !config.skipTables!.includes(tableName)
      );
    }

    logger.info(`Processing ${tablesToProcess.length} table(s)`);

    for (const [tableName, tableData] of tablesToProcess) {
      logger.subsection(`Processing ${tableName}`);

      const outputPath = path.join(config.paths.convex, `${tableName}.ts`);

      // Generate functions
      const functionsResult = generateTableFunctions(tableName, tableData.fields, config);
      if (functionsResult.isErr()) {
        logger.error(`Failed to generate functions for ${tableName}`, functionsResult.error.code, {
          tableName,
          error: functionsResult.error.message
        });
        continue;
      }

      // Write functions file
      const fileOptions: FileOptions = {
        overwrite: config.overwrite,
        backup: config.createBackups,
        dryRun: config.dryRun,
      };

      const writeResult = writeFile(outputPath, functionsResult.value, fileOptions);
      if (writeResult.isErr()) {
        logger.error(`Failed to write functions file for ${tableName}`, writeResult.error.code, {
          filePath: outputPath,
          error: writeResult.error.message
        });
        continue;
      }

      logger.success(`Generated ${tableName}.ts (${tableData.fields.length} fields)`);
      logger.incrementTables();
      logger.incrementFields(tableData.fields.length);
    }

    return ok(undefined);
  } catch (error) {
    return err(fromError(error, GeneratorErrorCode.CODE_GENERATION_ERROR));
  }
}

/**
 * Main function with comprehensive error handling
 */
async function main(): Promise<void> {
  try {
    logger.startGeneration();
    logger.section('🔧 Robust Type-Safe Convex Function Generator');

    // Get configuration
    const configResult = getConfig();
    if (configResult.isErr()) {
      logger.error('Configuration error', configResult.error.code, {
        error: configResult.error.message
      });
      process.exit(1);
    }

    const config = configResult.value;
    logger.setLevel(config.logLevel);

    if (config.dryRun) {
      logger.info('🔍 DRY RUN MODE - No files will be written');
    }

    // Read and parse schema
    logger.subsection('Reading Schema');
    const schemaContentResult = readSchemaFile(config.paths.schema);
    if (schemaContentResult.isErr()) {
      logger.error('Failed to read schema file', schemaContentResult.error.code, {
        filePath: config.paths.schema,
        error: schemaContentResult.error.message
      });
      process.exit(1);
    }

    const tablesResult = parseSchema(
      schemaContentResult.value,
      (tableName, fieldName, fieldType, isOptional) =>
        ({ zodValidator: undefined, formComponent: 'Text', displayComponent: 'Text', defaultValue: undefined, props: {} })
    );

    if (tablesResult.isErr()) {
      logger.error('Failed to parse schema', tablesResult.error.code, {
        error: tablesResult.error.message
      });
      process.exit(1);
    }

    const tables = tablesResult.value;
    logger.success(`Parsed ${tables.size} table(s) from schema`);

    // Display detailed field information
    logger.subsection('Table Details');
    for (const [tableName, tableData] of tables.entries()) {
      logger.info(`${tableName}:`);
      console.log(generateFieldSummary(tableData.fields));
    }

    // Update schema with id fields and indexes
    logger.subsection('Updating Schema');
    const schemaUpdateResult = updateSchema(tables, config);
    if (schemaUpdateResult.isErr()) {
      logger.error('Failed to update schema', schemaUpdateResult.error.code, {
        error: schemaUpdateResult.error.message
      });
      process.exit(1);
    }

    // Generate functions for each table
    const generateResult = await generateConvexFunctions(tables, config);
    if (generateResult.isErr()) {
      logger.error('Convex function generation failed', generateResult.error.code, {
        error: generateResult.error.message
      });
      process.exit(1);
    }

    // Print report
    logger.endGeneration();
    logger.printReport();

    // Print usage information
    if (!config.dryRun && tables.size > 0) {
      console.log('\n📚 Usage Example:\n');
      console.log('```typescript');
      console.log("import { ConvexClient } from 'convex/browser';");
      console.log("import { createConvexCollectionCreator } from './utils/convex-tanstackdb';");
      console.log('');
      console.log("const client = new ConvexClient(import.meta.env.VITE_CONVEX_URL);");
      console.log('const createCollection = createConvexCollectionCreator(client);');
      console.log('');

      for (const tableName of tables.keys()) {
        console.log(`// Create ${tableName} collection`);
        console.log(`const ${tableName} = createCollection('${tableName}', {`);
        console.log(`  getKey: (item) => item.id,`);
        console.log('});');
        console.log('');
      }

      console.log('// Use the collections');
      const firstTable = Array.from(tables.keys())[0];
      console.log(`${firstTable}.insert({ id: crypto.randomUUID(), /* ... other fields */ });`);
      console.log('```');
    }

  } catch (error) {
    const genError = fromError(error);
    logger.error('Unexpected error in main function', genError.code, {
      error: genError.message
    });
    process.exit(1);
  }
}

// Run the generator
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});