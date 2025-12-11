# Code Generator Improvements

This document outlines the comprehensive improvements made to the code generation system based on the robust implementation pattern from the Convex function generator.

## Summary of Improvements

The codebase has been enhanced with production-ready patterns including comprehensive error handling, advanced permission systems, relational query helpers, and robust schema management utilities.

## New Features

### 1. Enhanced Convex Functions Template (`src/templates/convex-functions-enhanced.template.ts`)

**Location**: `src/templates/convex-functions-enhanced.template.ts`

A production-ready Convex function generator with advanced features:

#### Features:
- **Comprehensive Typed Error System**: Entity-specific error types with Result pattern (using `neverthrow`)
  - `${Entity}NotFoundError`
  - `${Entity}UnauthorizedError`
  - `${Entity}ForbiddenError`
  - `${Entity}ValidationError`
  - `${Entity}DatabaseError`

- **Advanced Permission Checks**:
  - Role-based access control
  - Ownership-based permissions
  - Organization-based access
  - Field-level permission support
  - Optional WorkOS integration for user role management

- **Relational Query Helpers**:
  - Automatic generation of relationship query functions
  - `get${Entity}With${Related}()` pattern for populated queries
  - Foreign key relationship handling

- **Enhanced Query Operations**:
  - Pagination with cursor support
  - Search functionality with sanitization and limits
  - Proper index usage (`withIndex('idIndex')`)
  - Safe query parameters with validation

- **TypeScript Interface Generation**:
  - Automatic TS interfaces from entity fields
  - Proper type mapping (JS types → TS types)
  - Optional field handling

#### Usage Example:

```typescript
import { generateEnhancedConvexFunctions } from './templates'

const code = generateEnhancedConvexFunctions({
  entity: userEntity,
  includeRelationalHelpers: true,
  includePermissions: true,
  includePagination: true,
  includeSearch: true,
  includeTypeScript: true,
  includeWorkOSIntegration: true,
  searchFieldName: 'email' // Optional, auto-detects first string field
})
```

#### Generated Functions:

For each entity, the template generates:
- `list${Entity}s()` - List all with permission checks
- `get${Entity}(id)` - Get single with typed errors
- `list${Entity}sPaginated(limit, cursor)` - Paginated listing
- `search${Entity}s(searchTerm, limit)` - Full-text search with sanitization
- `insert${Entity}(data)` - Create with validation
- `update${Entity}(key, changes)` - Update with ownership checks
- `delete${Entity}(key)` - Delete with permission validation
- `get${Entity}With${Related}(id)` - Relational queries (if relationships exist)

#### Error Handling Pattern:

```typescript
// Internal Result-based function for composition
async function getById(ctx, id): Promise<Result<User, UserOperationError>> {
  const userId = await checkAuth(ctx)
  if (!userId) {
    return err(UserErrors.unauthorized('no_user_id'))
  }

  const record = await ctx.db.query('users').withIndex('idIndex', q => q.eq('id', id)).first()
  if (!record) {
    return err(UserErrors.notFound(id))
  }

  return ok(record)
}

// Public query that throws for Convex client compatibility
export const getUser = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const result = await getById(ctx, id)
    return throwFromResult(result) // Converts Result to thrown error
  }
})
```

### 2. Schema Update Utility (`src/utils/schema-updater.ts`)

**Location**: `src/utils/schema-updater.ts`

Automatically updates Convex schema files to add required fields and indexes.

#### Features:
- **Automatic `id` Field Addition**: Adds `id: v.string()` to tables missing it
- **Index Generation**: Adds `idIndex` for efficient lookups
- **Search Index Support**: Auto-generates search indexes for string fields
- **Schema Validation**: Validates schema structure before modifications
- **Backup Support**: Creates backups before modifying schema
- **Dry-run Mode**: Preview changes without writing files

#### Functions:

```typescript
// Main update function
updateConvexSchema(
  entities: Entity<any>[],
  options: SchemaUpdateOptions
): Result<SchemaUpdateResult, GeneratorError>

// Validate before updating
validateSchemaStructure(
  schemaContent: string,
  entities: Entity<any>[]
): Result<void, GeneratorError>

// Check what updates are needed
checkSchemaUpdatesNeeded(
  entities: Entity<any>[],
  schemaContent: string,
  options: SchemaUpdateOptions
): { needed: boolean; updates: string[] }

// Generate field summary for logging
generateFieldSummary(entity: Entity<any>): string
```

#### Usage Example:

```typescript
import { updateConvexSchema, generateFieldSummary } from './utils/schema-updater'

const result = updateConvexSchema(entities, {
  schemaPath: './convex/schema.ts',
  createBackups: true,
  dryRun: false,
  addIdField: true,
  addIdIndex: true,
  addSearchIndexes: true
})

if (result.isOk()) {
  console.log('Schema updated:', result.value.changes)
  console.log('Field summary:', generateFieldSummary(entity))
}
```

### 3. Enhanced Test Generator (Already Exists)

**Location**: `src/generators/test.ts`

The existing test generator already includes comprehensive test coverage:

#### Features:
- **Unit Tests**: CRUD operations, validation, mutations, computed fields
- **Integration Tests**: Full API integration testing with database
- **E2E Tests**: Playwright-based end-to-end testing
- **Permission Tests**: Comprehensive permission testing
  - Role-based permissions
  - Ownership-based permissions
  - Organization-based permissions
  - Field-level permissions
  - Temporal permissions

## Integration Guide

### 1. Using Enhanced Convex Generator

Update your generator command to use the enhanced template:

```typescript
// In src/cli/generate.ts or custom generator

import { generateEnhancedConvexFunctions } from '../templates'

// Generate enhanced Convex functions
for (const entity of entities) {
  const code = generateEnhancedConvexFunctions({
    entity,
    includeRelationalHelpers: true,
    includePermissions: true,
    includePagination: true,
    includeSearch: true,
    includeTypeScript: true,
    includeWorkOSIntegration: false // Set to true if using WorkOS
  })

  // Write to file
  writeFile(`./convex/${entity.db.table.name}.ts`, code)
}
```

### 2. Schema Auto-Update Workflow

Add schema updates to your generation workflow:

```typescript
import { updateConvexSchema, checkSchemaUpdatesNeeded } from '../utils/schema-updater'

// Check if updates are needed
const check = checkSchemaUpdatesNeeded(entities, schemaContent, {
  addIdField: true,
  addIdIndex: true,
  addSearchIndexes: true
})

if (check.needed) {
  logger.info('Schema updates needed:', check.updates)

  // Apply updates
  const result = updateConvexSchema(entities, {
    schemaPath: config.paths.schema,
    createBackups: true,
    dryRun: config.dryRun,
    addIdField: true,
    addIdIndex: true,
    addSearchIndexes: true
  })

  if (result.isOk()) {
    logger.success(`Updated schema: ${result.value.changes.join(', ')}`)
  }
}
```

### 3. Permission System Setup

The enhanced generator includes permission checking out of the box:

```typescript
// In your entity definitions
const userEntity = createEntity({
  id: 'user',
  name: { singular: 'User', plural: 'Users' },
  permissions: {
    roles: {
      create: ['admin'],
      read: ['admin', 'user'],
      update: ['admin'],
      delete: ['admin']
    },
    ownership: {
      required: true,
      ownerField: 'userId',
      allowTransfer: false
    },
    organization: {
      required: true,
      orgField: 'organizationId',
      allowCrossOrg: false
    }
  },
  // ... rest of entity definition
})
```

The generated functions will automatically enforce these permissions.

## Key Patterns

### 1. Result Pattern for Error Handling

```typescript
import { Result, ok, err } from 'neverthrow'

// Internal functions return Result
async function getById(id: string): Promise<Result<User, UserOperationError>> {
  const user = await db.get(id)
  if (!user) {
    return err(UserErrors.notFound(id))
  }
  return ok(user)
}

// Public API converts Result to exceptions
export const getUser = query({
  handler: async (ctx, { id }) => {
    const result = await getById(id)
    return throwFromResult(result)
  }
})
```

### 2. Permission Checking

```typescript
// Role-based
if (!checkPermission(userId, userRoles, 'read')) {
  throw new Error('Insufficient permissions')
}

// Ownership-based
const isOwner = isRecordOwner(record, userId)
if (!checkPermission(userId, userRoles, 'update', isOwner ? userId : undefined)) {
  throw new Error('Insufficient permissions')
}
```

### 3. Relational Queries

```typescript
// Auto-generated relational helper
const userWithProfile = await getUserWithProfile(ctx, userId)
// Returns: User & { profileData: Profile | null }
```

### 4. Search with Sanitization

```typescript
// Sanitize search term
const sanitizedSearchTerm = searchTerm.trim().slice(0, 200)
const safeLimit = Math.min(Math.max(1, limit), 100)

const results = await ctx.db
  .query('users')
  .withSearchIndex('search_email', q => q.search('email', sanitizedSearchTerm))
  .take(safeLimit)
```

## Configuration Options

### Enhanced Convex Generator Options

```typescript
interface EnhancedConvexFunctionsTemplateOptions {
  entity: Entity<any>
  includeRelationalHelpers?: boolean    // Default: true
  includePermissions?: boolean          // Default: true
  includePagination?: boolean           // Default: true
  includeSearch?: boolean               // Default: true
  includeTypeScript?: boolean           // Default: true
  includeWorkOSIntegration?: boolean    // Default: false
  searchFieldName?: string              // Optional, auto-detects
}
```

### Schema Updater Options

```typescript
interface SchemaUpdateOptions {
  schemaPath: string
  createBackups: boolean     // Create .backup files
  dryRun: boolean           // Preview changes only
  addIdField: boolean       // Add id: v.string() if missing
  addIdIndex: boolean       // Add .index('idIndex', ['id'])
  addSearchIndexes: boolean // Add search indexes for string fields
}
```

## Migration Path

### For Existing Projects

1. **Update Imports**:
   ```typescript
   // Old
   import { generateConvexFunctions } from './templates'

   // New (enhanced)
   import { generateEnhancedConvexFunctions } from './templates'
   ```

2. **Add neverthrow Dependency**:
   ```bash
   npm install neverthrow
   ```

3. **Update Schema** (if needed):
   ```typescript
   import { updateConvexSchema } from './utils/schema-updater'

   updateConvexSchema(entities, {
     schemaPath: './convex/schema.ts',
     createBackups: true,
     dryRun: false,
     addIdField: true,
     addIdIndex: true,
     addSearchIndexes: true
   })
   ```

4. **Add Permission Configurations** to entities:
   ```typescript
   const entity = createEntity({
     // ... existing config
     permissions: {
       roles: {
         create: ['admin'],
         read: ['admin', 'user'],
         update: ['admin'],
         delete: ['admin']
       }
     }
   })
   ```

## Benefits

1. **Type Safety**: Comprehensive TypeScript types and error handling
2. **Robustness**: Production-ready error handling with neverthrow Result pattern
3. **Security**: Built-in permission checks at multiple levels
4. **Performance**: Proper index usage and query optimization
5. **Maintainability**: Auto-generated code with consistent patterns
6. **Scalability**: Pagination and search built-in
7. **Developer Experience**: Clear error messages and typed errors
8. **Testing**: Comprehensive test generation with permission tests

## Examples

### Complete Entity with Enhanced Generation

```typescript
import { createEntity } from './builders'
import { dbTypes } from './database'
import { validators } from './validators'
import { generateEnhancedConvexFunctions } from './templates'
import { updateConvexSchema } from './utils/schema-updater'

// Define entity
const userEntity = createEntity({
  id: 'user',
  name: { singular: 'User', plural: 'Users' },
  db: {
    table: { name: 'users', primaryKey: ['id'] },
    columns: {
      id: { type: dbTypes.id() },
      email: { type: dbTypes.string(255) },
      name: { type: dbTypes.string(100) },
      organizationId: { type: dbTypes.id() }
    },
    indexes: [
      { name: 'emailIndex', columns: ['email'], unique: true }
    ]
  },
  fields: {
    id: { jsType: 'string', standardSchema: validators.uuid },
    email: { jsType: 'string', standardSchema: validators.email },
    name: { jsType: 'string', standardSchema: validators.string },
    organizationId: { jsType: 'string', optional: true }
  },
  permissions: {
    roles: {
      create: ['admin'],
      read: ['admin', 'user'],
      update: ['admin'],
      delete: ['admin']
    },
    ownership: {
      required: true,
      ownerField: 'id',
      allowTransfer: false
    }
  }
})

// Update schema
const schemaResult = updateConvexSchema([userEntity], {
  schemaPath: './convex/schema.ts',
  createBackups: true,
  dryRun: false,
  addIdField: true,
  addIdIndex: true,
  addSearchIndexes: true
})

// Generate enhanced Convex functions
const code = generateEnhancedConvexFunctions({
  entity: userEntity,
  includeRelationalHelpers: true,
  includePermissions: true,
  includePagination: true,
  includeSearch: true,
  includeTypeScript: true,
  includeWorkOSIntegration: true
})

// Write to file
writeFile('./convex/users.ts', code)
```

## Testing

The enhanced generator produces fully testable code:

```typescript
import { describe, it, expect } from 'vitest'
import { ConvexTestingHelper } from '@convex-dev/convex'
import { api } from './_generated/api'

describe('Users (Enhanced)', () => {
  let t: ConvexTestingHelper

  beforeEach(() => {
    t = new ConvexTestingHelper(schema)
  })

  it('should enforce role-based permissions', async () => {
    // Test as guest - should fail
    await expect(
      t.mutation(api.users.insertUser, { id: '1', email: 'test@test.com' })
    ).rejects.toThrow('Insufficient permissions')
  })

  it('should support pagination', async () => {
    // Create test data
    for (let i = 0; i < 25; i++) {
      await t.mutation(api.users.insertUser, {
        id: `user-${i}`,
        email: `user${i}@test.com`
      })
    }

    // Paginate
    const page1 = await t.query(api.users.listUsersPaginated, { limit: 10 })
    expect(page1.page.length).toBe(10)

    const page2 = await t.query(api.users.listUsersPaginated, {
      limit: 10,
      cursor: page1.continueCursor
    })
    expect(page2.page.length).toBe(10)
  })

  it('should sanitize search queries', async () => {
    // Malicious input should be sanitized
    const results = await t.query(api.users.searchUsers, {
      searchTerm: '<script>alert("xss")</script>'.repeat(100),
      limit: 9999
    })

    // Search term limited to 200 chars
    // Limit capped at 100
    expect(results.length).toBeLessThanOrEqual(100)
  })
})
```

## Next Steps

1. **Update CLI**: Integrate enhanced generator into CLI commands
2. **Add Examples**: Create example projects using enhanced patterns
3. **Documentation**: Add API docs for generated functions
4. **Migration Scripts**: Create automated migration tools for existing projects
5. **Monitoring**: Add logging and metrics to generated functions
6. **Performance**: Add query analysis and optimization tools

## References

- neverthrow Documentation: https://github.com/supermacro/neverthrow
- Convex Best Practices: https://docs.convex.dev/
- TypeScript Error Handling: https://typescript-eslint.io/
- Permission System Design: `src/permissions.ts`
- Schema Design: `src/database.ts`
