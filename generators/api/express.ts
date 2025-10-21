/**
 * Express API Generator
 * Generates Express routes, controllers, middleware, validators, and types
 */

import type { Entity } from '../../src/entity'
import type { GeneratedAPICode } from '../../src/generator-interfaces'

/**
 * Express API Generator
 */
export class ExpressAPIGenerator {
  /**
   * Generate Express API code for an entity
   */
  static generate<T>(entity: Entity<T>, options: {
    includeValidation?: boolean
    includePermissions?: boolean
    includeOpenAPI?: boolean
    includeTypes?: boolean
    basePath?: string
  } = {}): GeneratedAPICode {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural
    const basePath = options.basePath || `/api/${pluralName.toLowerCase()}`

    const routes = this.generateRoutes(entity, options, basePath)
    const controllers = this.generateControllers(entity, options)
    const middleware = this.generateMiddleware(entity, options)
    const validators = options.includeValidation ? this.generateValidators(entity) : '// Validation disabled'
    const openapi = options.includeOpenAPI ? this.generateOpenAPI(entity, basePath) : '// OpenAPI disabled'
    const types = options.includeTypes ? this.generateTypes(entity) : '// Types disabled'

    return {
      routes,
      controllers,
      middleware,
      validators,
      openapi,
      types,
    }
  }

  /**
   * Generate Express routes
   */
  private static generateRoutes<T>(entity: Entity<T>, options: any, basePath: string): string {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural

    const middlewareImports = options.includePermissions ? `
import { permissionMiddleware } from '../middleware/permissions'` : ''
    const validationImports = options.includeValidation ? `,
import { create${entityName}Schema, update${entityName}Schema, list${entityName}QuerySchema } from '../validators/${pluralName}.validator'` : ''

    return `import express from 'express'
import { ${pluralName}Controller } from '../controllers/${pluralName}.controller'${middlewareImports}${validationImports}

const router = express.Router()

// List ${pluralName}
router.get('${basePath}'${options.includePermissions ? `,
  permissionMiddleware('${pluralName}', 'list')` : ''}${options.includeValidation ? `,
  validationMiddleware(list${entityName}QuerySchema)` : ''},
  ${pluralName}Controller.list)

// Get single ${entityName}
router.get('${basePath}/:id'${options.includePermissions ? `,
  permissionMiddleware('${pluralName}', 'read')` : ''}${options.includeValidation ? `,
  validationMiddleware(${entityName}IdParamSchema)` : ''},
  ${pluralName}Controller.get)

// Create ${entityName}
router.post('${basePath}'${options.includePermissions ? `,
  permissionMiddleware('${pluralName}', 'create')` : ''}${options.includeValidation ? `,
  validationMiddleware(create${entityName}Schema)` : ''},
  ${pluralName}Controller.create)

// Update ${entityName}
router.put('${basePath}/:id'${options.includePermissions ? `,
  permissionMiddleware('${pluralName}', 'update')` : ''}${options.includeValidation ? `,
  validationMiddleware(update${entityName}Schema)` : ''},
  ${pluralName}Controller.update)

// Delete ${entityName}
router.delete('${basePath}/:id'${options.includePermissions ? `,
  permissionMiddleware('${pluralName}', 'delete')` : ''}${options.includeValidation ? `,
  validationMiddleware(${entityName}IdParamSchema)` : ''},
  ${pluralName}Controller.delete)

export default router`
  }

  /**
   * Generate Express controllers
   */
  private static generateControllers<T>(entity: Entity<T>, options: any): string {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural

    const imports = `import type { Request, Response } from 'express'
import { ${entityName}, ${entityName}CreateInput, ${entityName}UpdateInput } from '../types/${pluralName}.types'`

    const errorHandling = `
// Error response helper
const sendError = (res: Response, status: number, message: string, details?: any) => {
  res.status(status).json({
    success: false,
    error: { message, details },
    timestamp: new Date().toISOString()
  })
}

// Success response helper
const sendSuccess = (res: Response, data: any, status: number = 200) => {
  res.status(status).json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  })
}`

    const listMethod = `
// List ${pluralName} with pagination, filtering, sorting
static async list(req: Request, res: Response) {
  try {
    const {
      page = 1,
      limit = 10,
      sort = 'createdAt',
      order = 'desc',
      ...filters
    } = req.query

    // TODO: Implement database query with pagination, filtering, sorting
    const items = [] as ${entityName}[]

    // TODO: Implement total count query
    const total = 0

    sendSuccess(res, {
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('Error listing ${pluralName}:', error)
    sendError(res, 500, 'Failed to list ${pluralName}')
  }
}`

    const getMethod = `
// Get single ${entityName}
static async get(req: Request, res: Response) {
  try {
    const { id } = req.params

    // TODO: Implement database query
    const item = null as ${entityName} | null

    if (!item) {
      return sendError(res, 404, '${entityName} not found')
    }

    sendSuccess(res, item)
  } catch (error) {
    console.error('Error getting ${entityName}:', error)
    sendError(res, 500, 'Failed to get ${entityName}')
  }
}`

    const createMethod = `
// Create ${entityName}
static async create(req: Request, res: Response) {
  try {
    const data: ${entityName}CreateInput = req.body

    // TODO: Implement database insert
    const item = { id: 'generated-id', ...data } as ${entityName}

    sendSuccess(res, item, 201)
  } catch (error) {
    console.error('Error creating ${entityName}:', error)
    sendError(res, 500, 'Failed to create ${entityName}')
  }
}`

    const updateMethod = `
// Update ${entityName}
static async update(req: Request, res: Response) {
  try {
    const { id } = req.params
    const data: ${entityName}UpdateInput = req.body

    // TODO: Implement database update
    const item = null as ${entityName} | null

    if (!item) {
      return sendError(res, 404, '${entityName} not found')
    }

    sendSuccess(res, item)
  } catch (error) {
    console.error('Error updating ${entityName}:', error)
    sendError(res, 500, 'Failed to update ${entityName}')
  }
}`

    const deleteMethod = `
// Delete ${entityName}
static async delete(req: Request, res: Response) {
  try {
    const { id } = req.params

    // TODO: Implement database delete
    const deleted = true

    if (!deleted) {
      return sendError(res, 404, '${entityName} not found')
    }

    sendSuccess(res, { message: '${entityName} deleted successfully' })
  } catch (error) {
    console.error('Error deleting ${entityName}:', error)
    sendError(res, 500, 'Failed to delete ${entityName}')
  }
}`

    return `${imports}

${errorHandling}

/**
 * ${entityName} Controller
 * Auto-generated CRUD operations for ${entityName}
 */
export class ${pluralName}Controller {
  ${listMethod}

  ${getMethod}

  ${createMethod}

  ${updateMethod}

  ${deleteMethod}
}`
  }

  /**
   * Generate Express middleware
   */
  private static generateMiddleware<T>(entity: Entity<T>, options: any): string {
    return `
// Permission middleware
export const permissionMiddleware = (entity: string, action: string) => {
  return async (req: any, res: any, next: any) => {
    // TODO: Implement permission check
    next()
  }
}
`.trim()
  }

  /**
   * Generate Express validators
   */
  private static generateValidators<T>(entity: Entity<T>): string {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural

    // Generate field validators
    const fieldValidators = Object.entries(entity.fields).map(([fieldName, field]) => {
      const schema = (field as any).standardSchema
      if (!schema) return `  ${fieldName}: z.any(),`

      // Convert StandardSchema to Zod code (simplified)
      return `  ${fieldName}: z.string(), // TODO: Convert from StandardSchema`
    }).join('\n')

    return `import { z } from 'zod'

// ${entityName} validation schemas
export const create${entityName}Schema = z.object({
${fieldValidators}
})

export const update${entityName}Schema = create${entityName}Schema.partial()

export const list${entityName}QuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional()
})

export const ${entityName}IdParamSchema = z.object({
  id: z.string().uuid()
})
`
  }

  /**
   * Generate OpenAPI specification
   */
  private static generateOpenAPI<T>(entity: Entity<T>, basePath: string): string {
    return '// TODO: Generate OpenAPI specification'
  }

  /**
   * Generate TypeScript types
   */
  private static generateTypes<T>(entity: Entity<T>): string {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural

    // Generate field types
    const fieldTypes = Object.entries(entity.fields).map(([fieldName, field]) => {
      const tsType = (field as any).jsType || 'string'
      const optional = (field as any).optional ? '?' : ''
      return `  ${fieldName}${optional}: ${tsType}`
    }).join('\n')

    const createFields = Object.entries(entity.fields)
      .filter(([_, field]) => !(field as any).optional && !['id', 'createdAt', 'updatedAt'].includes(_))
      .map(([fieldName, field]) => {
        const tsType = (field as any).jsType || 'string'
        return `  ${fieldName}: ${tsType}`
      }).join('\n')

    const updateFields = Object.entries(entity.fields)
      .filter(([_, field]) => (field as any).editable !== false && !['id', 'createdAt'].includes(_))
      .map(([fieldName, field]) => {
        const tsType = (field as any).jsType || 'string'
        const optional = (field as any).optional ? '?' : ''
        return `  ${fieldName}${optional}: ${tsType}`
      }).join('\n')

    return `/**
 * ${entityName} TypeScript types
 * Auto-generated from entity definition
 */

export interface ${entityName} {
${fieldTypes}
}

export interface ${entityName}CreateInput {
${createFields}
}

export interface ${entityName}UpdateInput {
${updateFields}
}

export interface ${entityName}ListQuery {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
  // TODO: Add filter fields
}

export interface ${entityName}ListResponse {
  items: ${entityName}[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}`
  }
}