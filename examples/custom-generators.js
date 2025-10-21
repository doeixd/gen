/**
 * Custom Generator Script Example
 *
 * This file demonstrates how to create custom generators that extend or replace
 * the built-in generators using the new generator interface architecture.
 *
 * The new architecture allows you to:
 * - Use specific generators for different targets (Drizzle, Prisma, Express, React, etc.)
 * - Combine multiple generators in a single script
 * - Override built-in generators with custom implementations
 *
 * Usage:
 *   npx gen --generatorScript=./examples/custom-generators.js --config=./examples/custom-config.js
 */

// Import the specific generators we want to use
import { DrizzleGenerator } from '../generators/database/drizzle.js'
import { PrismaGenerator } from '../generators/database/prisma.js'
import { ExpressAPIGenerator } from '../generators/api/express.js'
import { ReactFrontendGenerator } from '../generators/frontend/react.js'

// Mock utilities for this example
const ok = (value) => ({ success: true, data: value })
const err = (error) => ({ success: false, error })

const logger = {
  section: (msg) => console.log(`\n${msg}`),
  subsection: (msg) => console.log(`  ${msg}`),
  success: (msg) => console.log(`  ✅ ${msg}`),
  error: (msg) => console.error(`  ❌ ${msg}`),
  incrementTables: () => {}
}

const ensureDirectory = async (dir) => ok(undefined)
const writeFile = async (filePath, content, options) => {
  if (options?.dryRun) {
    console.log(`Would write to: ${filePath}`)
    return ok(undefined)
  }
  console.log(`Writing to: ${filePath}`)
  return ok(undefined)
}

/**
 * Custom database generator
 * Uses the new generator architecture to combine multiple database generators
 */
export async function generateDatabase(args) {
  try {
    const { config, entities } = args
    logger.section('🗄️  Custom Database Generation')

    // Ensure output directories exist
    const dbDirResult = ensureDirectory(config.paths.database)
    if (dbDirResult.isErr()) return err(dbDirResult.error)

    for (const entity of entities) {
      logger.subsection(`Processing ${entity.name.singular}`)

      // Use specific generators for different database targets
      if (config.targets.includes('drizzle')) {
        const drizzleCode = DrizzleGenerator.generate(entity)
        logger.success(`Generated Drizzle schema for ${entity.name.singular}`)
        // In real implementation: writeFile(`${config.paths.database}/drizzle/${entity.db.table.name}.ts`, drizzleCode)
      }

      if (config.targets.includes('prisma')) {
        const prismaCode = PrismaGenerator.generate(entity)
        logger.success(`Generated Prisma schema for ${entity.name.singular}`)
        // In real implementation: writeFile(`${config.paths.database}/prisma/${entity.db.table.name}.prisma`, prismaCode)
      }

      // Custom logic: Add timestamp to table names for SQL
      if (config.targets.includes('sql')) {
        const timestampedTableName = `${entity.db.table.name}_${Date.now()}`
        const customSQL = `CREATE TABLE ${timestampedTableName} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom indexes
CREATE INDEX idx_${timestampedTableName}_created_at ON ${timestampedTableName}(created_at);
`
        logger.success(`Generated custom SQL schema for ${entity.name.singular}`)
        // In real implementation: writeFile(`${config.paths.database}/custom_${entity.db.table.name}.sql`, customSQL)
      }

      logger.incrementTables()
    }

    return ok(undefined)
  } catch (error) {
    return err({
      code: 'CODE_GENERATION_ERROR',
      message: `Custom database generation failed: ${error.message}`,
      cause: error
    })
  }
}

/**
 * Custom API generator
 * Uses Express API generator with custom middleware
 */
export async function generateAPI(args) {
  try {
    const { config, entities } = args
    logger.section('🚀 Custom API Generation')

    // Ensure output directories exist
    const apiDirResult = ensureDirectory(config.paths.api)
    if (apiDirResult.isErr()) return err(apiDirResult.error)

    for (const entity of entities) {
      logger.subsection(`Processing ${entity.name.singular}`)

      // Use the Express API generator
      const apiCode = ExpressAPIGenerator.generate(entity, {
        framework: config.api.framework,
        includeValidation: config.api.includeValidation,
        includePermissions: config.api.includePermissions,
        includeOpenAPI: config.api.includeOpenAPI,
        includeTypes: config.api.includeTypes,
        basePath: config.api.basePath
      })

      // Custom modification: Add rate limiting middleware
      const customRoutes = `import express from 'express'
import rateLimit from 'express-rate-limit'
import { ${entity.name.plural}Controller } from './controllers/${entity.name.plural}.controller.js'

const router = express.Router()

// Custom rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})

// Apply rate limiting to all routes
router.use(limiter)

// Custom authentication middleware
router.use((req, res, next) => {
  // Custom auth logic here
  const apiKey = req.headers['x-api-key']
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' })
  }
  // Validate API key...
  next()
})

// CRUD routes with custom middleware
router.get('/', ${entity.name.plural}Controller.list)
router.post('/', ${entity.name.plural}Controller.create)
router.get('/:id', ${entity.name.plural}Controller.get)
router.put('/:id', ${entity.name.plural}Controller.update)
router.delete('/:id', ${entity.name.plural}Controller.delete)

export default router`

      logger.success(`Generated custom API routes for ${entity.name.singular}`)
      logger.success(`Generated API controllers for ${entity.name.singular}`)
      logger.success(`Generated API middleware for ${entity.name.singular}`)
      logger.success(`Generated API validators for ${entity.name.singular}`)
      logger.success(`Generated API types for ${entity.name.singular}`)

      logger.incrementTables()
    }

    return ok(undefined)
  } catch (error) {
    return err({
      code: 'CODE_GENERATION_ERROR',
      message: `Custom API generation failed: ${error.message}`,
      cause: error
    })
  }
}

/**
 * Custom frontend generator
 * Uses React generator with custom styling
 */
export async function generateFrontend(args) {
  try {
    const { config, entities } = args
    logger.section('🎨 Custom Frontend Generation')

    // Ensure output directories exist
    const frontendDirResult = ensureDirectory(config.paths.frontend)
    if (frontendDirResult.isErr()) return err(frontendDirResult.error)

    for (const entity of entities) {
      logger.subsection(`Processing ${entity.name.singular}`)

      // Use the React frontend generator
      const frontendCode = ReactFrontendGenerator.generate(entity, {
        framework: config.frontend.framework,
        includeComponents: config.frontend.includeComponents,
        includeForms: config.frontend.includeForms,
        styling: config.frontend.styling,
        componentLibrary: config.frontend.componentLibrary
      })

      // Custom modification: Add styled-components wrapper
      const customComponent = `import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import styled from 'styled-components'

// Custom styled components
const Card = styled.div\`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 2rem;
  color: white;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  margin: 1rem 0;
\`

const Button = styled.button\`
  background: \${props => props.variant === 'primary' ? '#ff6b6b' : '#4ecdc4'};
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
  }
\`

export function ${entity.name.singular}Card({ id }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Custom data fetching logic
    fetch(\`/api/${entity.name.plural.toLowerCase()}/\${id}\`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Card>Loading ${entity.name.singular}...</Card>
  if (!data) return <Card>${entity.name.singular} not found</Card>

  return (
    <Card>
      <h3>{data.name || data.title || '${entity.name.singular} #' + id}</h3>
      <p>Custom styled ${entity.name.singular.toLowerCase()} component</p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <Button variant="primary">Edit</Button>
        <Button variant="secondary">View Details</Button>
      </div>
    </Card>
  )
}`

      logger.success(`Generated custom React components for ${entity.name.singular}`)
      logger.incrementTables()
    }

    return ok(undefined)
  } catch (error) {
    return err({
      code: 'CODE_GENERATION_ERROR',
      message: `Custom frontend generation failed: ${error.message}`,
      cause: error
    })
  }
}

/**
 * Custom test generator
 * Generates integration tests with custom setup
 */
export async function generateTests(args) {
  try {
    const { config, entities } = args
    logger.section('🧪 Custom Test Generation')

    // Ensure output directories exist
    const testsDirResult = ensureDirectory(config.paths.tests)
    if (testsDirResult.isErr()) return err(testsDirResult.error)

    for (const entity of entities) {
      logger.subsection(`Processing ${entity.name.singular}`)

      // Custom test generation with enhanced features
      const customTest = `import { describe, it, expect, beforeAll, afterAll } from '${config.tests.framework}'
import { setupTestDatabase, teardownTestDatabase } from '../utils/test-helpers'
import { create${entity.name.singular}Factory } from '../factories/${entity.name.plural.toLowerCase()}.factory'

describe('Custom ${entity.name.singular} Integration Tests', () => {
  let testDb

  beforeAll(async () => {
    testDb = await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase(testDb)
  })

  describe('Custom Business Logic', () => {
    it('should handle custom ${entity.name.singular.toLowerCase()} operations', async () => {
      const testData = create${entity.name.singular}Factory.build({
        // Custom test data
        customField: 'test-value'
      })

      // Custom test logic here
      expect(testData).toBeDefined()
      expect(testData.customField).toBe('test-value')
    })

    it('should validate custom business rules', async () => {
      // Custom validation tests
      const invalidData = create${entity.name.singular}Factory.build({
        // Invalid data for custom rules
      })

      // Test custom validation logic
      expect(invalidData).toBeDefined()
    })
  })

  describe('Performance Tests', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now()

      // Bulk operation test
      const items = create${entity.name.singular}Factory.buildList(100)

      const endTime = Date.now()
      const duration = endTime - startTime

      // Assert performance requirements
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
      expect(items).toHaveLength(100)
    })
  })
})`

      logger.success(`Generated custom integration tests for ${entity.name.singular}`)
      logger.incrementTables()
    }

    return ok(undefined)
  } catch (error) {
    return err({
      code: 'CODE_GENERATION_ERROR',
      message: `Custom test generation failed: ${error.message}`,
      cause: error
    })
  }
}

/**
 * Custom documentation generator
 * Generates documentation with custom branding
 */
export async function generateDocumentation(args) {
  try {
    const { config, entities } = args
    logger.section('📚 Custom Documentation Generation')

    // Ensure output directories exist
    const docsDirResult = ensureDirectory(config.paths.docs)
    if (docsDirResult.isErr()) return err(docsDirResult.error)

    // Generate custom README
    const customReadme = `# 🚀 Custom Generated API

This API was generated with custom generators and includes enhanced features.

## Features

- ✨ Custom styling and components
- 🔒 Enhanced security middleware
- 📊 Performance monitoring
- 🎨 Beautiful UI components

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Run custom generators
npx gen --generatorScript=./examples/custom-generators.js --config=./examples/custom-config.js
\`\`\`

## API Endpoints

${entities.map(entity => `### ${entity.name.plural}
- \`GET /api/${entity.name.plural.toLowerCase()}\` - List ${entity.name.plural}
- \`POST /api/${entity.name.plural.toLowerCase()}\` - Create ${entity.name.singular}
- \`GET /api/${entity.name.plural.toLowerCase()}/:id\` - Get ${entity.name.singular}
- \`PUT /api/${entity.name.plural.toLowerCase()}/:id\` - Update ${entity.name.singular}
- \`DELETE /api/${entity.name.plural.toLowerCase()}/:id\` - Delete ${entity.name.singular}
`).join('\n')}

## Custom Components

${entities.map(entity => `- \`Custom${entity.name.singular}Card\` - Beautiful styled component for ${entity.name.plural.toLowerCase()}`).join('\n')}

---

*Generated with ❤️ by custom generators*
`

    logger.success('Generated custom README with enhanced features')

    return ok(undefined)
  } catch (error) {
    return err({
      code: 'CODE_GENERATION_ERROR',
      message: `Custom documentation generation failed: ${error.message}`,
      cause: error
    })
  }
}