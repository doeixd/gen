/**
 * API Routes Template
 * Template for generating REST API routes
 */

import type { Entity } from '../entity'

export interface APIRoutesTemplateOptions {
  entity: Entity<any>
  framework: 'express' | 'fastify' | 'hono'
}

export function generateExpressRoutes(entity: Entity<any>): string {
  const entityName = entity.name.singular
  const pluralName = entity.name.plural
  const tableName = entity.db.table.name

  return `\
/**
 * ${pluralName} API Routes
 * Auto-generated REST API endpoints for ${entityName}
 */

import { Router } from 'express'
import type { Request, Response } from 'express'

const router = Router()

// List all ${pluralName}
router.get('/', async (req: Request, res: Response) => {
  try {
    // TODO: Implement pagination, filtering, sorting
    const { page = 1, limit = 20, sort, filter } = req.query

    // Fetch from database
    const items = [] // await db.${tableName}.findMany({ ... })
    const total = 0 // await db.${tableName}.count({ ... })

    res.json({
      data: items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (error) {
    console.error('Error fetching ${pluralName}:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single ${entityName} by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Fetch from database
    const item = null // await db.${tableName}.findUnique({ where: { id } })

    if (!item) {
      return res.status(404).json({ error: '${entityName} not found' })
    }

    res.json({ data: item })
  } catch (error) {
    console.error('Error fetching ${entityName}:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create new ${entityName}
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body

    // TODO: Validate data using standardSchema
    // TODO: Check permissions

    // Create in database
    const item = null // await db.${tableName}.create({ data })

    res.status(201).json({ data: item })
  } catch (error) {
    console.error('Error creating ${entityName}:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update ${entityName}
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const data = req.body

    // TODO: Validate data using standardSchema
    // TODO: Check permissions

    // Update in database
    const item = null // await db.${tableName}.update({ where: { id }, data })

    if (!item) {
      return res.status(404).json({ error: '${entityName} not found' })
    }

    res.json({ data: item })
  } catch (error) {
    console.error('Error updating ${entityName}:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Partial update ${entityName}
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const data = req.body

    // TODO: Validate partial data
    // TODO: Check permissions

    // Update in database
    const item = null // await db.${tableName}.update({ where: { id }, data })

    if (!item) {
      return res.status(404).json({ error: '${entityName} not found' })
    }

    res.json({ data: item })
  } catch (error) {
    console.error('Error updating ${entityName}:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete ${entityName}
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // TODO: Check permissions
    // TODO: Handle cascade deletes

    // Delete from database
    await null // db.${tableName}.delete({ where: { id } })

    res.status(204).send()
  } catch (error) {
    console.error('Error deleting ${entityName}:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
`
}

export function generateFastifyRoutes(entity: Entity<any>): string {
  const entityName = entity.name.singular
  const pluralName = entity.name.plural
  const tableName = entity.db.table.name

  return `\
/**
 * ${pluralName} API Routes (Fastify)
 * Auto-generated REST API endpoints for ${entityName}
 */

import type { FastifyPluginAsync } from 'fastify'

const ${tableName}Routes: FastifyPluginAsync = async (fastify) => {
  // List all ${pluralName}
  fastify.get('/', async (request, reply) => {
    try {
      const { page = 1, limit = 20 } = request.query as any

      const items = [] // await db.${tableName}.findMany({ ... })
      const total = 0 // await db.${tableName}.count()

      return {
        data: items,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      }
    } catch (error) {
      reply.code(500)
      throw error
    }
  })

  // Get single ${entityName}
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const item = null // await db.${tableName}.findUnique({ where: { id } })

    if (!item) {
      reply.code(404)
      return { error: '${entityName} not found' }
    }

    return { data: item }
  })

  // Create ${entityName}
  fastify.post('/', async (request, reply) => {
    const data = request.body

    const item = null // await db.${tableName}.create({ data })

    reply.code(201)
    return { data: item }
  })

  // Update ${entityName}
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = request.body

    const item = null // await db.${tableName}.update({ where: { id }, data })

    if (!item) {
      reply.code(404)
      return { error: '${entityName} not found' }
    }

    return { data: item }
  })

  // Delete ${entityName}
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    await null // db.${tableName}.delete({ where: { id } })

    reply.code(204)
  })
}

export default ${tableName}Routes
`
}

export function generateHonoRoutes(entity: Entity<any>): string {
  const entityName = entity.name.singular
  const pluralName = entity.name.plural
  const tableName = entity.db.table.name

  return `\
/**
 * ${pluralName} API Routes (Hono)
 * Auto-generated REST API endpoints for ${entityName}
 */

import { Hono } from 'hono'

const app = new Hono()

// List all ${pluralName}
app.get('/', async (c) => {
  try {
    const page = Number(c.req.query('page') || 1)
    const limit = Number(c.req.query('limit') || 20)

    const items = [] // await db.${tableName}.findMany({ ... })
    const total = 0 // await db.${tableName}.count()

    return c.json({
      data: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get single ${entityName}
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')

    const item = null // await db.${tableName}.findUnique({ where: { id } })

    if (!item) {
      return c.json({ error: '${entityName} not found' }, 404)
    }

    return c.json({ data: item })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Create ${entityName}
app.post('/', async (c) => {
  try {
    const data = await c.req.json()

    const item = null // await db.${tableName}.create({ data })

    return c.json({ data: item }, 201)
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Update ${entityName}
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()

    const item = null // await db.${tableName}.update({ where: { id }, data })

    if (!item) {
      return c.json({ error: '${entityName} not found' }, 404)
    }

    return c.json({ data: item })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Delete ${entityName}
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')

    await null // db.${tableName}.delete({ where: { id } })

    return c.body(null, 204)
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default app
`
}

export function generateAPIRoutes(options: APIRoutesTemplateOptions): string {
  const { entity, framework } = options

  switch (framework) {
    case 'express':
      return generateExpressRoutes(entity)
    case 'fastify':
      return generateFastifyRoutes(entity)
    case 'hono':
      return generateHonoRoutes(entity)
    default:
      throw new Error(`Unsupported framework: ${framework}`)
  }
}
