/**
 * API Code Generator
 * Generate API routes, controllers, middleware, validators
 */

import type { Entity } from '../entity'

/**
 * Generated API code
 */
export interface GeneratedAPICode {
  routes: string
  controllers: string
  middleware: string
  validators: string
  openapi: string
}

/**
 * API Code Generator
 */
export class APIGenerator {
  /**
   * Generate all API code for an entity
   */
  static generate<T>(entity: Entity<T>): GeneratedAPICode {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural

    const routes = `
// Auto-generated routes for ${entityName}
import express from 'express'
import { ${pluralName}Controller } from './controllers/${pluralName}.controller'
import { permissionMiddleware } from './middleware/permissions'

const router = express.Router()

router.get('/', permissionMiddleware('${pluralName}', 'list'), ${pluralName}Controller.list)
router.get('/:id', permissionMiddleware('${pluralName}', 'read'), ${pluralName}Controller.get)
router.post('/', permissionMiddleware('${pluralName}', 'create'), ${pluralName}Controller.create)
router.put('/:id', permissionMiddleware('${pluralName}', 'update'), ${pluralName}Controller.update)
router.delete('/:id', permissionMiddleware('${pluralName}', 'delete'), ${pluralName}Controller.delete)

export default router
`.trim()

    const controllers = `
// Auto-generated controller for ${entityName}
export class ${pluralName}Controller {
  static async list(req, res) {
    // TODO: Implement list
  }

  static async get(req, res) {
    // TODO: Implement get
  }

  static async create(req, res) {
    // TODO: Implement create
  }

  static async update(req, res) {
    // TODO: Implement update
  }

  static async delete(req, res) {
    // TODO: Implement delete
  }
}
`.trim()

    const middleware = `
// Permission middleware
export function permissionMiddleware(entity: string, action: string) {
  return async (req, res, next) => {
    // TODO: Implement permission check
    next()
  }
}
`.trim()

    return {
      routes,
      controllers,
      middleware,
      validators: '// TODO: Generate validators',
      openapi: '// TODO: Generate OpenAPI spec',
    }
  }
}
