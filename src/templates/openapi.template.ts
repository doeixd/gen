/**
 * OpenAPI/Swagger Documentation Template
 * Generates OpenAPI 3.0 specification for API documentation
 */

import type { Entity } from '../entity'
import { getFieldNames } from '../utils'
import { json, conditional, map } from '../tags'

export interface OpenAPITemplateOptions {
  entity: Entity<any>
  title?: string
  version?: string
  basePath?: string
  includeAuth?: boolean
  includePagination?: boolean
  includeFiltering?: boolean
  includeSorting?: boolean
}

export function generateOpenAPI(options: OpenAPITemplateOptions): string {
  const {
    entity,
    title = `${entity.name.plural} API`,
    version = '1.0.0',
    basePath = '/api',
    includeAuth = false,
    includePagination = true,
    includeFiltering = true,
    includeSorting = true
  } = options
  const entityName = entity.name.singular
  const pluralName = entity.name.plural
  const fields = getFieldNames(entity)

  return json`
{
  "openapi": "3.0.3",
  "info": {
    "title": "${title}",
    "version": "${version}",
    "description": "Auto-generated API documentation for ${entity.name.plural}"
  },
  "servers": [
    {
      "url": "${basePath}",
      "description": "API server"
    }
  ],
${conditional(includeAuth, `
  "security": [
    {
      "bearerAuth": []
    }
  ],
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    },
`)}
  "paths": {
    "/${pluralName}": {
      "get": {
        "summary": "List ${pluralName}",
        "description": "Get a paginated list of ${pluralName}",
        "tags": ["${pluralName}"],
        "parameters": [
${conditional(includePagination, `          {
            "name": "page",
            "in": "query",
            "description": "Page number (1-based)",
            "schema": {
              "type": "integer",
              "minimum": 1,
              "default": 1
            }
          },
          {
            "name": "limit",
            "in": "query",
            "description": "Number of items per page",
            "schema": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100,
              "default": 10
            }
          },`)}
${conditional(includeFiltering, `          {
            "name": "search",
            "in": "query",
            "description": "Search term to filter results",
            "schema": {
              "type": "string"
            }
          },`)}
${conditional(includeSorting, `          {
            "name": "sort",
            "in": "query",
            "description": "Field to sort by",
            "schema": {
              "type": "string",
              "enum": [${fields.map(f => `"${String(f)}"`).join(', ')}],
              "default": "createdAt"
            }
          },
          {
            "name": "order",
            "in": "query",
            "description": "Sort order",
            "schema": {
              "type": "string",
              "enum": ["asc", "desc"],
              "default": "desc"
            }
          }`)}
        ],
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/${entityName}"
                      }
                    },
${conditional(includePagination, `                    "pagination": {
                      "$ref": "#/components/schemas/Pagination"
                    }`)}
                  },
                  "required": ["data"]
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "500": {
            "description": "Internal server error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create ${entityName}",
        "description": "Create a new ${entityName}",
        "tags": ["${pluralName}"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Create${entityName}"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "data": {
                      "$ref": "#/components/schemas/${entityName}"
                    }
                  },
                  "required": ["data"]
                }
              }
            }
          },
          "400": {
            "description": "Validation error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "500": {
            "description": "Internal server error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        }
      }
    },
    "/${pluralName}/{id}": {
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "${entityName} ID",
          "schema": {
            "type": "string"
          }
        }
      ],
      "get": {
        "summary": "Get ${entityName}",
        "description": "Get a single ${entityName} by ID",
        "tags": ["${pluralName}"],
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "data": {
                      "$ref": "#/components/schemas/${entityName}"
                    }
                  },
                  "required": ["data"]
                }
              }
            }
          },
          "404": {
            "description": "${entityName} not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "500": {
            "description": "Internal server error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        }
      },
      "put": {
        "summary": "Update ${entityName}",
        "description": "Update an existing ${entityName}",
        "tags": ["${pluralName}"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Update${entityName}"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Updated successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "data": {
                      "$ref": "#/components/schemas/${entityName}"
                    }
                  },
                  "required": ["data"]
                }
              }
            }
          },
          "400": {
            "description": "Validation error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "404": {
            "description": "${entityName} not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "500": {
            "description": "Internal server error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        }
      },
      "delete": {
        "summary": "Delete ${entityName}",
        "description": "Delete an existing ${entityName}",
        "tags": ["${pluralName}"],
        "responses": {
          "204": {
            "description": "Deleted successfully"
          },
          "404": {
            "description": "${entityName} not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "500": {
            "description": "Internal server error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "${entityName}": {
        "type": "object",
        "properties": {
${map(fields, (field) => {
  const fieldDef = entity.fields[field]
  const fieldType = fieldDef.jsType || 'string'
  const isOptional = fieldDef.optional

  let openApiType: string
  switch (fieldType) {
    case 'string':
      openApiType = '"type": "string"'
      break
    case 'number':
      openApiType = '"type": "number"'
      break
    case 'boolean':
      openApiType = '"type": "boolean"'
      break
    default:
      openApiType = '"type": "string"'
  }

  return `          "${String(field)}": {
            ${openApiType}${isOptional ? '' : ',\n            "required": true'}
          }`
})}
        },
        "required": [${fields.filter(f => !entity.fields[f].optional).map(f => `"${String(f)}"`).join(', ')}]
      },
      "Create${entityName}": {
        "type": "object",
        "properties": {
${map(fields.filter(f => f !== 'id'), (field) => {
  const fieldDef = entity.fields[field]
  const fieldType = fieldDef.jsType || 'string'

  let openApiType: string
  switch (fieldType) {
    case 'string':
      openApiType = '"type": "string"'
      break
    case 'number':
      openApiType = '"type": "number"'
      break
    case 'boolean':
      openApiType = '"type": "boolean"'
      break
    default:
      openApiType = '"type": "string"'
  }

  return `          "${String(field)}": {
            ${openApiType}
          }`
})}
        }
      },
      "Update${entityName}": {
        "type": "object",
        "properties": {
${map(fields, (field) => {
  const fieldDef = entity.fields[field]
  const fieldType = fieldDef.jsType || 'string'

  let openApiType: string
  switch (fieldType) {
    case 'string':
      openApiType = '"type": "string"'
      break
    case 'number':
      openApiType = '"type": "number"'
      break
    case 'boolean':
      openApiType = '"type": "boolean"'
      break
    default:
      openApiType = '"type": "string"'
  }

  return `          "${String(field)}": {
            ${openApiType}
          }`
})}
        }
      },
${conditional(includePagination, `      "Pagination": {
        "type": "object",
        "properties": {
          "page": {
            "type": "integer",
            "description": "Current page number"
          },
          "limit": {
            "type": "integer",
            "description": "Items per page"
          },
          "total": {
            "type": "integer",
            "description": "Total number of items"
          },
          "totalPages": {
            "type": "integer",
            "description": "Total number of pages"
          },
          "hasNext": {
            "type": "boolean",
            "description": "Whether there is a next page"
          },
          "hasPrev": {
            "type": "boolean",
            "description": "Whether there is a previous page"
          }
        },
        "required": ["page", "limit", "total", "totalPages", "hasNext", "hasPrev"]
      },`)}
      "Error": {
        "type": "object",
        "properties": {
          "error": {
            "type": "string",
            "description": "Error message"
          }
        },
        "required": ["error"]
      },
      "ValidationError": {
        "type": "object",
        "properties": {
          "error": {
            "type": "string",
            "description": "Error message"
          },
          "details": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "code": {
                  "type": "string"
                },
                "message": {
                  "type": "string"
                },
                "path": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "required": ["error", "details"]
      }
    }
  }
}
`
}
