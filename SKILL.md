---
name: gen
description: Use Gen in application projects to define entities and generate database, API, frontend, auth integration, and docs code. Use this skill for CLI usage, configuration, plugin/generator extension, and safe regeneration workflows.
license: MIT
compatibility: Node.js + npm. CLI command is `@doeixd/gen`.
metadata:
  author: gen-maintainers
  version: "1.1"
---

---
name: gen
description: Build, fix, and extend the Gen mapping and code generation system. Use this skill when tasks involve entities, validators, permissions, mutators, code generators, CLI commands, or TypeScript type safety across the repo.
license: MIT
compatibility: Requires Node.js and npm. Uses Pridepack for build/type-check and Vitest for tests.
metadata:
  author: gen-maintainers
  version: "1.0"
---

# SKILL.MD - Gen Library Guide for AI Agents

## 2026 Additions (Important)

Use these newer capabilities when helping end users:

- **Auth integration targets**
  - `convex-auth`
  - `spacetime-auth`
  - `zero-auth`
- **Integration profiles**
  - `minimal`
  - `prod-ready`
  - `existing-app-merge`
- **Integration modes**
  - `scaffold`
  - `patch`
- **Generation UX commands**
  - `gen generate --interactive`
  - `gen generate --plan`
  - `gen generate --json`
  - `gen generate --explain`
- **Health checks**
  - `gen doctor`
- **Entity authoring DSL**
  - `createEntityKit()` with typed `field`, `db`, `prop`, `routes`, and permission presets
- **Vite entity auto-discovery**
  - `createEntityDiscoveryPlugin()`
  - virtual modules: `virtual:gen/entities`, `virtual:gen/entity-map`
- **Project-local generator discovery**
  - `*.generator.ts` modules can be auto-discovered and executed after built-in generation
  - selector support for `targets` and `entities`
  - CLI controls: `--no-project-generators`, `--project-generator-include`, `--project-generator-exclude`
  - conventions doc: `docs/entity-and-generator-file-conventions.md`
  - recipes doc: `docs/vite-plugin-recipes.md`

When users ask how to avoid a single giant entity file, recommend the Vite plugin with `*.entity.ts` files.

## Overview

**Gen** is a comprehensive code generation system that serves as a **single source of truth** for application configuration. It allows you to define entities once and automatically generate database schemas, API routes, and frontend components for multiple targets. gen:1-7 

## Core Philosophy

Gen operates on the principle of defining entities as a single source of truth that combines:
- Database schema definitions
- UI component mappings
- Validation rules
- Permission systems
- Mutation tracking with audit trails
- Code generation configurations gen:1-40 

## Architecture

### 1. Entity System

The core of Gen is the `Entity<T>` type, which is a comprehensive data structure containing all aspects of a data model. gen:117-165 

An entity includes:
- **Identity & Metadata**: ID, name, version, timestamps, description, tags, category, icon, color
- **UI Components**: Display, input, loading, empty, and error components (actual function references, not strings)
- **Database Schema**: Table definitions, columns with types, indexes, and constraints
- **Fields Configuration**: Field-level settings including validation, components, permissions
- **Relationships**: One-to-one, one-to-many, many-to-one, many-to-many relationships with full database details
- **Routes**: REST API route configurations
- **Tables/Lists**: Table display configurations
- **Mutations**: Versioned, audited mutation operations
- **Permissions**: Multi-level access control
- **Lifecycle Hooks**: Before/after create, update, delete hooks
- **Computed Fields**: Derived fields with caching
- **Error Configuration**: Custom error handling per entity gen:260-434 

### 2. Component Registry System

Gen uses a **UI-framework-agnostic component registry** that works with any UI library (React, Vue, Svelte, etc.). Components are registered as actual function references, not strings. gen:1-100 

The registry supports:
- Form components (TextField, NumberField, Checkbox, etc.)
- Display components (Text, Number, Badge, DateTime, etc.)
- Layout components (Card, Table, Grid, Stack)
- Route/Page components (Page, DetailView, ListView, FormView)
- Custom user-defined components gen:11-14 

### 3. Database Type System

Gen provides a flexible database type system that can generate schemas for multiple targets:
- **Drizzle ORM**
- **Prisma**
- **Raw SQL** (Postgres/MySQL/SQLite)
- **Convex**

Each database column type includes:
- Type name and parameters
- Serialization/deserialization functions
- Validation functions
- Target-specific schema generation methods (toDrizzle, toPrisma, toSQL, toConvex) gen:1-99 

The `dbTypes` factory provides builders for common types with chainable modifiers like `.nullable()`, `.default()`, `.unique()`, `.primaryKey()`. gen:117-150 

### 4. Permission System

Gen implements a **comprehensive multi-level permission system** supporting:

- **Role-Based Access Control (RBAC)**: Different permissions per role (read, write, create, update, delete, admin)
- **Ownership-Based Permissions**: Require ownership checks with configurable owner fields
- **Organization-Based Permissions**: Scope access by organization with cross-org support
- **Attribute-Based Access Control (ABAC)**: Custom attribute checks with operators
- **Temporal Permissions**: Time-based and schedule-based access controls
- **Field-Level Permissions**: Per-field read/write permissions with data masking
- **Conditional Permissions**: Dynamic permission rules based on context gen:1-100 gen:21-27 

### 5. Mutation System

The mutation system provides **versioned, audited operations** with complete audit trails tracking who changed what and when. gen:29-42 

Each mutator includes:
- Name, version, timestamps, description, category
- Mutation logic function
- Input/output validation using StandardSchema
- Permission requirements and optional approval workflows
- Audit configuration (log level, retention, anonymization)
- Lifecycle hooks (before/after mutation, rollback support) gen:1-100 

### 6. Validation System

Gen uses **StandardSchema-compliant validators** built on Zod, providing type-safe validation throughout the system. gen:1-100 

The `validators` object provides:
- String validators (email, url, uuid, with min/max constraints)
- Number validators (positive, non-negative, integer, with range constraints)
- Boolean validators
- Array validators
- Object validators
- Optional/nullable variants
- Custom validators with refinement and transformation gen:41-42 

### 7. Error System

Gen includes a **comprehensive, type-safe error system** with:
- 100% type-safe error handling (no magic strings)
- Support for both throwing exceptions AND returning Result types
- Extensible error registry for custom error classes
- 25+ predefined errors with recovery suggestions across 11 categories
- Framework integration (Express, Fastify, etc.)
- Advanced utilities (retry logic, error boundaries, HTTP status mapping) gen:1-50 

The error system is **opinion-free** - generators can choose whether to throw errors or return Result types based on their target framework. gen:40-88 

### 8. Tagged Template System

Gen provides **language-specific tagged template functions** for enhanced syntax highlighting when writing code generators:

- `html` - HTML/JSX templates
- `css` - CSS stylesheets
- `ts` - TypeScript code
- `sql` - SQL queries
- `gql` - GraphQL schemas
- `json` - JSON configurations
- `yaml` - YAML files
- `md` - Markdown documents
- `code(language)` - Dynamic language selection gen:284-463 

## Code Generation Capabilities

### Database Generation

Gen can generate database schemas for multiple targets:

1. **Drizzle ORM**: TypeScript-first ORM schemas
2. **Prisma**: Prisma schema language
3. **Raw SQL**: PostgreSQL, MySQL, or SQLite migration files
4. **Convex**: Convex schema definitions gen:196-225 

### API Generation

Gen generates complete API routes with:
- Validation middleware
- Permission checks
- Error handling
- OpenAPI/Swagger specifications
- Support for Express, Fastify, Hono, and Koa frameworks gen:227-252 

### Frontend Generation

Gen generates UI components and routes for:
- React
- Vue
- Svelte

Generated components include:
- List views with pagination, sorting, filtering
- Detail views
- Create/edit forms with validation
- Route configurations gen:254-282 

### Specialized Generators

Gen includes specialized generators for:
- **Rails-Style Routes**: RESTful API routes similar to Ruby on Rails
- **Next.js API Routes**: Next.js 13+ App Router compatible routes
- **OpenAPI Documentation**: Complete OpenAPI 3.0 specifications
- **Testing Suites**: Unit, integration, and E2E tests
- **Deployment Configurations**: Docker, CI/CD, Kubernetes manifests gen:475-552 

## CLI Usage

The Gen CLI provides powerful commands for code generation:

### Basic Commands

- `gen init [project-name]` - Initialize a new project
- `gen generate [targets...]` - Generate code from entities
- `gen doctor` - Run integration/dependency/env/patch checks
- `gen plugin <command>` - Manage plugins
- `gen config <command>` - Manage configuration gen:606-614 

### Generation Options

The CLI supports multiple targets that can be combined:
- Database: `drizzle`, `prisma`, `sql`, `convex`
- API: `express`, `fastify`, `hono`, `koa`
- Frontend: `react`, `vue`, `svelte`
- Specialized: `crud`, `forms`, `rails`, `nextjs`, `openapi`, `tests`, `deployment`

Additional options include:
- `--dry-run` - Preview changes without writing files
- `--backup` - Backup existing files before generation
- `--incremental` - Skip existing files
- `--force` - Overwrite without prompts
- `--verbose` - Enable detailed logging gen:616-708 
- `--interactive` - Run target/profile wizard
- `--plan` - Show generation plan and exit
- `--json` - Show generation plan as JSON and exit
- `--explain` - Explain what targets generate
- `--no-project-generators` - Disable discovered project-local generators for a run
- `--project-generator-include` - Restrict discovery include roots/patterns
- `--project-generator-exclude` - Exclude generator roots/patterns

Auth integration options:
- `--convex-auth-mode`, `--spacetime-auth-mode`, `--zero-auth-mode`
- `--convex-auth-profile`, `--spacetime-auth-profile`, `--zero-auth-profile`

## How to Use Gen (Step-by-Step)

### 1. Installation

Install Gen globally or as a dev dependency:
```bash
npm install -g gen
# or
npm install --save-dev gen
``` gen:54-59 

### 2. Register UI Components

Register your UI library components once in the component registry: gen:66-73 

This allows Gen to use actual component references (type-safe) instead of strings.

### 3. Define Entities

Create entity definition files using the `createEntity()` helper: gen:75-101 

Each entity should define:
- Database table and columns using `dbTypes`
- Field mappings with validation using `validators`
- Permissions using the permission configuration
- Optional: relationships, mutations, hooks, routes

### 4. Generate Code

Run the Gen CLI to generate code for your targets: gen:105-114 

Generated code will be placed in the configured output directories with proper TypeScript types throughout.

## Key Helper Functions

Gen provides numerous utility functions:

**Field Resolution**: `resolveFieldConfig()`, `createFieldMapping()`

**Entity Creation**: `createEntity()`, `createRelationship()`

**Entity DSL**: `createEntityKit()` for typed `field()/db()/prop()` construction

**Configuration**: `addTableOverride()`, `addFieldPattern()`

**Type Conversion**: `entityToTypeScript()`, `entityToJsonSchema()`

**Field Utilities**: `getFieldNames()`, `getSortableFields()`, `getFilterableFields()`, `getEditableFields()`, `getRequiredFields()`, `getOptionalFields()`, `getDefaultValues()`

**Validation**: `validateEntity()`, `hasFieldPermission()`, `getVisibleFields()`, `sanitizeEntity()`

**String Utilities**: `camelToSnake()`, `snakeToCamel()`, `pascalToCamel()`, `camelToPascal()`, `pluralize()`, `singularize()`

**Object Utilities**: `deepClone()`, `deepMerge()`, `isEmpty()`, `getNestedProperty()`, `setNestedProperty()`

**General Utilities**: `generateId()`, `debounce()`, `throttle()` gen:235-267 

## Plugin System

Gen supports a powerful plugin architecture for extending functionality:

- Install plugins with `gen plugin install`
- Create custom plugins with `gen plugin create`
- Plugins can provide custom generators, commands, and integrations gen:554-601 

The CLI automatically loads and registers plugin commands. gen:78-107 

For Vite projects, the entity discovery plugin can replace manual registry files:

- configure `createEntityDiscoveryPlugin()` in `vite.config.ts`
- define entities in distributed `*.entity.ts` files
- import via `virtual:gen/entities`

## Configuration System

Gen supports flexible configuration through:

1. **Config Files**: `.genrc.json` or custom config files
2. **Custom Generators**: JavaScript/TypeScript files with custom generation logic
3. **Field Mappings**: Pattern-based field configuration with smart defaults
4. **Table Overrides**: Per-table field customization gen:710-759 

## Best Practices for AI Agents

### 1. Entity Definition
- Always define a complete entity with database schema, fields, and validation
- Use `dbTypes` for database columns to ensure multi-target compatibility
- Use `validators` for field validation to maintain type safety
- Define permissions at the entity level for consistent access control

### 2. Component Registration
- Register UI components once at application startup
- Use actual component references, not string names
- Register custom components for domain-specific needs

### 3. Code Generation
- Start with `--dry-run` to preview changes
- Use `--backup` for existing codebases
- Generate incrementally with `--incremental` to preserve customizations
- Combine multiple targets in a single command for consistency

### 4. Error Handling
- Use the error system's type-safe error codes
- Provide rich context when creating errors
- Choose throwing vs. returning errors based on the target framework
- Implement recovery suggestions for user-facing errors gen:519-618 

### 5. Permissions
- Define permissions at multiple levels (entity, field, route)
- Use role-based permissions for simple cases
- Add ownership/organization checks for multi-tenant applications
- Use conditional permissions for complex business logic

### 6. Mutations
- Always enable audit trails for important operations
- Define clear input/output validation schemas
- Use lifecycle hooks for side effects
- Implement approval workflows for sensitive operations

## Important Notes

1. **Type Safety**: Gen is fully type-safe throughout - from entity definition to generated code
2. **Framework Agnostic**: Works with any UI framework, database, and API framework
3. **Single Source of Truth**: Entity definitions drive all generated code
4. **Extensibility**: Plugin system allows custom generators and commands
5. **Version Control**: Entities and mutations are versioned for tracking changes
6. **Production Ready**: Includes comprehensive error handling, permissions, and audit trails

## Package Information

- **Package Name**: `gen`
- **License**: MIT
- **Main Dependencies**: 
  - `neverthrow` for Result types
  - `zod` for validation
  - `commander` for CLI
  - `pluralize` for string utilities gen:1-54 

## Entry Points

- **CLI**: `./dist/cjs/production/cli/index.js`
- **Module**: `./dist/esm/production/index.js`
- **CJS**: `./dist/cjs/production/index.js`
- **Types**: `./dist/types/index.d.ts` gen:55-68 

---

This guide provides a comprehensive overview of the Gen library for AI agents. For specific implementation details, refer to the source files and documentation within the repository.
### Citations
**File:** README.md (L1-7)
```markdown
# Gen - Single Source of Truth Code Generator

[![npm version](https://badge.fury.io/js/gen.svg)](https://badge.fury.io/js/gen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Gen** is a comprehensive code generation system that serves as a single source of truth for application configuration. Define your entities once and automatically generate database schemas, API routes, and frontend components for multiple targets including Drizzle, Prisma, SQL, Convex, React, Vue, and more.
```
**File:** README.md (L11-14)
```markdown
### 🏗️ Comprehensive Entity System
- **Single Source of Truth**: Define entities with database schema, UI components, permissions, mutations, and validation in one place
- **Type-Safe Throughout**: Full TypeScript support from entity definition to generated code
- **Component Registry**: UI-framework-agnostic system supporting React, Vue, Svelte, and custom components
```
**File:** README.md (L21-27)
```markdown
### 🔐 Advanced Permission System
- **Role-Based Access**: Different permissions per user role (read, write, create, update, delete, admin)
- **Ownership Controls**: Require ownership checks with configurable owner fields
- **Organization Scoping**: Scope access by organization with cross-org support
- **Attribute-Based Access**: Custom attribute checks with operators
- **Temporal Permissions**: Time-based and schedule-based access controls
- **Field-Level Security**: Per-field read/write permissions with data masking
```
**File:** README.md (L29-42)
```markdown
### 🔄 Versioned Mutation System
- **Audited Operations**: Full audit trail tracking who, when, and what changed

### 🚨 Comprehensive Error System
- **Type-Safe Errors**: 100% type-safe error handling with no magic strings
- **Flexible Paradigms**: Supports both throwing exceptions AND returning Result types
- **Extensible Registry**: Register custom error classes while using sensible defaults
- **Rich Error Catalog**: 25+ predefined errors with recovery suggestions across 11 categories
- **Framework Integration**: Works with Express, Fastify, and custom error handling patterns
- **Advanced Utilities**: Retry logic, error boundaries, HTTP status mapping, and batch processing
- **Rollback Support**: Versioned mutations with rollback capabilities
- **Lifecycle Hooks**: Before/after create, update, delete hooks
- **Input/Output Validation**: StandardSchema-compatible validation
- **Approval Workflows**: Optional approval processes for sensitive operations
```
**File:** README.md (L54-59)
```markdown

```bash
npm install -g gen
# or
npm install --save-dev gen
```
```
**File:** README.md (L66-73)
```markdown
import { createEntity, ComponentRegistry, validators, dbTypes } from 'gen'

// Register your UI components (do this once)
ComponentRegistry.registerBulk({
  TextField: MyUILib.TextField,
  NumberField: MyUILib.NumberField,
  EmailField: MyUILib.EmailField,
})
```
**File:** README.md (L75-101)
```markdown
// Define a User entity
export const userEntity = createEntity({
  id: 'user',
  name: { singular: 'User', plural: 'Users' },
  db: {
    table: { name: 'users', primaryKey: ['id'] },
    columns: {
      id: { type: dbTypes.id() },
      email: { type: dbTypes.string(255) },
      name: { type: dbTypes.string(100) },
      role: { type: dbTypes.enum(['user', 'admin', 'superadmin']) },
    }
  },
  fields: {
    id: { standardSchema: validators.uuid },
    email: { standardSchema: validators.email },
    name: { standardSchema: validators.stringMin(1) },
    role: { standardSchema: validators.enum(['user', 'admin', 'superadmin']) },
  },
  permissions: {
    create: { roles: ['admin'] },
    read: { roles: ['user', 'admin'] },
    update: { roles: ['admin'], ownership: { field: 'id' } },
    delete: { roles: ['superadmin'] },
  }
})
```
```
**File:** README.md (L105-114)
```markdown
```bash
# Generate everything
gen --targets=database,api,frontend

# Generate with custom config
gen --config=./gen-config.js --targets=database --dry-run

# Generate specific database targets
gen --targets=drizzle,prisma,sql
```
```
**File:** README.md (L117-165)
```markdown

The core of Gen is the `Entity<T>` type, which combines all aspects of your data model:

```typescript
type Entity<T, C, R, E> = {
  // Identity & Metadata
  id: string
  name: NameConfig
  version: number
  createdAt: Date

  // UI Components (actual function references!)
  components?: {
    display?: ComponentRef
    input?: ComponentRef
    loading?: ComponentRef
  }

  // Database Schema
  db: {
    table: DbTable
    columns: { [K in keyof T]: DbColumn<T[K]> }
    indexes?: DbIndex[]
    constraints?: DbConstraint[]
  }

  // Field Configuration
  fields: { [K in keyof T]: FieldMapping<T[K], C> }

  // Relationships
  relationships?: RelationshipMapping<T, any, C>[]

  // Routes & Navigation
  routes?: RoutesConfig<T, C, R>

  // Permissions
  permissions?: EntityPermissions

  // Mutations with Audit Trail
  mutators?: Record<string, EntityMutator<T, any>>

  // Lifecycle Hooks
  hooks?: {
    beforeCreate?: (data: Partial<T>) => Promise<void>
    afterCreate?: (data: T) => Promise<void>
    // ... more hooks
  }
}
```
```
**File:** README.md (L196-225)
```markdown
### Database Generation

Generate database schemas for multiple targets:

```bash
# Generate Drizzle ORM schema
gen --targets=drizzle

# Generate Prisma schema
gen --targets=prisma

# Generate raw SQL migrations
gen --targets=sql

# Generate Convex schema
gen --targets=convex
```

**Generated Output:**
```
📁 database/
├── drizzle/
│   └── users.ts
├── prisma/
│   └── users.prisma
├── migrations/
│   └── 001_users.sql
└── convex/
    └── users.ts
```
```
**File:** README.md (L227-252)
```markdown
### API Generation

Create complete API routes with validation and middleware:

```bash
# Generate Express routes
gen --targets=api --api-framework=express

# Generate with OpenAPI specs
gen --targets=api --include-openapi
```

**Generated Output:**
```
📁 api/
├── routes/
│   └── users.ts
├── controllers/
│   └── users.controller.ts
├── middleware/
│   └── users.middleware.ts
├── validators/
│   └── users.validator.ts
└── types/
    └── users.types.ts
```
```
**File:** README.md (L254-282)
```markdown
### Frontend Generation

Generate UI components and routes:

```bash
# Generate React components
gen --targets=frontend --frontend-framework=react

# Generate with forms and tables
gen --targets=frontend --include-forms --include-tables
```

**Generated Output:**
```
📁 frontend/
├── components/
│   ├── UserList.tsx
│   ├── UserDetail.tsx
│   └── UserForm.tsx
├── forms/
│   └── UserForm.tsx
└── routes/
    ├── users/
    │   ├── index.tsx
    │   ├── create.tsx
    │   └── [id]/
    │       ├── view.tsx
    │       └── edit.tsx
```
```
**File:** README.md (L284-463)
```markdown
## 🏷️ Tagged Template System

Gen uses specialized tagged template functions for enhanced syntax highlighting and better developer experience when writing code generators.

### Language-Specific Templates

```typescript
import { html, css, sql, ts, gql, json, yaml, md } from 'gen'

// HTML/JSX templates with proper highlighting
const componentTemplate = html`
  <div className="user-card">
    <h2>{user.name}</h2>
    <p>{user.email}</p>
    <button onClick={handleEdit}>Edit</button>
  </div>
`

// CSS templates with highlighting
const stylesTemplate = css`
  .user-card {
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 1rem;
  }

  .user-card h2 {
    color: #333;
    margin-bottom: 0.5rem;
  }
`

// SQL templates with highlighting
const queryTemplate = sql`
  SELECT u.id, u.name, u.email, p.title as role
  FROM users u
  LEFT JOIN user_permissions p ON u.id = p.user_id
  WHERE u.active = true
  ORDER BY u.created_at DESC
`

// TypeScript templates with highlighting
const typeTemplate = ts`
  export interface User {
    id: string
    name: string
    email: string
    role: 'user' | 'admin' | 'superadmin'
    createdAt: Date
  }

  export function validateUser(user: User): boolean {
    return user.name.length > 0 && user.email.includes('@')
  }
`

// GraphQL templates with highlighting
const graphqlTemplate = gql`
  query GetUsers($limit: Int, $offset: Int) {
    users(limit: $limit, offset: $offset) {
      id
      name
      email
      role
      createdAt
    }
  }

  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      name
      email
    }
  }
`

// JSON templates with highlighting
const configTemplate = json`
  {
    "database": {
      "host": "localhost",
      "port": 5432,
      "name": "myapp"
    },
    "features": {
      "authentication": true,
      "fileUploads": false
    }
  }
`

// YAML templates with highlighting
const dockerTemplate = yaml`
  version: '3.8'
  services:
    app:
      build: .
      ports:
        - "3000:3000"
      environment:
        - NODE_ENV=production
      depends_on:
        - db

    db:
      image: postgres:13
      environment:
        POSTGRES_DB: myapp
`

// Markdown templates with highlighting
const readmeTemplate = md`
  # My Project

  This is a sample project generated with Gen.

  ## Features

  - User authentication
  - Role-based permissions
  - CRUD operations
  - Type-safe throughout

  ## Getting Started

  \`\`\`bash
  npm install
  npm run dev
  \`\`\`
`
```

### Dynamic Language Templates

For dynamic language selection, use the `code()` function:

```typescript
import { code } from 'gen'

// Generate code with specific language hints
const pythonCode = code('python')`
def calculate_fibonacci(n):
    if n <= 1:
        return n
    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)

print(calculate_fibonacci(10))
`

const rustCode = code('rust')`
fn main() {
    println!("Hello, world!");
    let x = 42;
    println!("The answer is: {}", x);
}
`
```

### Template Utilities

```typescript
import { conditional, map } from 'gen'

// Conditional template inclusion
const formTemplate = html`
  <form>
    <input type="text" name="username" required />
    ${conditional(showPassword, `<input type="password" name="password" required />`)}
    <button type="submit">Login</button>
  </form>
`

// Mapping arrays to template content
const listTemplate = html`
  <ul>
    ${map(items, (item) => `<li>${item.name} - $${item.price}</li>`)}
  </ul>
`
```
```
**File:** README.md (L475-552)
```markdown

Gen provides specialized generators for different frameworks and use cases:

### Rails-Style Routes Generator

Generate RESTful API routes similar to Ruby on Rails:

```bash
gen generate --targets=rails
```

**Features:**
- RESTful routes (index, show, create, update, destroy)
- Middleware support
- Validation integration
- Error handling
- TypeScript types

### Next.js API Routes Generator

Generate Next.js 13+ App Router API routes:

```bash
gen generate --targets=nextjs
```

**Features:**
- App Router compatible (`app/api/` structure)
- Pagination, filtering, and sorting
- Zod validation integration
- TypeScript throughout
- Server-side rendering support

### OpenAPI Documentation Generator

Generate OpenAPI 3.0 specifications for API documentation:

```bash
gen generate --targets=openapi
```

**Features:**
- Complete OpenAPI 3.0 spec
- Automatic schema generation
- Authentication support
- Pagination metadata
- Interactive API docs (with Swagger UI)

### Testing Suite Generator

Generate comprehensive test suites:

```bash
gen generate --targets=tests
```

**Generates:**
- Unit tests (service layer)
- Integration tests (API endpoints)
- E2E tests (Playwright)
- Test data factories (Faker.js)
- Mock utilities

### Deployment Configuration Generator

Generate deployment configurations for various platforms:

```bash
gen generate --targets=deployment
```

**Generates:**
- Docker Compose files
- Dockerfiles
- CI/CD pipelines (GitHub Actions)
- Environment configurations
- Nginx configurations
- Kubernetes manifests
```
**File:** README.md (L554-601)
```markdown
## 🔌 Plugin System

Gen supports a powerful plugin architecture that allows you to extend functionality with custom generators, commands, and integrations.

### Installing Plugins

```bash
# Install a plugin
gen plugin install gen-plugin-react

# Install globally
gen plugin install --global gen-plugin-database

# List installed plugins
gen plugin list
```

### Creating Plugins

```bash
# Create a new plugin
gen plugin create my-plugin --template=generator

# Create a command plugin
gen plugin create my-command --template=command
```

### Plugin API

```typescript
// plugin/index.ts
export default {
  name: 'my-plugin',
  version: '1.0.0',
  generators: {
    myGenerator: async (args) => {
      // Custom generation logic
    }
  },
  commands: {
    myCommand: createCommand('my-command')
      .description('My custom command')
      .action(() => {
        // Command logic
      })
  }
}
```
```
**File:** README.md (L606-614)
```markdown

```bash
gen init [project-name]     # Initialize a new project
gen generate [targets...]   # Generate code from entities
gen plugin <command>        # Manage plugins
gen config <command>        # Manage configuration
gen --help                  # Show help
gen --version               # Show version
```
```
**File:** README.md (L616-708)
```markdown
### Basic Commands

```bash
# Initialize a new project
gen init my-project
gen init --template=convex

# Generate all targets
gen generate

# Generate specific targets
gen generate --targets=database,api,frontend

# Generate Convex-specific code
gen generate --targets=convex,crud,forms

# Generate Rails-style routes
gen generate --targets=rails

# Generate Next.js API routes
gen generate --targets=nextjs

# Generate OpenAPI documentation
gen generate --targets=openapi

# Generate deployment configs
gen generate --targets=deployment

# Dry run (preview changes)
gen generate --dry-run

# Backup existing files
gen generate --backup

# Incremental generation (skip existing)
gen generate --incremental

# Verbose logging
gen --verbose
```

### Target Options

```bash
# Database targets
gen --targets=drizzle,prisma,sql,convex

# API targets
gen --targets=express,fastify,hono,koa

# Frontend targets
gen --targets=react,vue,svelte

# New comprehensive targets
gen --targets=crud        # Complete CRUD routes with TanStack Router
gen --targets=convex      # Convex functions (queries & mutations)
gen --targets=forms       # TanStack Form components
```

### Configuration Options

```bash
# Use custom config file
gen --config=./my-config.js

# Use custom generator script
gen --generatorScript=./custom-generators.js

# Specify output paths
gen --output=./generated

# Generate only specific tables
gen --tables=users,products

# Force overwrite without prompts
gen --force
```

### Advanced Options

```bash
# API-specific options
gen --api-framework=express --api-base-path=/api/v2 --include-openapi

# Database-specific options
gen --db-targets=drizzle,prisma --include-migrations

# Frontend-specific options
gen --frontend-framework=react --include-forms --include-tables

# Testing options
gen --include-unit-tests --include-integration-tests --test-framework=vitest
```
```
**File:** README.md (L710-759)
```markdown
## ⚙️ Configuration

### Custom Generators

Create custom generator scripts to extend or replace built-in generators:

```javascript
// custom-generators.js
export async function generateDatabase(entities, config) {
  // Your custom database generation logic
  return ok(undefined)
}

export async function generateAPI(entities, config) {
  // Your custom API generation logic
  return ok(undefined)
}

export async function generateFrontend(entities, config) {
  // Your custom frontend generation logic
  return ok(undefined)
}
```

### Field Mappings Configuration

Customize field behavior with smart defaults and overrides:

```typescript
// field-mappings.config.ts
export const fieldNamePatterns = {
  email: {
    inputComponent: 'EmailField',
    validation: validators.email,
  },
  price: {
    inputComponent: 'CurrencyField',
    validation: validators.numberMin(0),
  },
}

export const tableFieldOverrides = {
  products: {
    description: {
      inputComponent: 'RichTextEditor',
      displayComponent: 'MarkdownViewer',
    },
  },
}
```
```
**File:** src/index.ts (L1-40)
```typescript
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
```
**File:** src/index.ts (L235-267)
```typescript
// ===== Utils =====
export {
  getFieldNames,
  getSortableFields,
  getFilterableFields,
  getEditableFields,
  getRequiredFields,
  getOptionalFields,
  getDefaultValues,
  validateEntity,
  entityToTypeScript,
  entityToJsonSchema,
  getPrimaryKeyFields,
  getUniqueFields,
  getIndexedFields,
  hasFieldPermission,
  getVisibleFields,
  sanitizeEntity,
  camelToSnake,
  snakeToCamel,
  pascalToCamel,
  camelToPascal,
  pluralize,
  singularize,
  deepClone,
  deepMerge,
  generateId,
  debounce,
  throttle,
  isEmpty,
  getNestedProperty,
  setNestedProperty,
} from './utils'
```
**File:** src/entity.ts (L260-434)
```typescript
/**
 * Complete Entity definition - Single source of truth for your application
 */
export type Entity<
  T,
  C extends ComponentType = ComponentType,
  R extends ComponentType = ComponentType,
  E extends Record<string, any> = Record<string, any>
> = {
  // ===== Identity & Metadata =====
  id: string
  name: NameConfig
  version: number
  createdAt: Date
  updatedAt?: Date
  description?: string
  tags?: string[]
  category?: string
  icon?: string
  color?: string

  // ===== UI Components (actual functions, not strings!) =====
  components?: {
    display?: ComponentRef | DisplayComponentConfig
    input?: ComponentRef | InputComponentConfig
    loading?: ComponentRef | ComponentWithProps
    empty?: ComponentRef | ComponentWithProps
    error?: ComponentRef | ComponentWithProps
  }

  // ===== Database Schema =====
  db: {
    table: DbTable
    columns: {
      [K in keyof T]: DbColumn<T[K]>
    }
    indexes?: DbIndex[]
    constraints?: DbConstraint[]
  }

  // ===== Fields Configuration =====
  fields: {
    [K in keyof T]: FieldMapping<T[K], C>
  }

  // ===== Relationships =====
  relationships?: Record<string, RelationshipMapping<T, any, C>>

  // ===== Routes =====
  routes?: RoutesConfig<T, C, R>

  // ===== Tables/Lists =====
  tables?: TableFieldConfig<T, C>[]

  // ===== Mutations (with audit trail & versioning) =====
  mutators?: Record<string, EntityMutator<T, any>>
  mutationHistory?: MutationHistory<T>[]

   // ===== Standard CRUD operations (auto-generated) =====
   crud?: {
     createOne: EntityMutator<T, Partial<T>>
     createMany: EntityMutator<T[], Partial<T>[]>
     readOne: EntityMutator<T | null, string>
     readMany: EntityMutator<T[], Partial<T> | undefined>
     updateOne: EntityMutator<T, {id: string, data: Partial<T>}>
     updateMany: EntityMutator<T[], {filter: Partial<T>, data: Partial<T>}>
     deleteOne: EntityMutator<void, string>
     deleteMany: EntityMutator<{count: number}, Partial<T>>
     softDelete?: EntityMutator<T, string>
     restore?: EntityMutator<T, string>
   }

   // ===== Relationship CRUD operations =====
   relations?: {
     [relationName: string]: {
       create?: EntityMutator<any, any>
       read?: EntityMutator<any, any>
       update?: EntityMutator<any, any>
       delete?: EntityMutator<any, any>
     }
   }

  // ===== Comprehensive Permissions =====
  permissions?: EntityPermissions

  // ===== Validation =====
  schema?: StandardSchema<T>

  // ===== Lifecycle Hooks =====
  hooks?: {
    beforeCreate?: (data: Partial<T>, ctx: MutationContext) => Promise<void>
    afterCreate?: (data: T, ctx: MutationContext) => Promise<void>
    beforeUpdate?: (id: string, data: Partial<T>, ctx: MutationContext) => Promise<void>
    afterUpdate?: (data: T, ctx: MutationContext) => Promise<void>
    beforeDelete?: (id: string, ctx: MutationContext) => Promise<void>
    afterDelete?: (id: string, ctx: MutationContext) => Promise<void>
  }

  // Alias for hooks for backwards compatibility
  lifecycle?: {
    beforeCreate?: (data: Partial<T>, ctx: MutationContext) => Promise<void>
    afterCreate?: (data: T, ctx: MutationContext) => Promise<void>
    beforeUpdate?: (id: string, data: Partial<T>, ctx: MutationContext) => Promise<void>
    afterUpdate?: (data: T, ctx: MutationContext) => Promise<void>
    beforeDelete?: (id: string, ctx: MutationContext) => Promise<void>
    afterDelete?: (id: string, ctx: MutationContext) => Promise<void>
  }

  // ===== Computed Fields =====
  computed?: {
  [key: string]: {
  compute: (entity: T) => any
  dependencies: Array<keyof T>
  cached?: boolean
  ttl?: number
  }
  }

  // ===== Sync Configuration =====
  sync?: SyncConfig<T>
  getKey?: (item: T) => string | number
  rowUpdateMode?: 'partial' | 'full'

  // ===== Error Configuration =====
  errors?: EntityErrorConfig

  // ===== Code Generation Configuration =====
  // API generation
  generateAPI?: boolean
  apiBasePath?: string
  openapi?: {
    tags?: string[]
    summary?: string
    description?: string
  }

  // GraphQL generation
  generateGraphQL?: boolean
  graphql?: {
    type?: 'type' | 'input' | 'interface'
    implements?: string[]
    directives?: string[]
  }

  // Frontend generation
  generateComponents?: boolean
  componentPath?: string
  formLayout?: 'vertical' | 'horizontal' | 'inline'

  // Database generation
  generateMigrations?: boolean
  migrationStrategy?: 'incremental' | 'snapshot'

  // Serialization
  serializeAs?: 'json' | 'xml' | 'csv'
  excludeFields?: string[]
  includeFields?: string[]

  // Search/Indexing
  searchableFields?: string[]
  indexedFields?: string[]

  // Audit/Logging
  auditChanges?: boolean
  logLevel?: 'debug' | 'info' | 'warn' | 'error'

  // Caching
  cacheStrategy?: 'none' | 'memory' | 'redis' | 'filesystem'
  cacheTTL?: number

  // ===== Deprecated/Migration =====
  deprecated?: boolean
  replacedBy?: string
  migrationPath?: string
} & E
```
**File:** src/components.ts (L1-100)
```typescript
/**
 * Component Registry System
 * Works with any UI library (React, Vue, Svelte, etc.)
 */

// Global type declarations - augment this with your UI library components
export {};

declare global {
  interface ComponentType {
    (...args: any[]): any
  }

  /**
   * UI Components - User registers their actual component functions here
   * Works with any UI library (React, Vue, Svelte, etc.)
   */
  interface UIComponents {
    // Form components
    TextField: ComponentType
    NumberField: ComponentType
    Checkbox: ComponentType
    TextArea: ComponentType
    Select: ComponentType
    DatePicker: ComponentType
    FilePicker: ComponentType
    RichTextEditor: ComponentType
    ColorPicker: ComponentType
    RadioGroup: ComponentType

    // Display components
    Text: ComponentType
    Number: ComponentType
    Currency: ComponentType
    Badge: ComponentType
    CompletedBadge: ComponentType
    DateTime: ComponentType
    Link: ComponentType
    Email: ComponentType
    Image: ComponentType
    Avatar: ComponentType
    List: ComponentType

    // Layout components
    Card: ComponentType
    Table: ComponentType
    Grid: ComponentType
    Stack: ComponentType

    // Route/Page components
    Page: ComponentType
    DetailView: ComponentType
    ListView: ComponentType
    FormView: ComponentType
  }

  /**
   * User can extend with custom components
   */
  interface CustomComponents {
    [key: string]: ComponentType
  }

  /**
   * All available components (UI + Custom)
   */
  type AllComponents = UIComponents & CustomComponents
}

/**
 * Type-safe component reference (no strings!)
 */
export type ComponentRef<K extends keyof AllComponents = keyof AllComponents> = AllComponents[K]

/**
 * Component with props
 */
export interface ComponentWithProps<C extends ComponentType = ComponentType, P extends unknown = Parameters<C>[0]> {
  component: C;
  props: P;
}

/**
 * Component Registry - Register UI library components once, use everywhere
 *
 * @example
 * // Register your UI library components
 * ComponentRegistry.registerBulk({
 *   TextField: MyUILib.TextField,
 *   NumberField: MyUILib.NumberField,
 *   // ... etc
 * })
 *
 * // Later, retrieve components
 * const TextField = ComponentRegistry.get('TextField')
 */
export class ComponentRegistry {
  private static components = new Map<string, ComponentType>()

  /**
```
**File:** src/database.ts (L1-99)
```typescript
/**
 * Database Type System - Works with any database
 * Flexible types that can generate schemas for Drizzle, Prisma, SQL, Convex, etc.
 */

/**
 * Database column type - flexible and extensible for any database
 */
export interface DbColumnType<T = any> {
  typeName: string // e.g., 'varchar', 'integer', 'timestamp'
  typeParams?: any[] // e.g., [255] for varchar(255)
  serialize: (value: T) => any
  deserialize: (value: any) => T
  validate?: (value: T) => boolean

  // Schema generation for different ORMs/databases
  toDrizzle?: (columnName?: string) => string
  toPrisma?: (columnName?: string) => string
  toSQL?: (columnName?: string, dialect?: 'postgres' | 'mysql' | 'sqlite') => string
  toConvex?: (columnName?: string) => string
}

/**
 * Database column definition
 */
export interface DbColumn<T = any> {
  type: DbColumnType<T>
  nullable?: boolean
  default?: T | (() => T)
  unique?: boolean
  indexed?: boolean
  primary?: boolean
  autoIncrement?: boolean
  generated?: 'always' | 'by-default'
  generatedAs?: string // SQL expression
  comment?: string
}

/**
 * Database table definition
 */
export interface DbTable {
  name: string
  columns: Map<string, DbColumn>
  primaryKey: string[]
  uniqueConstraints?: string[][]
  checkConstraints?: Array<{name: string, expression: string}>
  comment?: string
}

/**
 * Database index
 */
export interface DbIndex {
  name: string
  tableName: string
  columns: string[]
  unique?: boolean
  where?: string
  type?: 'btree' | 'hash' | 'gist' | 'gin'
}

/**
 * Database constraint
 */
export interface DbConstraint {
  name: string
  tableName: string
  type: 'check' | 'foreign-key' | 'unique' | 'primary-key'
  definition: string
}

/**
 * Database relationship (foreign key)
 */
export interface DbRelationship {
  name: string
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'
  fromTable: string
  toTable: string
  fromColumn: string
  toColumn: string
  onDelete?: 'cascade' | 'set-null' | 'restrict' | 'no-action'
  onUpdate?: 'cascade' | 'set-null' | 'restrict' | 'no-action'
  // For many-to-many
  junctionTable?: string
  junctionFromColumn?: string
  junctionToColumn?: string
}

/**
 * Complete database schema
 */
export interface DbSchema {
  tables: Map<string, DbTable>
  relationships: DbRelationship[]
  indexes: DbIndex[]
  constraints: DbConstraint[]
}
```
**File:** src/database.ts (L117-150)
```typescript
/**
 * Adds modifier methods to a column type
 */
function withModifiers<T>(base: DbColumnType<T>): DbColumnTypeWithModifiers<T> {
  const enhanced = base as DbColumnTypeWithModifiers<T>
  enhanced._modifiers = {}

  enhanced.nullable = () => {
    const result = { ...enhanced, _modifiers: { ...enhanced._modifiers, nullable: true } }
    result.serialize = (v: any) => v === null ? null : base.serialize(v)
    result.deserialize = (v: any) => v === null ? null : base.deserialize(v)
    return withModifiers(result as DbColumnType<T | null>) as DbColumnTypeWithModifiers<T | null>
  }

  enhanced.default = (value: T | (() => T)) => {
    const result = { ...enhanced, _modifiers: { ...enhanced._modifiers, default: value } }
    const originalToDrizzle = result.toDrizzle
    if (originalToDrizzle) {
      result.toDrizzle = (col) => {
        const base = originalToDrizzle(col)
        const defaultValue = typeof value === 'function' ? '...' : JSON.stringify(value)
        return `${base}.default(${defaultValue})`
      }
    }
    return withModifiers(result as DbColumnType<T>) as DbColumnTypeWithModifiers<T>
  }

  enhanced.defaultNow = () => {
    const result = { ...enhanced, _modifiers: { ...enhanced._modifiers, defaultNow: true } }
    const originalToDrizzle = result.toDrizzle
    if (originalToDrizzle) {
      result.toDrizzle = (col) => `${originalToDrizzle(col)}.default(sql\`now()\`)`
    }
    return withModifiers(result as DbColumnType<T>) as DbColumnTypeWithModifiers<T>
```
**File:** src/permissions.ts (L1-100)
```typescript
/**
 * Comprehensive Permission System
 * Multi-level access control: role-based, ownership-based, organization-based,
 * attribute-based, temporal, field-level, and conditional permissions
 */

/**
 * User information for permission checks
 */
export interface User {
  id: string
  role?: string // Single role for simple cases
  roles?: string[] // Multiple roles
  organizationId?: string
  attributes?: Record<string, any>
}

// Helper to get user roles array
function getUserRoles(user: User): string[] {
  if (user.roles) return user.roles
  if (user.role) return [user.role]
  return []
}

/**
 * Basic permission configuration
 */
export interface PermissionConfig {
  // Role-based permissions
  roles?: {
    read?: string[]
    write?: string[]
    create?: string[]
    update?: string[]
    delete?: string[]
    admin?: string[]
  }

  // Ownership-based permissions
  ownership?: {
    required: boolean
    ownerField: string // Field that contains owner ID (e.g., 'userId', 'createdBy')
    allowTransfer?: boolean
    transferRequiresApproval?: boolean
    transferApprovers?: string[] // Roles that can approve transfer
  }

  // Organization-based permissions
  organization?: {
    required: boolean
    orgField: string // Field that contains organization ID
    allowCrossOrg?: boolean
    crossOrgRoles?: string[] // Roles that can access cross-org
  }

  // Attribute-based access control (ABAC)
  attributes?: Array<{
    name: string
    operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'neq' | 'in' | 'nin' | 'custom'
    value: any
    customCheck?: (user: User, resource: any) => boolean
  }>

  // Time-based permissions
  temporal?: {
    validFrom?: Date
    validUntil?: Date
    schedule?: {
      daysOfWeek?: number[] // 0-6 (Sunday-Saturday)
      hoursOfDay?: [number, number] // [start, end] in 24-hour format
      timezone?: string
    }
  }

  // Field-level (cell-level) permissions
  fieldPermissions?: {
    [fieldName: string]: {
      read?: string[]
      write?: string[]
      mask?: boolean // Mask sensitive data
      maskFn?: (value: any) => any // Custom masking function
      maskChar?: string // Character to use for masking (default: '*')
    }
  }

  // Conditional permissions
  conditions?: Array<{
    when: (user: User, resource: any, context: any) => boolean
    then: Partial<PermissionConfig>
    else?: Partial<PermissionConfig>
  }>

  // Custom permission check
  custom?: (user: User, resource: any, action: string, context: any) => Promise<boolean> | boolean
}

/**
 * Entity-level permissions
 */
export interface EntityPermissions {
```
**File:** src/mutations.ts (L1-100)
```typescript
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
```
**File:** src/validators.ts (L1-100)
```typescript
/**
 * Validation System
 * StandardSchema-compliant validators using Zod
 */

import { z } from 'zod'

// StandardSchema type (Zod 3.24+ implements this via ~standard property)
// Using Zod's built-in schema type which is StandardSchema compliant
export type StandardSchema<T = any> = z.ZodType<T>

/**
 * Validator types - wraps StandardSchema for type safety
 */
export type Validator<T> = StandardSchema<T>
export type AsyncValidator<T> = StandardSchema<T>

/**
 * Validation result from StandardSchema
 */
export interface ValidationResult {
  value?: unknown
  issues?: Array<{
    message: string
    path?: (string | number)[]
    code?: string
  }>
}

// Create enhanced string validator with additional methods
const stringSchema = z.string()
const stringValidator = Object.assign(
  () => z.string(),
  {
    parse: stringSchema.parse.bind(stringSchema),
    safeParse: stringSchema.safeParse.bind(stringSchema),
    optional: () => z.string().optional(),
    nullable: () => z.string().nullable(),
    nullish: () => z.string().nullish(),
    regex: (pattern: RegExp, message?: string) =>
      z.string().regex(pattern, message || 'Invalid format'),
    email: (message?: string) =>
      z.string().email(message || 'Invalid email address'),
    url: (message?: string) =>
      z.string().url(message || 'Invalid URL'),
    uuid: (message?: string) =>
      z.string().uuid(message || 'Invalid UUID'),
    min: (min: number, message?: string) =>
      z.string().min(min, message || `Must be at least ${min} characters`),
    max: (max: number, message?: string) =>
      z.string().max(max, message || `Must be at most ${max} characters`),
    refine: (refinement: (val: string) => boolean | Promise<boolean>, message?: string) =>
      z.string().refine(refinement, message),
    transform: (transform: (val: string) => any) =>
      z.string().transform(transform),
    default: (value: string | (() => string)) =>
      z.string().default(value),
  }
)

/**
 * Standard Schema validators using Zod
 */
export const validators = {
  // String validators (can be used as both static schema and factory function)
  string: stringValidator as StandardSchema<string> & (() => StandardSchema<string>),
  email: z.string().email('Invalid email address') as StandardSchema<string>,
  url: z.string().url('Invalid URL') as StandardSchema<string>,
  uuid: z.string().uuid() as StandardSchema<string>,

  // String with constraints
  stringMin: (min: number, message?: string) =>
    z.string().min(min, message || `Must be at least ${min} characters`) as StandardSchema<string>,
  stringMax: (max: number, message?: string) =>
    z.string().max(max, message || `Must be at most ${max} characters`) as StandardSchema<string>,
  stringLength: (min: number, max: number) =>
    z.string().min(min).max(max) as StandardSchema<string>,

  // Number validators
  number: z.number() as StandardSchema<number>,
  positiveNumber: z.number().positive('Must be positive') as StandardSchema<number>,
  nonNegativeNumber: z.number().nonnegative('Must be non-negative') as StandardSchema<number>,
  integer: z.number().int('Must be an integer') as StandardSchema<number>,

  // Number with constraints
  numberMin: (min: number) => z.number().min(min) as StandardSchema<number>,
  numberMax: (max: number) => z.number().max(max) as StandardSchema<number>,
  numberRange: (min: number, max: number) => z.number().min(min).max(max) as StandardSchema<number>,

  // Boolean
  boolean: z.boolean() as StandardSchema<boolean>,

  // Arrays
  stringArray: z.array(z.string()) as StandardSchema<string[]>,
  numberArray: z.array(z.number()) as StandardSchema<number[]>,
  array: <T extends z.ZodType>(schema: T) =>
    z.array(schema) as StandardSchema<z.infer<T>[]>,
  arrayMin: <T extends z.ZodType>(schema: T, min: number) =>
    z.array(schema).min(min) as StandardSchema<z.infer<T>[]>,

```
**File:** ERROR_SYSTEM.md (L1-88)
```markdown
# Error System Documentation

## Overview

The Gen library includes a comprehensive, type-safe error system designed to provide consistent error handling across the entire mapping and code generation ecosystem. Unlike traditional error systems that impose specific patterns, this system is **opinion-free** and **extensible**, allowing users to integrate their own error classes while providing sensible defaults.

## Key Features

- 🔒 **100% Type-Safe** - No magic strings, full TypeScript inference
- 🔧 **Opinion-Free** - Works with throwing OR returning errors (Result types)
- 📚 **Comprehensive Catalog** - 25+ predefined errors with recovery suggestions
- 🛠️ **Extensible Registry** - Register your own error classes
- 🔄 **Seamless Integration** - Works with entities, generators, and runtime
- ⚡ **Performance Optimized** - Efficient error creation and handling
- 🎯 **Flexible Paradigms** - Supports both exception-based and functional error handling

## Quick Start

```typescript
import { errors, ErrorRegistry } from 'gen'

// Create errors using type-safe factories
const validationError = errors.validation('INVALID_EMAIL', 'Invalid email format')

// Register custom error classes
ErrorRegistry.registerBulk({
  MyAppError: class extends Error implements ErrorBase {
    code = 'MY_APP_ERROR'
    context?: Record<string, any>
    timestamp = Date.now()
  }
})

// Use registered errors
const customError = ErrorRegistry.create('MyAppError', 'Something went wrong')
```

## Core Concepts

### Error Handling Approaches

The error system supports multiple error handling paradigms - **you choose** how to handle errors:

#### 🎯 **Exception-Based (Throwing)**
```typescript
// Traditional approach - throw errors
function validateUser(user: User) {
  if (!user.email) {
    throw errors.validation('VALIDATION_MISSING_REQUIRED', 'Email is required', { field: 'email' })
  }
  return user
}

try {
  const user = validateUser(input)
} catch (error) {
  // Handle error
}
```

#### 📦 **Errors as Values (Returning)**
```typescript
// Functional approach - return Result types
import { Result, ok, err } from 'neverthrow'

function validateUser(user: User): Result<User, ErrorBase> {
  if (!user.email) {
    return err(errors.validation('VALIDATION_MISSING_REQUIRED', 'Email is required', { field: 'email' }))
  }
  return ok(user)
}

const result = validateUser(input)
if (result.isErr()) {
  // Handle error
  console.error(result.error)
} else {
  // Use valid data
  console.log(result.value)
}
```

#### 🔄 **Generator Choice**
**Generators decide the error handling style** for generated code:
- **API Generators** might prefer throwing for Express middleware
- **Frontend Generators** might prefer Result types for React hooks
- **Database Generators** might use both depending on the ORM

```
**File:** ERROR_SYSTEM.md (L519-618)
```markdown

### 1. Choose Error Handling Approach

**Consider your context when choosing between throwing and returning errors:**

```typescript
// ✅ Throwing - Good for APIs and synchronous operations
function validateUser(user: User) {
  if (!user.email) {
    throw errors.validation('VALIDATION_MISSING_REQUIRED', 'Email required')
  }
}

// ✅ Returning - Good for functional programming and async operations
function validateUser(user: User): Result<User, ErrorBase> {
  if (!user.email) {
    return err(errors.validation('VALIDATION_MISSING_REQUIRED', 'Email required'))
  }
  return ok(user)
}

// ✅ Mixed - Sometimes both approaches in the same codebase
async function createUser(data: CreateUserInput): Promise<Result<User, ErrorBase>> {
  try {
    const validatedData = validateUserSync(data) // throws
    const user = await db.users.create({ data: validatedData })
    return ok(user)
  } catch (error) {
    return err(error as ErrorBase)
  }
}
```

**Guidelines:**
- **APIs/HTTP handlers**: Prefer throwing (works with middleware)
- **Business logic**: Consider Result types for better composability
- **Data fetching**: Result types work well with React Query, SWR, etc.
- **Libraries**: Throwing is more common for libraries
- **CLI tools**: Either approach works depending on preference

### 2. Use Appropriate Error Codes

```typescript
// ✅ Good - Use specific error codes
throw errors.validation('VALIDATION_MISSING_REQUIRED', 'Email is required', {
  field: 'email'
})

// ❌ Bad - Generic error codes
throw new Error('Something went wrong')
```

### 2. Provide Rich Context

```typescript
// ✅ Good - Include relevant context
throw errors.database('CONNECTION_FAILED', 'Database connection timeout', {
  host: 'localhost',
  port: 5432,
  timeout: 5000,
  attempt: 3
})

// ❌ Bad - Missing context
throw errors.database('CONNECTION_FAILED', 'Database connection timeout')
```

### 3. Handle Errors at Appropriate Levels

```typescript
// ✅ Good - Handle known errors specifically
try {
  await saveUser(userData)
} catch (error) {
  if (errorUtils.isErrorCode(error, 'VALIDATION_DATA_INVALID')) {
    // Show validation errors to user
    showValidationErrors(error.context.fields)
  } else if (errorUtils.isErrorCategory(error, 'database')) {
    // Log and show generic error
    logError(error)
    showGenericError('Please try again later')
  } else {
    // Re-throw unknown errors
    throw error
  }
}
```

### 4. Use Error Recovery

```typescript
// ✅ Good - Implement recovery suggestions
const recoveryActions = errorUtils.getRecoveryForError(error)

for (const recovery of recoveryActions) {
  if (recovery.action === 'retry' && isRetryableOperation(operation)) {
    return await retryOperation(operation)
  }
}
```
```
**File:** src/cli/index.ts (L78-107)
```typescript
  // Load plugins
  logger.subsection('Loading plugins...')
  const pluginsResult = await loadPlugins(cliConfig.plugins)
  if (pluginsResult.isErr()) {
    logger.error('Failed to load plugins', pluginsResult.error.code, {
      error: pluginsResult.error.message
    })
    // Continue without plugins
  } else {
    const plugins = pluginsResult.value
    logger.success(`Loaded ${plugins.length} plugins`)
  }

  // Register built-in commands
  program.addCommand(createGenerateCommand())
  program.addCommand(createInitCommand())
  program.addCommand(createPluginCommand())
  program.addCommand(createConfigCommand())

  // Register plugin commands
  if (pluginsResult.isOk()) {
    for (const plugin of pluginsResult.value) {
      if (plugin.commands) {
        for (const [name, command] of Object.entries(plugin.commands)) {
          program.addCommand(command)
          logger.debug(`Registered plugin command: ${name}`)
        }
      }
    }
  }
```
**File:** package.json (L1-54)
```json
{
  "name": "gen",
  "version": "0.0.0",
  "files": [
    "dist",
    "src"
  ],
  "engines": {
    "node": ">=16"
  },
  "license": "MIT",
  "keywords": [
    "pridepack"
  ],
  "devDependencies": {
    "@types/node": "^22.10.2",
    "pridepack": "2.6.4",
    "tslib": "^2.8.1",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  },
  "scripts": {
    "prepublishOnly": "pridepack clean && pridepack build",
    "build": "pridepack build",
    "type-check": "pridepack check",
    "clean": "pridepack clean",
    "watch": "pridepack watch",
    "start": "pridepack start",
    "dev": "pridepack dev",
    "test": "vitest --run"
  },
  "private": false,
  "description": "An app data config for code gen",
  "bin": {
    "gen": "./dist/cjs/production/cli/index.js"
  },
  "repository": {
    "url": "",
    "type": "git"
  },
  "homepage": "",
  "bugs": {
    "url": ""
  },
  "author": "Patrick Glenn",
  "publishConfig": {
    "access": "public"
  },
  "dependencies": {
    "neverthrow": "^8.2.0",
    "pluralize": "^8.0.0",
    "zod": "^4.1.12",
    "commander": "^12.0.0"
  },
```
**File:** package.json (L55-68)
```json
  "types": "./dist/types/index.d.ts",
  "main": "./dist/cjs/production/index.js",
  "module": "./dist/esm/production/index.js",
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "development": {
        "require": "./dist/cjs/development/index.js",
        "import": "./dist/esm/development/index.js"
      },
      "require": "./dist/cjs/production/index.js",
      "import": "./dist/esm/production/index.js"
    }
  },
```


# Gen Skill (End-User)

This skill is for **using Gen in your app**, not for developing Gen internals.

## When To Use

- You want to define entities once and generate code for database/API/frontend.
- You need CRUD/forms/tables/openapi/deployment scaffolding.
- You want to add Better Auth integrations (`convex-auth`, `spacetime-auth`).
- You want to use external generators/plugins from npm or GitHub.

## Core Commands

```bash
@doeixd/gen init my-project
@doeixd/gen generate
@doeixd/gen generate --targets=database,api,frontend
@doeixd/gen generate --targets=convex-auth
@doeixd/gen generate --targets=spacetime-auth
@doeixd/gen generate --targets=zero-auth
@doeixd/gen generate --dry-run
@doeixd/gen generate --plan
@doeixd/gen generate --json
@doeixd/gen generate --interactive
@doeixd/gen doctor
```

## Target Cheat Sheet

- `database`
- `api`
- `frontend`
- `crud`
- `convex`
- `convex-auth`
- `spacetime-auth`
- `zero-auth`
- `forms`
- `tables`
- `rails`
- `nextjs`
- `openapi`
- `tests`
- `docs`
- `deployment`

## Auth Integration Modes

For auth integration targets, use mode flags:

```bash
@doeixd/gen generate convex-auth --convex-auth-mode patch
@doeixd/gen generate spacetime-auth --spacetime-auth-mode patch
```

- `scaffold` (default): writes full files.
- `patch`: keeps existing app files and emits mergeable `*.patch.*` files where relevant.

## External Generators and Plugins

Yes, external generators are supported.

### Option A: Generator Script

```bash
npm install -D github:your-org/gen-plugin-foo
@doeixd/gen generate --generator-script ./node_modules/gen-plugin-foo/dist/index.js
```

### Option B: Plugin Install

```bash
npm install -D gen-plugin-foo
@doeixd/gen plugin install gen-plugin-foo
@doeixd/gen plugin list
```

Starter template for publishing your own plugin: `examples/plugin-starter`.

Expected custom generator exports:

- `generateDatabase(args)`
- `generateAPI(args)`
- `generateFrontend(args)`
- `generateTests(args)`
- `generateDocumentation(args)`

Each function receives a single `GeneratorArgs` object.

## Recommended Workflow

1. Run `--dry-run` first.
2. Generate only needed targets.
3. Prefer patch mode for existing projects with custom app code.
4. Commit generated outputs in small chunks by target.
5. Re-run generation after entity/config updates to keep code in sync.
6. Run `@doeixd/gen doctor` to catch dependency and patch-merge issues.

## Validation Commands (for generator-heavy changes)

```bash
npm run test:generators
npm run test:golden
npm run verify:generators
```

## References

- External plugin authoring: `docs/plugin-authoring.md`
- Starter plugin package: `examples/plugin-starter`
- Main usage guide: `README.md`
