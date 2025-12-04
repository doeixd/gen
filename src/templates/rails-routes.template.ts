/**
 * Rails-style CRUD Routes Template
 * Generates RESTful routes similar to Ruby on Rails routing
 */

import type { Entity } from '../entity'
import { getFieldNames } from '../utils'
import { ts, conditional, map } from '../tags'

export interface RailsRoutesTemplateOptions {
  entity: Entity<any>
  framework: 'express' | 'fastify' | 'hono' | 'koa'
  basePath?: string
  includeMiddleware?: boolean
  includeValidation?: boolean
  includeAuth?: boolean
}

export function generateRailsRoutes(options: RailsRoutesTemplateOptions): string {
  const { entity, framework, basePath = '/api', includeMiddleware = true, includeValidation = true, includeAuth = false } = options
  const entityName = entity.name.singular
  const pluralName = entity.name.plural
  const tableName = entity.db.table.name
  const fields = getFieldNames(entity)

  const routePath = `${basePath}/${pluralName}`

  return ts`
import { Router${framework === 'express' ? ', Request, Response' : ''} } from '${getFrameworkImport(framework)}'
${conditional(includeValidation, `import { z } from 'zod'`)}

${conditional(includeAuth, `
// Auth middleware
const requireAuth = (req: Request, res: Response, next: Function) => {
  // Implement authentication check
  next()
}
`)}
${conditional(includeMiddleware, `
// Middleware
const validateId = (req: Request, res: Response, next: Function) => {
  const id = req.params.id
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Invalid ID' })
  }
  next()
}

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: Function) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}
`)}
// Types
export interface ${entityName} {
${map(fields, (field) => {
    const fieldDef = entity.fields[field]
    const fieldType = fieldDef.jsType || 'string'
    const isOptional = fieldDef.optional
    return `  ${String(field)}${isOptional ? '?' : ''}: ${fieldType}`
  })}
}

export interface Create${entityName}Request {
${map(fields.filter(f => entity.fields[f].optional !== false), (field) => {
    const fieldDef = entity.fields[field]
    const fieldType = fieldDef.jsType || 'string'
    return `  ${String(field)}?: ${fieldType}`
  })}
}

export interface Update${entityName}Request {
${map(fields, (field) => {
    const fieldDef = entity.fields[field]
    const fieldType = fieldDef.jsType || 'string'
    return `  ${String(field)}?: ${fieldType}`
  })}
}

${conditional(includeValidation, `
// Validation schemas
const ${entityName}Schema = z.object({
${map(fields, (field) => {
    const fieldDef = entity.fields[field]
    const fieldType = fieldDef.jsType || 'string'
    const isOptional = fieldDef.optional

    let zodType: string
    switch (fieldType) {
      case 'string':
        zodType = 'z.string()'
        break
      case 'number':
        zodType = 'z.number()'
        break
      case 'boolean':
        zodType = 'z.boolean()'
        break
      default:
        zodType = 'z.any()'
    }

    if (!isOptional) {
      zodType += `.min(1, '${field} is required')`
    }

    return `  ${String(field)}: ${isOptional ? `z.optional(${zodType})` : zodType},`
  })}
})

const create${entityName}Schema = ${entityName}Schema.omit({ id: true }).partial({
${map(fields.filter(f => entity.fields[f].optional === false && f !== 'id'), (field) => `  ${String(field)}: true,`).join('\n')}
})
`)}
// Route handlers
const ${pluralName}Controller = {
  // GET /${pluralName} - Index (list all)
  async index(req: Request, res: Response) {
    try {
      // TODO: Implement data fetching
      const ${pluralName} = [] as ${entityName}[]

      // Pagination
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 10
      const offset = (page - 1) * limit

      // Filtering
      let filtered${pluralName} = ${pluralName}
      if (req.query.search) {
        const searchTerm = req.query.search as string
        filtered${pluralName} = ${pluralName}.filter(item =>
${fields.map(f => `          item.${String(f)}?.toString().toLowerCase().includes(searchTerm.toLowerCase())`).join(' ||\n')}
        )
      }

      // Sorting
      if (req.query.sort) {
        const sortField = req.query.sort as string
        const sortOrder = req.query.order === 'desc' ? -1 : 1
        filtered${pluralName}.sort((a: any, b: any) => {
          if (a[sortField] < b[sortField]) return -1 * sortOrder
          if (a[sortField] > b[sortField]) return 1 * sortOrder
          return 0
        })
      }

      const paginated${pluralName} = filtered${pluralName}.slice(offset, offset + limit)

      res.json({
        data: paginated${pluralName},
        pagination: {
          page,
          limit,
          total: filtered${pluralName}.length,
          pages: Math.ceil(filtered${pluralName}.length / limit)
        }
      })
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' })
    }
  },

  // GET /${pluralName}/:id - Show (get one)
  async show(req: Request, res: Response) {
    try {
      const { id } = req.params

      // TODO: Implement data fetching
      // const ${entityName.toLowerCase()} = await find${entityName}ById(id)

      // Mock response for now
      const ${entityName.toLowerCase()}: ${entityName} | null = null

      if (!${entityName.toLowerCase()}) {
        return res.status(404).json({ error: '${entityName} not found' })
      }

      res.json({ data: ${entityName.toLowerCase()} })
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' })
    }
  },

  // POST /${pluralName} - Create
  async create(req: Request, res: Response) {
    try {
${conditional(includeValidation, `
      // Validate input
      const validationResult = create${entityName}Schema.safeParse(req.body)
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.error.issues
        })
      }
`)}
      // TODO: Implement creation logic
      // const new${entityName} = await create${entityName}(req.body)

      // Mock response for now
      const new${entityName}: ${entityName} = {
        id: Date.now().toString(),
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      res.status(201).json({ data: new${entityName} })
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' })
    }
  },

  // PUT /${pluralName}/:id - Update
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params

${conditional(includeValidation, `
      // Validate input
      const validationResult = ${entityName}Schema.partial().safeParse(req.body)
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.error.issues
        })
      }
`)}
      // TODO: Implement update logic
      // const updated${entityName} = await update${entityName}(id, req.body)

      // Mock response for now
      const updated${entityName}: ${entityName} = {
        id,
        ...req.body,
        updatedAt: new Date()
      }

      res.json({ data: updated${entityName} })
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' })
    }
  },

  // DELETE /${pluralName}/:id - Destroy
  async destroy(req: Request, res: Response) {
    try {
      const { id } = req.params

      // TODO: Implement deletion logic
      // await delete${entityName}(id)

      res.status(204).send()
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

// Create router
const create${entityName}Router = () => {
  const router = ${getRouterInstantiation(framework)}

${conditional(includeMiddleware, `
  // Apply global middleware
  router.use(validateId)
`)}
  // RESTful routes
  router.${getRouteMethod(framework, 'get')}('${routePath}', ${conditional(includeMiddleware, 'asyncHandler(')}${pluralName}Controller.index${conditional(includeMiddleware, ')')})
  router.${getRouteMethod(framework, 'get')}('${routePath}/:id', ${conditional(includeMiddleware, 'asyncHandler(')}${pluralName}Controller.show${conditional(includeMiddleware, ')')})
  router.${getRouteMethod(framework, 'post')}('${routePath}', ${conditional(includeMiddleware, 'asyncHandler(')}${pluralName}Controller.create${conditional(includeMiddleware, ')')})
  router.${getRouteMethod(framework, 'put')}('${routePath}/:id', ${conditional(includeMiddleware, 'asyncHandler(')}${pluralName}Controller.update${conditional(includeMiddleware, ')')})
  router.${getRouteMethod(framework, 'delete')}('${routePath}/:id', ${conditional(includeMiddleware, 'asyncHandler(')}${pluralName}Controller.destroy${conditional(includeMiddleware, ')')})

  return router
}

export default create${entityName}Router

// Helper functions for different frameworks
function ${getRouterInstantiation('express')} { return Router() }
function ${getRouterInstantiation('fastify')} { return null as any } // Fastify router
function ${getRouterInstantiation('hono')} { return null as any } // Hono router
function ${getRouterInstantiation('koa')} { return null as any } // Koa router

// Route method helpers
function ${getRouteMethod('express')} { return 'method' }
function ${getRouteMethod('fastify')} { return 'method' }
function ${getRouteMethod('hono')} { return 'method' }
function ${getRouteMethod('koa')} { return 'method' }
`

  // Helper functions
  function getFrameworkImport(framework: string): string {
    switch (framework) {
      case 'express': return 'express'
      case 'fastify': return 'fastify'
      case 'hono': return 'hono'
      case 'koa': return 'koa-router'
      default: return 'express'
    }
  }

  function getRouterInstantiation(framework: string): string {
    switch (framework) {
      case 'express': return 'Router()'
      case 'fastify': return 'null as any // Fastify router'
      case 'hono': return 'null as any // Hono router'
      case 'koa': return 'null as any // Koa router'
      default: return 'Router()'
    }
  }

  function getRouteMethod(framework: string, method: string): string {
    // This would be customized per framework
    return method.toLowerCase()
  }
}
