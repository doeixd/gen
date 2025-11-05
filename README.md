# Gen - Single Source of Truth Code Generator

[![npm version](https://badge.fury.io/js/gen.svg)](https://badge.fury.io/js/gen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Gen** is a comprehensive code generation system that serves as a single source of truth for application configuration. Define your entities once and automatically generate database schemas, API routes, and frontend components for multiple targets including Drizzle, Prisma, SQL, Convex, React, Vue, and more.

## ✨ Features

### 🏗️ Comprehensive Entity System
- **Single Source of Truth**: Define entities with database schema, UI components, permissions, mutations, and validation in one place
- **Type-Safe Throughout**: Full TypeScript support from entity definition to generated code
- **Component Registry**: UI-framework-agnostic system supporting React, Vue, Svelte, and custom components

### 🎯 Multi-Target Code Generation
- **Database Support**: Generate schemas for Drizzle ORM, Prisma, raw SQL (Postgres/MySQL/SQLite), and Convex
- **API Generation**: Create Express, Fastify, Hono, or Koa routes with validation, middleware, and OpenAPI specs
- **Frontend Components**: Generate React/Vue/Svelte components, forms, lists, and detail views

### 🔐 Advanced Permission System
- **Role-Based Access**: Different permissions per user role (read, write, create, update, delete, admin)
- **Ownership Controls**: Require ownership checks with configurable owner fields
- **Organization Scoping**: Scope access by organization with cross-org support
- **Attribute-Based Access**: Custom attribute checks with operators
- **Temporal Permissions**: Time-based and schedule-based access controls
- **Field-Level Security**: Per-field read/write permissions with data masking

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

### 🛠️ Developer Experience
- **CLI Tool**: Powerful command-line interface with dry-run, backup, and incremental generation
- **Custom Generators**: Extensible system for custom code generation
- **Configuration System**: Flexible configuration with smart defaults and overrides
- **Advanced Error System**: See [Error System Documentation](./ERROR_SYSTEM.md) for comprehensive error handling
- **Tagged Template System**: Enhanced syntax highlighting with language-specific tagged templates (HTML, CSS, SQL, TypeScript, etc.)

## 🚀 Quick Start

### Installation

```bash
npm install -g gen
# or
npm install --save-dev gen
```

### Define an Entity

Create an entity definition file (e.g., `entities.ts`):

```typescript
import { createEntity, ComponentRegistry, validators, dbTypes } from 'gen'

// Register your UI components (do this once)
ComponentRegistry.registerBulk({
  TextField: MyUILib.TextField,
  NumberField: MyUILib.NumberField,
  EmailField: MyUILib.EmailField,
})

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

### Generate Code

```bash
# Generate everything
gen --targets=database,api,frontend

# Generate with custom config
gen --config=./gen-config.js --targets=database --dry-run

# Generate specific database targets
gen --targets=drizzle,prisma,sql
```

## 📖 Entity System

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

### Creating Entities

Use the `createEntity()` helper for sensible defaults:

```typescript
import { createEntity, dbTypes, validators } from 'gen'

const productEntity = createEntity({
  id: 'product',
  name: { singular: 'Product', plural: 'Products' },
  db: {
    table: { name: 'products', primaryKey: ['id'] },
    columns: {
      id: dbTypes.id(),
      name: dbTypes.string(255),
      price: dbTypes.decimal(10, 2),
      inStock: dbTypes.boolean(),
    }
  },
  fields: {
    name: { standardSchema: validators.stringMin(1) },
    price: { standardSchema: validators.numberMin(0) },
    inStock: { standardSchema: validators.boolean },
  }
})
```

## 🎨 Code Generation

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

### VS Code Extension

For the best syntax highlighting experience, install the **Tagged Template Syntax Highlighting** extension:

- **Extension ID:** `schoero.tagged-template-syntax-highlighting`
- **Install:** `ext install schoero.tagged-template-syntax-highlighting`

This extension recognizes the tagged template functions and provides proper syntax highlighting for the embedded content in each template type.

## 🛤️ Advanced Generators

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

## 🖥️ CLI Usage

### Available Commands

```bash
gen init [project-name]     # Initialize a new project
gen generate [targets...]   # Generate code from entities
gen plugin <command>        # Manage plugins
gen config <command>        # Manage configuration
gen --help                  # Show help
gen --version               # Show version
```

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

## 📚 API Reference

### Core Exports

```typescript
import {
  // Entity creation
  createEntity,
  createRelationship,

  // Component system
  ComponentRegistry,

  // Database types
  dbTypes,

  // Validators
  validators,
  createValidator,

  // Permission system
  PermissionEngine,

  // Mutation system
  MutatorFactory,

  // Utilities
  resolveFieldConfig,
  entityToTypeScript,
  entityToJsonSchema,
} from 'gen'
```

### Key Types

- `Entity<T, C, R, E>` - Complete entity definition
- `FieldMapping<T, C>` - Field configuration with components and validation
- `PermissionConfig` - Permission rules and checks
- `EntityMutator<T, P>` - Mutation functions with audit trail
- `DbColumnType` - Database column type abstraction

## 💡 Examples

### E-commerce Product Catalog

```typescript
import { createEntity, dbTypes, validators } from 'gen'

export const productEntity = createEntity({
  id: 'product',
  name: { singular: 'Product', plural: 'Products' },
  db: {
    table: { name: 'products', primaryKey: ['id'] },
    columns: {
      id: dbTypes.id(),
      name: dbTypes.string(255),
      description: dbTypes.text(),
      price: dbTypes.decimal(10, 2),
      category: dbTypes.string(100),
      inStock: dbTypes.boolean(),
      createdAt: dbTypes.timestamp(),
    }
  },
  fields: {
    name: { standardSchema: validators.stringMin(1) },
    description: { standardSchema: validators.stringMin(10) },
    price: { standardSchema: validators.numberMin(0) },
    category: { standardSchema: validators.stringMin(1) },
    inStock: { standardSchema: validators.boolean },
  },
  relationships: [{
    name: 'category',
    localEntity: 'product',
    foreignEntity: 'category',
    relationType: 'many-to-one',
    db: {
      foreignKey: {
        localColumn: 'categoryId',
        foreignColumn: 'id',
      }
    }
  }],
  permissions: {
    create: { roles: ['admin', 'manager'] },
    update: { roles: ['admin'], ownership: { field: 'createdBy' } },
    delete: { roles: ['admin'] },
  }
})
```

### User Management System

```typescript
export const userEntity = createEntity({
  id: 'user',
  name: { singular: 'User', plural: 'Users' },
  db: {
    table: { name: 'users', primaryKey: ['id'] },
    columns: {
      id: dbTypes.id(),
      email: dbTypes.string(255).unique(),
      name: dbTypes.string(100),
      role: dbTypes.enum(['user', 'admin', 'superadmin']),
      organizationId: dbTypes.uuid(),
      createdAt: dbTypes.timestamp(),
    }
  },
  fields: {
    email: { standardSchema: validators.email },
    name: { standardSchema: validators.stringMin(1) },
    role: { standardSchema: validators.enum(['user', 'admin', 'superadmin']) },
  },
  permissions: {
    read: { organization: { field: 'organizationId' } },
    update: { ownership: { field: 'id' } },
    delete: { roles: ['superadmin'] },
  },
  mutators: {
    changeRole: {
      inputSchema: validators.object({
        userId: validators.string,
        newRole: validators.enum(['user', 'admin', 'superadmin'])
      }),
      permissions: { roles: ['admin'] },
      execute: async ({ userId, newRole }) => {
        // Custom mutation logic with audit trail
      }
    }
  }
})
```

## 🤝 Contributing

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/gen.git
cd gen

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Development mode
npm run dev
```

### Project Structure

```
src/
├── cli/                    # Command-line interface
├── generators/            # Code generation logic
│   ├── database.ts        # Database schema generation
│   ├── api.ts            # API route generation
│   └── frontend.ts       # Frontend component generation
├── components.ts          # Component registry system
├── database.ts           # Database type abstractions
├── entity.ts             # Core Entity type definition
├── permissions.ts        # Permission system
├── mutations.ts          # Mutation system with audit trail
├── validators.ts         # StandardSchema validators
└── utils/                # Utility functions
```

### Adding New Features

1. **Database Targets**: Add new database support in `src/database.ts`
2. **UI Frameworks**: Extend component registry in `src/components.ts`
3. **Generators**: Create new generators in `src/generators/`
4. **Validators**: Add new validators in `src/validators.ts`

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/entity.test.ts

# Type checking
npm run type-check

# Build verification
npm run build
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with ❤️ using TypeScript, Zod for validation, and Neverthrow for error handling.

---

**Gen** - Define once, generate everywhere. Simplify full-stack development with type-safe, maintainable code generation.