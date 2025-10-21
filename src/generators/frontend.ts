/**
 * Frontend Code Generator
 * Generate frontend routes, forms, tables, components
 */

import type { Entity } from '../entity'

/**
 * Generated frontend code
 */
export interface GeneratedFrontendCode {
  routes: Record<string, string> // Route name -> component code
  forms: Record<string, string> // Form name -> component code
  tables: string
  components: Record<string, string>
}

/**
 * Frontend Code Generator
 */
export class FrontendGenerator {
  /**
   * Generate all frontend code for an entity
   */
  static generate<T>(entity: Entity<T>): GeneratedFrontendCode {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural

    const routes: Record<string, string> = {
      list: `
// List${pluralName} component
export function List${pluralName}() {
  // TODO: Implement list view
  return <div>List of ${pluralName}</div>
}
`.trim(),
      detail: `
// ${entityName}Detail component
export function ${entityName}Detail({ id }: { id: string }) {
  // TODO: Implement detail view
  return <div>${entityName} Detail</div>
}
`.trim(),
      create: `
// Create${entityName} component
export function Create${entityName}() {
  // TODO: Implement create form
  return <div>Create ${entityName}</div>
}
`.trim(),
      edit: `
// Edit${entityName} component
export function Edit${entityName}({ id }: { id: string }) {
  // TODO: Implement edit form
  return <div>Edit ${entityName}</div>
}
`.trim(),
    }

    const forms: Record<string, string> = {
      create: `// TODO: Generate create form with field-level permissions`,
      edit: `// TODO: Generate edit form with field-level permissions`,
    }

    const tables = `// TODO: Generate table component`

    return { routes, forms, tables, components: {} }
  }
}

/**
 * Test Code Generator
 */
export interface GeneratedTestCode {
  unit: string[]
  integration: string[]
  e2e: string[]
  permissions: string[]
}

export class TestGenerator {
  /**
   * Generate tests for an entity
   */
  static generate<T>(entity: Entity<T>): GeneratedTestCode {
    return {
      unit: ['// TODO: Generate unit tests'],
      integration: ['// TODO: Generate integration tests'],
      e2e: ['// TODO: Generate E2E tests'],
      permissions: ['// TODO: Generate permission tests'],
    }
  }
}

/**
 * Documentation Generator
 */
export interface GeneratedDocumentation {
  markdown: string
  openapi: string
  permissionMatrix: string
  erd: string // Entity Relationship Diagram
  apiReference: string
  fieldGuide: string
}

export class DocumentationGenerator {
  /**
   * Generate documentation for an entity
   */
  static generate<T>(entity: Entity<T>): GeneratedDocumentation {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural

    const markdown = this.generateMarkdown(entity)
    const openapi = this.generateOpenAPI(entity)
    const permissionMatrix = this.generatePermissionMatrix(entity)
    const erd = this.generateERD(entity)
    const apiReference = this.generateAPIReference(entity)
    const fieldGuide = this.generateFieldGuide(entity)

    return {
      markdown,
      openapi,
      permissionMatrix,
      erd,
      apiReference,
      fieldGuide,
    }
  }

  /**
   * Generate comprehensive markdown documentation
   */
  private static generateMarkdown<T>(entity: Entity<T>): string {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural

    const fieldsTable = Object.entries(entity.fields).map(([name, field]) => {
      const fieldConfig = field as any
      return `| ${name} | ${fieldConfig.jsType || 'unknown'} | ${field.optional ? 'No' : 'Yes'} | ${fieldConfig.standardSchema ? 'Yes' : 'No'} | ${field.permissions ? 'Yes' : 'No'} |`
    }).join('\n')

    const relationshipsSection = entity.relationships ? `
## Relationships

${entity.relationships.map(rel => {
  const localTable = typeof rel.localEntity === 'string' ? rel.localEntity : rel.localEntity.db.table.name
  const foreignTable = typeof rel.foreignEntity === 'string' ? rel.foreignEntity : rel.foreignEntity.db.table.name

  return `### ${rel.name}
- **Type**: ${rel.relationType}
- **Local**: ${localTable} (${rel.db.foreignKey.localColumn})
- **Foreign**: ${foreignTable} (${rel.db.foreignKey.foreignColumn})
- **Description**: ${rel.description || 'No description'}
`
}).join('\n')}` : ''

    const permissionsSection = entity.permissions ? `
## Permissions

### Entity-level Permissions
${entity.permissions.roles ? `
**Role-based Access:**
- Read: ${entity.permissions.roles.read?.join(', ') || 'None'}
- Write: ${entity.permissions.roles.write?.join(', ') || 'None'}
- Create: ${entity.permissions.roles.create?.join(', ') || 'None'}
- Delete: ${entity.permissions.roles.delete?.join(', ') || 'None'}
` : ''}

${entity.permissions.ownership ? `
**Ownership-based Access:**
- Required: ${entity.permissions.ownership.required}
- Owner Field: ${entity.permissions.ownership.ownerField}
` : ''}

${entity.permissions.organization ? `
**Organization-based Access:**
- Required: ${entity.permissions.organization.required}
- Organization Field: ${entity.permissions.organization.orgField}
` : ''}` : ''

    return `# ${entityName}

${entity.description || 'No description provided.'}

## Overview

- **Singular**: ${entityName}
- **Plural**: ${pluralName}
- **Version**: ${entity.version}
- **Created**: ${entity.createdAt.toISOString()}
- **Last Updated**: ${entity.updatedAt?.toISOString() || 'Never'}

## Fields

| Field | Type | Required | Validated | Permissions |
|-------|------|----------|-----------|-------------|
${fieldsTable}

## Database Schema

**Table Name**: ${entity.db.table.name}

**Primary Key**: ${entity.db.table.primaryKey.join(', ')}

${entity.db.indexes ? `**Indexes**:
${entity.db.indexes.map(idx => `- ${idx.name}: ${idx.columns.join(', ')} (${idx.unique ? 'unique' : 'non-unique'})`).join('\n')}` : ''}

${relationshipsSection}

${permissionsSection}

## API Endpoints

See the [API Reference](./api-reference.md) for detailed endpoint documentation.

## Usage Examples

### Creating a ${entityName}

\`\`\`typescript
const new${entityName} = await api.${pluralName}.create({
  // field values
})
\`\`\`

### Querying ${pluralName}

\`\`\`typescript
const ${pluralName} = await api.${pluralName}.list({
  page: 1,
  limit: 10,
  // filters
})
\`\`\`

### Updating a ${entityName}

\`\`\`typescript
const updated${entityName} = await api.${pluralName}.update(id, {
  // updated field values
})
\`\`\`
`
  }

  /**
   * Generate OpenAPI specification
   */
  private static generateOpenAPI<T>(entity: Entity<T>): string {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural
    const basePath = `/api/${pluralName}`

    const fieldSchemas = Object.entries(entity.fields).map(([name, field]) => {
      const fieldConfig = field as any
      return `"${name}": {
  "type": "${this.mapJSTypeToOpenAPI(fieldConfig.jsType || 'string')}",
  ${field.optional ? '"nullable": true,' : ''}
  ${fieldConfig.standardSchema ? '"description": "Validated field",' : ''}
}`
    }).join(',\n      ')

    return `{
  "openapi": "3.0.1",
  "info": {
    "title": "${entityName} API",
    "version": "${entity.version}"
  },
  "paths": {
    "${basePath}": {
      "get": {
        "summary": "List ${pluralName}",
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "schema": { "type": "integer", "default": 1 }
          },
          {
            "name": "limit",
            "in": "query",
            "schema": { "type": "integer", "default": 10 }
          }
        ],
        "responses": {
          "200": {
            "description": "List of ${pluralName}",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/${entityName}ListResponse" }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create ${entityName}",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/${entityName}CreateInput" }
            }
          }
        },
        "responses": {
          "201": {
            "description": "${entityName} created",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/${entityName}" }
              }
            }
          }
        }
      }
    },
    "${basePath}/{id}": {
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "schema": { "type": "string" }
        }
      ],
      "get": {
        "summary": "Get ${entityName}",
        "responses": {
          "200": {
            "description": "${entityName} details",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/${entityName}" }
              }
            }
          }
        }
      },
      "put": {
        "summary": "Update ${entityName}",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/${entityName}UpdateInput" }
            }
          }
        },
        "responses": {
          "200": {
            "description": "${entityName} updated",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/${entityName}" }
              }
            }
          }
        }
      },
      "delete": {
        "summary": "Delete ${entityName}",
        "responses": {
          "200": { "description": "${entityName} deleted" }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "${entityName}": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          ${fieldSchemas}
        }
      },
      "${entityName}CreateInput": {
        "type": "object",
        "required": [${Object.entries(entity.fields).filter(([_, field]) => !field.optional && !['id', 'createdAt', 'updatedAt'].includes(_)).map(([name]) => `"${name}"`).join(', ')}],
        "properties": {
          ${fieldSchemas}
        }
      },
      "${entityName}UpdateInput": {
        "type": "object",
        "properties": {
          ${fieldSchemas}
        }
      },
      "${entityName}ListResponse": {
        "type": "object",
        "properties": {
          "items": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/${entityName}" }
          },
          "pagination": {
            "type": "object",
            "properties": {
              "page": { "type": "integer" },
              "limit": { "type": "integer" },
              "total": { "type": "integer" },
              "pages": { "type": "integer" }
            }
          }
        }
      }
    }
  }
}`
  }

  /**
   * Generate permission matrix
   */
  private static generatePermissionMatrix<T>(entity: Entity<T>): string {
    const roles = ['admin', 'user', 'guest']
    const actions = ['create', 'read', 'update', 'delete']

    const matrix = roles.map(role => {
      const permissions = actions.map(action => {
        // Simple permission logic - in real implementation, use PermissionEngine
        if (role === 'admin') return '✓'
        if (role === 'user' && action === 'read') return '✓'
        if (role === 'user' && action === 'create') return '✓'
        return '✗'
      })
      return `| ${role} | ${permissions.join(' | ')} |`
    }).join('\n')

    return `# Permission Matrix: ${entity.name.singular}

| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
${matrix}

## Permission Rules

${entity.permissions?.roles ? `
### Role-based Permissions
- **Read**: ${entity.permissions.roles.read?.join(', ') || 'None'}
- **Write**: ${entity.permissions.roles.write?.join(', ') || 'None'}
- **Create**: ${entity.permissions.roles.create?.join(', ') || 'None'}
- **Delete**: ${entity.permissions.roles.delete?.join(', ') || 'None'}
` : ''}

${entity.permissions?.ownership ? `
### Ownership-based Permissions
- **Required**: ${entity.permissions.ownership.required}
- **Owner Field**: ${entity.permissions.ownership.ownerField}
- **Transfer Allowed**: ${entity.permissions.ownership.allowTransfer || false}
` : ''}

${entity.permissions?.organization ? `
### Organization-based Permissions
- **Required**: ${entity.permissions.organization.required}
- **Organization Field**: ${entity.permissions.organization.orgField}
- **Cross-org Access**: ${entity.permissions.organization.allowCrossOrg ? entity.permissions.organization.crossOrgRoles?.join(', ') : 'Not allowed'}
` : ''}
`
  }

  /**
   * Generate ERD diagram
   */
  private static generateERD<T>(entity: Entity<T>): string {
    const entityName = entity.name.singular

    const fields = Object.entries(entity.fields).map(([name, field]) => {
      const fieldConfig = field as any
      const pk = entity.db.table.primaryKey.includes(name) ? 'PK' : ''
      const fk = entity.relationships?.some(rel =>
        rel.db.foreignKey.localColumn === name
      ) ? 'FK' : ''
      const required = field.optional ? '' : '*'
      return `  ${name} ${fieldConfig.jsType || 'string'} ${pk}${fk}${required}`
    }).join('\n')

    const relationships = entity.relationships ? entity.relationships.map(rel => {
      const localTable = typeof rel.localEntity === 'string' ? rel.localEntity : rel.localEntity.db.table.name
      const foreignTable = typeof rel.foreignEntity === 'string' ? rel.foreignEntity : rel.foreignEntity.db.table.name

      const cardinality = rel.relationType === 'one-to-one' ? '1-1' :
                         rel.relationType === 'one-to-many' ? '1-*' :
                         rel.relationType === 'many-to-one' ? '*-1' : '*-*'

      return `${localTable} ${cardinality} ${foreignTable} : ${rel.db.foreignKey.localColumn} -> ${rel.db.foreignKey.foreignColumn}`
    }).join('\n') : ''

    return `erDiagram
  ${entity.db.table.name} {
${fields}
  }

${relationships}
`
  }

  /**
   * Generate API reference
   */
  private static generateAPIReference<T>(entity: Entity<T>): string {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural
    const basePath = `/api/${pluralName}`

    return `# API Reference: ${entityName}

## Base URL
\`${basePath}\`

## Endpoints

### List ${pluralName}
\`\`\`http
GET ${basePath}
\`\`\`

**Query Parameters:**
- \`page\` (integer, optional): Page number (default: 1)
- \`limit\` (integer, optional): Items per page (default: 10)
- \`sort\` (string, optional): Sort field
- \`order\` (string, optional): Sort order ('asc' or 'desc')

**Response:**
\`\`\`json
{
  "items": [${entityName}[]],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
\`\`\`

### Create ${entityName}
\`\`\`http
POST ${basePath}
\`\`\`

**Request Body:**
\`\`\`json
{
  ${Object.entries(entity.fields).filter(([name]) => !['id', 'createdAt', 'updatedAt'].includes(name)).map(([name]) => `"${name}": "value"`).join(',\n  ')}
}
\`\`\`

### Get ${entityName}
\`\`\`http
GET ${basePath}/{id}
\`\`\`

### Update ${entityName}
\`\`\`http
PUT ${basePath}/{id}
\`\`\`

### Delete ${entityName}
\`\`\`http
DELETE ${basePath}/{id}
\`\`\`

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request** - Validation error
\`\`\`json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [...]
  }
}
\`\`\`

**401 Unauthorized** - Authentication required
\`\`\`json
{
  "success": false,
  "error": { "message": "Authentication required" }
}
\`\`\`

**403 Forbidden** - Insufficient permissions
\`\`\`json
{
  "success": false,
  "error": { "message": "Insufficient permissions" }
}
\`\`\`

**404 Not Found** - Resource not found
\`\`\`json
{
  "success": false,
  "error": { "message": "Resource not found" }
}
\`\`\`
`
  }

  /**
   * Generate field guide
   */
  private static generateFieldGuide<T>(entity: Entity<T>): string {
    const entityName = entity.name.singular

    const fieldDetails = Object.entries(entity.fields).map(([name, field]) => {
      const fieldConfig = field as any

      return `### ${name}

**Type**: ${fieldConfig.jsType || 'string'}
**Required**: ${field.optional ? 'No' : 'Yes'}
**Validation**: ${fieldConfig.standardSchema ? 'Yes' : 'No'}
**Description**: ${field.description || 'No description'}

${field.permissions ? `**Permissions**: Restricted access` : '**Permissions**: No restrictions'}

${field.defaultValue ? `**Default**: ${JSON.stringify(field.defaultValue)}` : ''}
`
    }).join('\n')

    return `# Field Guide: ${entityName}

This guide provides detailed information about each field in the ${entityName} entity.

${fieldDetails}

## Field Groups

### System Fields
- \`id\`: Unique identifier
- \`createdAt\`: Creation timestamp
- \`updatedAt\`: Last update timestamp

### User Fields
${Object.entries(entity.fields).filter(([name]) => !['id', 'createdAt', 'updatedAt'].includes(name)).map(([name]) => `- \`${name}\``).join('\n')}

## Validation Rules

${Object.entries(entity.fields).filter(([_, field]) => (field as any).standardSchema).map(([name]) => `- \`${name}\`: Has validation rules`).join('\n')}

## Permission Restrictions

${Object.entries(entity.fields).filter(([_, field]) => field.permissions).map(([name]) => `- \`${name}\`: Has field-level permissions`).join('\n')}
`
  }

  /**
   * Helper to map JS types to OpenAPI types
   */
  private static mapJSTypeToOpenAPI(jsType?: string): string {
    switch (jsType) {
      case 'string': return 'string'
      case 'number': return 'number'
      case 'boolean': return 'boolean'
      case 'object': return 'object'
      case 'array': return 'array'
      default: return 'string'
    }
  }
}
