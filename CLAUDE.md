# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **mapping system** and **code generator** that serves as a single source of truth for application configuration. It enables defining entities once and generating database schemas, API routes, and frontend components for multiple targets (Drizzle, Prisma, SQL, Convex, React, Vue, etc.).

The system is UI-framework-agnostic and database-agnostic, using a component registry pattern and flexible type system.

## Development Commands

```bash
# Build the project
npm run build

# Type checking
npm run type-check

# Run tests
npm test

# Development mode (watch mode)
npm run dev

# Clean build artifacts
npm run clean

# CLI commands
npm run gen -- --help           # Show CLI help
npm run gen -- init my-project  # Initialize new project
npm run gen -- generate         # Generate code
```

This project uses **Pridepack** as the build tool, which handles TypeScript compilation, bundling, and development workflows.

## CLI Architecture

The CLI has been significantly enhanced with:

### 1. Multi-Command System (`src/cli/`)
- **`index.ts`** - Main CLI entry point with plugin loading
- **`commands/`** - Individual command implementations
  - `generate.ts` - Code generation with custom generators
  - `init.ts` - Project initialization
  - `plugin.ts` - Plugin management
  - `config.ts` - Configuration management
- **`plugins/`** - Plugin loading and management system

### 2. Plugin Architecture
- **Extensible command system** - Add custom commands via plugins
- **Custom generators** - Override or extend built-in generators
- **Hook system** - Pre/post generation hooks
- **NPM integration** - Install plugins from npm registry

### 3. Enhanced Features
- **Project templates** - Multiple starter templates (basic, convex, express, fullstack)
- **Preset configurations** - Reusable configuration presets
- **Advanced CLI options** - Watch mode, incremental generation, custom output paths
- **Plugin marketplace** - Ecosystem of community plugins

## Core Architecture

### 1. Entity Definition System

The central concept is the `Entity<T>` type, which combines:
- **Database schema** (tables, columns, indexes, constraints)
- **UI components** (display, input, loading, empty states)
- **Permissions** (role-based, ownership, organization, attribute-based, temporal, field-level)
- **Mutations** (versioned, audited operations with history tracking)
- **Validation** (StandardSchema-compatible validators)
- **Relationships** (one-to-one, one-to-many, many-to-many with full DB details)
- **Routes** (API and frontend route configurations)
- **Lifecycle hooks** (before/after create, update, delete)

### 2. Component Registry (`src/components.ts`)

The `ComponentRegistry` class allows registration of UI library components (React, Vue, Svelte, etc.) that are referenced throughout entity definitions. Components are actual function references, not strings.

Users register their UI components once:
```typescript
ComponentRegistry.registerBulk({
  TextField: MyUILib.TextField,
  NumberField: MyUILib.NumberField,
  // etc.
})
```

### 3. Database Abstraction (`src/database.ts`)

The `DbColumnType` interface provides a flexible type system that can serialize/deserialize values and generate schema code for multiple targets:
- `toDrizzle()` - Generate Drizzle ORM schema
- `toPrisma()` - Generate Prisma schema
- `toSQL()` - Generate raw SQL (Postgres, MySQL, SQLite)
- `toConvex()` - Generate Convex schema

The `dbTypes` export provides factory functions for common column types.

### 4. Permission System (`src/permissions.ts`)

Multi-level permission system supporting:
- **Role-based**: Different permissions per role (read, write, create, update, delete, admin)
- **Ownership**: Require ownership checks with configurable owner fields
- **Organization**: Scope access by organization with cross-org support
- **Attribute-based (ABAC)**: Custom attribute checks with operators
- **Temporal**: Time-based and schedule-based permissions
- **Field-level**: Per-field read/write permissions with data masking
- **Conditional**: Dynamic permissions based on context

The `PermissionEngine` class evaluates all permission types.

### 5. Mutation System (`src/mutations.ts`)

All data changes go through **named, versioned mutators** with:
- Full audit trail (who, when, what changed)
- Input/output validation (StandardSchema)
- Rollback support
- Lifecycle hooks (beforeMutate, afterMutate, onSuccess, onError)
- Permission checks
- Optional approval workflows

The `MutatorFactory` creates standard CRUD mutators automatically.

### 6. Code Generators (`src/generators/`)

Three generator classes that transform entity definitions into code:

- **`DatabaseGenerator`** (`src/generators/database.ts`): Generates database schemas for Drizzle, Prisma, SQL, Convex
- **`APIGenerator`** (`src/generators/api.ts`): Generates Express routes, controllers, middleware, validators, OpenAPI specs
- **`FrontendGenerator`** (`src/generators/frontend.ts`): Generates React/Vue/Svelte components, forms, lists, detail views

### 7. Helper System (`src/helpers.ts`)

Provides smart defaults and configuration helpers:
- **`defaultTypeMappings`**: Maps JS types to UI components
- **`fieldNamePatterns`**: Auto-configures fields based on name (e.g., "email" → email validator + Email component)
- **`tableFieldOverrides`**: Per-table field customization
- **`resolveFieldConfig()`**: Combines defaults, patterns, and overrides
- **`createEntity()`**: Creates entities with sensible defaults
- **`createRelationship()`**: Helper for defining relationships

### 8. Tagged Template System (`src/tags.ts`)

Provides specialized tagged template functions for enhanced syntax highlighting and better developer experience:

- **`html()`**: For HTML/JSX content with proper syntax highlighting
- **`css()`**: For CSS content with highlighting
- **`ts()`**: For TypeScript/JavaScript code
- **`sql()`**: For SQL queries with highlighting
- **`gql()`**: For GraphQL queries and mutations
- **`json()`**: For JSON data with highlighting
- **`yaml()`**: For YAML configuration files
- **`md()`**: For Markdown documentation
- **`code(language)`**: Dynamic language-specific templates
- **`conditional(condition, content)`**: Helper for conditional template inclusion
- **`map(items, mapper)`**: Helper for mapping arrays to template content

**Usage Example:**
```typescript
import { html, sql, conditional, map } from './tags'

// HTML template with proper highlighting
const component = html`
  <div className="user-list">
    <h1>Users</h1>
    ${conditional(showFilters, `<div className="filters">...</div>`)}
    <ul>
      ${map(users, user => `<li>${user.name}</li>`)}
    </ul>
  </div>
`

// SQL template with highlighting
const query = sql`
  SELECT * FROM users WHERE active = true ORDER BY created_at DESC
`
```

**VS Code Extension:** Install `schoero.tagged-template-syntax-highlighting` for proper syntax highlighting support.

## Key Patterns

### Creating an Entity

Use `createEntity()` from `src/helpers.ts`:

```typescript
const userEntity = createEntity({
  id: 'user',
  name: { singular: 'User', plural: 'Users' },
  db: {
    table: { name: 'users', primaryKey: ['id'], columns: new Map() },
    columns: {
      id: { type: dbTypes.id() },
      email: { type: dbTypes.string(255) },
    }
  },
  fields: {
    id: { standardSchema: validators.uuid },
    email: { standardSchema: validators.email },
  }
})
```

### Field Configuration Resolution

Field configs are resolved in this order (later overrides earlier):
1. Default type mappings (`defaultTypeMappings`)
2. Field name patterns (`fieldNamePatterns`)
3. Table-specific overrides (`tableFieldOverrides`)

Use `resolveFieldConfig()` to get the final configuration.

### Permissions

Permissions cascade from entity-level → route-level → field-level. The `PermissionEngine.check()` method evaluates all permission types and returns a detailed result.

### Validators

The `validators` object provides StandardSchema-compatible validators (Zod-based). Use `createValidator()` to create custom validators or `extractStandardSchema()` to work with existing schemas.

## File Organization

```
src/
├── cli/                    # Command-line interface
│   ├── index.ts           # Main CLI entry point
│   ├── commands/          # CLI command implementations
│   │   ├── generate.ts    # Code generation command
│   │   ├── init.ts        # Project initialization
│   │   ├── plugin.ts      # Plugin management
│   │   └── config.ts      # Configuration management
│   └── plugins/           # Plugin loading system
│       └── index.ts       # Plugin loader
├── components.ts          # Component registry system
├── database.ts            # Database type abstractions
├── entity.ts             # Core Entity type definition
├── helpers.ts            # Utilities and smart defaults
├── mutations.ts          # Mutation system with audit trail
├── permissions.ts        # Multi-level permission system
├── validators.ts         # StandardSchema validators
├── tags.ts              # Tagged template functions for syntax highlighting
├── utils/               # Utility functions
│   ├── config.ts         # Configuration management
│   ├── errors.ts         # Error handling
│   ├── file-system.ts    # File operations
│   ├── logger.ts         # Logging
│   ├── schema-parser.ts  # Schema parsing
│   └── zod-codegen.ts    # Zod code generation
├── field-mappings.config.ts  # Field mapping configuration
├── generator-interfaces.ts   # Generator interfaces
├── builders.ts          # Entity builders
├── index.ts            # Public API exports
└── generators/         # Code generators
    ├── api.ts          # API code generation
    ├── database.ts     # Database schema generation
    └── frontend.ts     # Frontend component generation
```

## Type System

The system uses extensive TypeScript generics:
- `Entity<T, C, R, E>` - T = data type, C = component type, R = route component type, E = extensions
- `FieldMapping<T, C>` - T = field value type, C = component type
- `RelationshipMapping<TLocal, TForeign, C>` - Local and foreign entity types

The global `ComponentType`, `AllComponents`, `UIComponents`, and `RoleType` types are declared globally for convenience.

## Testing

The project uses Vitest. Tests are located in `test/index.test.ts`. The current test suite is minimal - when adding features, add corresponding tests.

## Old Implementation (`old/` directory)

The `old/` directory contains a previous Convex-specific implementation that serves as reference material. This code demonstrates practical patterns for:

### Code Generation System
- **`generate-convex-functions.ts`** - Generates type-safe Convex CRUD functions (queries and mutations)
- **`generate-forms.ts`** - Creates TanStack Form components with Zod validation
- **`generate-crud.ts`** - Generates complete route-based CRUD interfaces with virtual scrolling

### Utility Modules (`old/utils/`)
- **`schema-parser.ts`** - Robust Convex schema parsing with bracket matching and nested type support
- **`zod-codegen.ts`** - Converts Zod validators to source code strings (useful for code generation)
- **`errors.ts`** - Structured error types with neverthrow integration
- **`logger.ts`** - Advanced logging with progress tracking and metrics
- **`file-system.ts`** - Safe file operations with backup and recovery
- **`config.ts`** - CLI configuration management

### Configuration Pattern
- **`field-mappings.config.ts`** - Type-safe configuration for field mappings showing:
  - Default type mappings (string → TextField, number → NumberField, etc.)
  - Field name pattern matching (email → email validator, price → currency display)
  - Table-specific overrides per entity
  - Permission configurations (role-based, ownership, organization)
  - Real Zod validator instances (not strings!)

### Key Patterns from old/

1. **Three-Stage Generation**: The old system uses a three-stage process:
   - Generate backend CRUD functions (Convex)
   - Generate form components with validation
   - Generate full CRUD routes with views

2. **Error Handling**: Uses neverthrow's `Result<T, E>` pattern throughout for type-safe error handling

3. **Smart Field Detection**: Combines type mappings + name patterns + table overrides to resolve field configurations

4. **CLI Options**: Supports `--dry-run`, `--backup`, `--verbose`, `--incremental`, `--tables`, `--force`

5. **Template Generation**: Uses tagged template functions with syntax highlighting support for code generation

### Using old/ as Reference

When extending the current system:
- Reference `old/utils/schema-parser.ts` for parsing complex type definitions
- Reference `old/utils/zod-codegen.ts` for converting validators to code
- Reference `old/field-mappings.config.ts` for configuration patterns
- Reference generator files for code template examples

**Note**: The old/ implementation is Convex-specific, while the current system (`src/`) is database-agnostic. Adapt patterns rather than copy directly.
