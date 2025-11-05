/**
 * Testing Templates
 * Generates comprehensive test suites (unit, integration, e2e)
 */

import type { Entity } from '../entity'
import { getFieldNames, getEditableFields } from '../utils'
import { ts, conditional, map } from '../tags'

export interface TestingTemplateOptions {
  entity: Entity<any>
  framework: 'vitest' | 'jest' | 'mocha'
  includeUnitTests?: boolean
  includeIntegrationTests?: boolean
  includeE2ETests?: boolean
  includeMocks?: boolean
  testDataFactory?: boolean
}

export function generateUnitTests(options: TestingTemplateOptions): string {
  const { entity, framework = 'vitest', includeMocks = true, testDataFactory = true } = options
  const entityName = entity.name.singular
  const pluralName = entity.name.plural
  const fields = getFieldNames(entity)
  const editableFields = getEditableFields(entity)

  const describe = framework === 'jest' ? 'describe' : 'describe'
  const it = framework === 'jest' ? 'it' : 'it'
  const expect = framework === 'jest' ? 'expect' : 'expect'
  const beforeEach = framework === 'jest' ? 'beforeEach' : 'beforeEach'

  return ts`
import { ${describe}, ${it}, ${expect}, ${beforeEach}${framework === 'vitest' ? ', vi' : ''} } from '${framework === 'vitest' ? 'vitest' : framework === 'jest' ? '@jest/globals' : 'mocha'}'
${conditional(includeMocks, `import { mock${entityName}Service } from '../mocks/${entityName.toLowerCase()}.mock'`)}
${conditional(testDataFactory, `import { create${entityName}, create${entityName}Data } from '../factories/${entityName.toLowerCase()}.factory'`)}

${conditional(includeMocks, `
// Mock the ${entityName} service
vi.mock('../../services/${entityName.toLowerCase()}', () => ({
  ${entityName}Service: mock${entityName}Service
}))
`)}
// Import the service and types
import { ${entityName}Service } from '../../services/${entityName.toLowerCase()}'
import type { ${entityName}, Create${entityName}Input, Update${entityName}Input } from '../../types/${entityName.toLowerCase()}'

${describe}('${entityName}Service', () => {
  let service: ${entityName}Service

  ${beforeEach}(() => {
    service = new ${entityName}Service()
${conditional(includeMocks, `    vi.clearAllMocks()`)}
  })

  ${describe}('create${entityName}', () => {
    ${it}('should create a new ${entityName.toLowerCase()} with valid input', async () => {
${conditional(testDataFactory, `      const input = create${entityName}Data()`)}
${conditional(!testDataFactory, `      const input: Create${entityName}Input = {
${map(editableFields, (field) => {
  const fieldDef = entity.fields[field]
  const fieldType = fieldDef.jsType || 'string'

  let mockValue: string
  switch (fieldType) {
    case 'string':
      mockValue = `'test-${String(field)}'`
      break
    case 'number':
      mockValue = '42'
      break
    case 'boolean':
      mockValue = 'true'
      break
    default:
      mockValue = `'test-${String(field)}'`
  }

  return `        ${String(field)}: ${mockValue},`
})}
      }`)}
      const result = await service.create${entityName}(input)

      ${expect}(result).toBeDefined()
      ${expect}(result.id).toBeDefined()
${map(editableFields, (field) => `      ${expect}(result.${String(field)}).toBe(input.${String(field)})`)}
    })

    ${it}('should throw error for invalid input', async () => {
      const invalidInput = { invalidField: 'value' }

      await ${expect}(service.create${entityName}(invalidInput as any)).rejects.toThrow()
    })

${conditional(includeMocks, `
    ${it}('should handle service errors gracefully', async () => {
      mock${entityName}Service.create.mockRejectedValue(new Error('Database error'))

      const input = create${entityName}Data()
      await ${expect}(service.create${entityName}(input)).rejects.toThrow('Database error')
    })
`)}
  })

  ${describe}('get${entityName}ById', () => {
    ${it}('should return ${entityName.toLowerCase()} when found', async () => {
      const mock${entityName} = create${entityName}({ id: '123' })
${conditional(includeMocks, `      mock${entityName}Service.findById.mockResolvedValue(mock${entityName})`)}

      const result = await service.get${entityName}ById('123')

      ${expect}(result).toEqual(mock${entityName})
    })

    ${it}('should return null when ${entityName.toLowerCase()} not found', async () => {
${conditional(includeMocks, `      mock${entityName}Service.findById.mockResolvedValue(null)`)}

      const result = await service.get${entityName}ById('nonexistent')

      ${expect}(result).toBeNull()
    })

    ${it}('should throw error for invalid id', async () => {
      await ${expect}(service.get${entityName}ById('')).rejects.toThrow()
    })
  })

  ${describe}('update${entityName}', () => {
    ${it}('should update ${entityName.toLowerCase()} successfully', async () => {
      const existing${entityName} = create${entityName}({ id: '123' })
      const updateData: Update${entityName}Input = {
${map(editableFields.slice(0, 2), (field) => {
  const fieldDef = entity.fields[field]
  const fieldType = fieldDef.jsType || 'string'

  let mockValue: string
  switch (fieldType) {
    case 'string':
      mockValue = `'updated-${String(field)}'`
      break
    case 'number':
      mockValue = '99'
      break
    case 'boolean':
      mockValue = 'false'
      break
    default:
      mockValue = `'updated-${String(field)}'`
  }

  return `        ${String(field)}: ${mockValue},`
})}
      }

${conditional(includeMocks, `      mock${entityName}Service.update.mockResolvedValue({ ...existing${entityName}, ...updateData })`)}

      const result = await service.update${entityName}('123', updateData)

      ${expect}(result).toBeDefined()
      ${expect}(result.id).toBe('123')
${map(editableFields.slice(0, 2), (field) => `      ${expect}(result.${String(field)}).toBe(updateData.${String(field)})`)}
    })

    ${it}('should throw error when ${entityName.toLowerCase()} not found', async () => {
${conditional(includeMocks, `      mock${entityName}Service.update.mockRejectedValue(new Error('${entityName} not found'))`)}

      const updateData = { name: 'Updated Name' }
      await ${expect}(service.update${entityName}('nonexistent', updateData)).rejects.toThrow()
    })
  })

  ${describe}('delete${entityName}', () => {
    ${it}('should delete ${entityName.toLowerCase()} successfully', async () => {
${conditional(includeMocks, `      mock${entityName}Service.delete.mockResolvedValue(true)`)}

      const result = await service.delete${entityName}('123')

      ${expect}(result).toBe(true)
${conditional(includeMocks, `      ${expect}(mock${entityName}Service.delete).toHaveBeenCalledWith('123')`)}
    })

    ${it}('should throw error when ${entityName.toLowerCase()} not found', async () => {
${conditional(includeMocks, `      mock${entityName}Service.delete.mockRejectedValue(new Error('${entityName} not found'))`)}

      await ${expect}(service.delete${entityName}('nonexistent')).rejects.toThrow()
    })
  })

  ${describe}('get${pluralName}', () => {
    ${it}('should return paginated ${pluralName.toLowerCase()}', async () => {
      const mock${pluralName} = [create${entityName}(), create${entityName}()]
${conditional(includeMocks, `      mock${entityName}Service.findMany.mockResolvedValue(mock${pluralName})`)}

      const result = await service.get${pluralName}({ page: 1, limit: 10 })

      ${expect}(result.data).toEqual(mock${pluralName})
      ${expect}(result.pagination).toBeDefined()
      ${expect}(result.pagination.page).toBe(1)
    })

    ${it}('should apply filters correctly', async () => {
      const filters = { search: 'test', active: true }
      const filtered${pluralName} = [create${entityName}({ name: 'test item', active: true })]

${conditional(includeMocks, `      mock${entityName}Service.findMany.mockResolvedValue(filtered${pluralName})`)}

      const result = await service.get${pluralName}({ filters })

      ${expect}(result.data).toEqual(filtered${pluralName})
${conditional(includeMocks, `      ${expect}(mock${entityName}Service.findMany).toHaveBeenCalledWith(
        ${expect}.objectContaining({ where: ${expect}.objectContaining(filters) })
      )`)}
    })

    ${it}('should apply sorting correctly', async () => {
      const sort = { field: 'name', order: 'asc' as const }
      const sorted${pluralName} = [create${entityName}()]

${conditional(includeMocks, `      mock${entityName}Service.findMany.mockResolvedValue(sorted${pluralName})`)}

      const result = await service.get${pluralName}({ sort })

      ${expect}(result.data).toEqual(sorted${pluralName})
${conditional(includeMocks, `      ${expect}(mock${entityName}Service.findMany).toHaveBeenCalledWith(
        ${expect}.objectContaining({ orderBy: { name: 'asc' } })
      )`)}
    })
  })

  ${describe}('validation', () => {
    ${it}('should validate required fields', async () => {
      const invalidInput = {} // Missing required fields

      await ${expect}(service.create${entityName}(invalidInput as any)).rejects.toThrow()
    })

    ${it}('should validate field types', async () => {
      const invalidInput = {
        name: 123, // Should be string
        email: 'invalid-email', // Should be valid email
      }

      await ${expect}(service.create${entityName}(invalidInput as any)).rejects.toThrow()
    })

${map(fields.filter(f => entity.fields[f].jsType === 'string'), (field) => {
  const fieldDef = entity.fields[field]
  const maxLength = fieldDef.maxLength || 255

  return `
    ${it}('should validate ${String(field)} length', async () => {
      const longString = 'a'.repeat(${maxLength} + 1)
      const invalidInput = create${entityName}Data({ ${String(field)}: longString })

      await ${expect}(service.create${entityName}(invalidInput)).rejects.toThrow()
    })`
}).join('')}
  })

  ${describe}('edge cases', () => {
    ${it}('should handle concurrent operations safely', async () => {
      const operations = Array(10).fill(null).map(() =>
        service.create${entityName}(create${entityName}Data())
      )

      const results = await Promise.all(operations)

      ${expect}(results).toHaveLength(10)
      results.forEach(result => {
        ${expect}(result.id).toBeDefined()
      })
    })

    ${it}('should handle empty result sets', async () => {
${conditional(includeMocks, `      mock${entityName}Service.findMany.mockResolvedValue([])`)}

      const result = await service.get${pluralName}()

      ${expect}(result.data).toEqual([])
      ${expect}(result.pagination.total).toBe(0)
    })

    ${it}('should prevent SQL injection in search', async () => {
      const maliciousInput = "'; DROP TABLE users; --"
      const filters = { search: maliciousInput }

${conditional(includeMocks, `      mock${entityName}Service.findMany.mockResolvedValue([])`)}

      await service.get${pluralName}({ filters })

${conditional(includeMocks, `      ${expect}(mock${entityName}Service.findMany).toHaveBeenCalledWith(
        ${expect}.objectContaining({
          where: ${expect}.objectContaining({
            OR: ${expect}.arrayContaining([
              ${expect}.objectContaining({
                name: { contains: maliciousInput, mode: 'insensitive' }
              })
            ])
          })
        })
      )`)}
    })
  })
})
`
}

export function generateIntegrationTests(options: TestingTemplateOptions): string {
  const { entity, framework = 'vitest' } = options
  const entityName = entity.name.singular
  const pluralName = entity.name.plural

  const describe = framework === 'jest' ? 'describe' : 'describe'
  const it = framework === 'jest' ? 'it' : 'it'
  const expect = framework === 'jest' ? 'expect' : 'expect'
  const beforeAll = framework === 'jest' ? 'beforeAll' : 'beforeAll'
  const afterAll = framework === 'jest' ? 'afterAll' : 'afterAll'
  const beforeEach = framework === 'jest' ? 'beforeEach' : 'beforeEach'
  const afterEach = framework === 'jest' ? 'afterEach' : 'afterEach'

  return ts`
import { ${describe}, ${it}, ${expect}, ${beforeAll}, ${afterAll}, ${beforeEach}, ${afterEach} } from '${framework === 'vitest' ? 'vitest' : framework === 'jest' ? '@jest/globals' : 'mocha'}'
import { create${entityName}, create${entityName}Data } from '../factories/${entityName.toLowerCase()}.factory'
import { setupTestDatabase, teardownTestDatabase, cleanDatabase } from '../helpers/database.helper'
import { ${entityName}Service } from '../../services/${entityName.toLowerCase()}'
import { apiClient } from '../helpers/api-client.helper'

${describe}('${entityName} API Integration Tests', () => {
  let service: ${entityName}Service
  let api: ReturnType<typeof apiClient>

  ${beforeAll}(async () => {
    await setupTestDatabase()
    service = new ${entityName}Service()
    api = apiClient()
  })

  ${afterAll}(async () => {
    await teardownTestDatabase()
  })

  ${beforeEach}(async () => {
    await cleanDatabase()
  })

  ${describe}('Full CRUD workflow', () => {
    let created${entityName}: any

    ${it}('should create a new ${entityName.toLowerCase()}', async () => {
      const input = create${entityName}Data()

      const response = await api.post('/api/${pluralName}', input)
      ${expect}(response.status).toBe(201)
      ${expect}(response.data.data).toBeDefined()
      ${expect}(response.data.data.id).toBeDefined()

      created${entityName} = response.data.data

      // Verify in database
      const db${entityName} = await service.get${entityName}ById(created${entityName}.id)
      ${expect}(db${entityName}).toEqual(created${entityName})
    })

    ${it}('should retrieve the created ${entityName.toLowerCase()}', async () => {
      const response = await api.get(\`/api/${pluralName}/\${created${entityName}.id}\`)
      ${expect}(response.status).toBe(200)
      ${expect}(response.data.data).toEqual(created${entityName})
    })

    ${it}('should update the ${entityName.toLowerCase()}', async () => {
      const updates = { name: 'Updated Name', active: false }
      const response = await api.put(\`/api/${pluralName}/\${created${entityName}.id}\`, updates)

      ${expect}(response.status).toBe(200)
      ${expect}(response.data.data.name).toBe('Updated Name')
      ${expect}(response.data.data.active).toBe(false)

      // Verify in database
      const db${entityName} = await service.get${entityName}ById(created${entityName}.id)
      ${expect}(db${entityName}.name).toBe('Updated Name')
    })

    ${it}('should list ${pluralName} including the updated item', async () => {
      const response = await api.get('/api/${pluralName}')
      ${expect}(response.status).toBe(200)
      ${expect}(response.data.data).toContainEqual(
        ${expect}.objectContaining({
          id: created${entityName}.id,
          name: 'Updated Name'
        })
      )
    })

    ${it}('should delete the ${entityName.toLowerCase()}', async () => {
      const response = await api.delete(\`/api/${pluralName}/\${created${entityName}.id}\`)
      ${expect}(response.status).toBe(204)

      // Verify deletion
      const db${entityName} = await service.get${entityName}ById(created${entityName}.id)
      ${expect}(db${entityName}).toBeNull()
    })
  })

  ${describe}('List endpoint features', () => {
    ${beforeEach}(async () => {
      // Create test data
      const testData = Array(15).fill(null).map(() => create${entityName}Data())
      for (const data of testData) {
        await service.create${entityName}(data)
      }
    })

    ${it}('should paginate results', async () => {
      const response = await api.get('/api/${pluralName}?page=2&limit=5')
      ${expect}(response.status).toBe(200)
      ${expect}(response.data.data).toHaveLength(5)
      ${expect}(response.data.pagination.page).toBe(2)
      ${expect}(response.data.pagination.totalPages).toBe(3)
      ${expect}(response.data.pagination.hasNext).toBe(true)
      ${expect}(response.data.pagination.hasPrev).toBe(true)
    })

    ${it}('should filter results by search term', async () => {
      // Create a ${entityName} with a specific name
      const special${entityName} = await service.create${entityName}(create${entityName}Data({
        name: 'UniqueTestName123'
      }))

      const response = await api.get('/api/${pluralName}?search=UniqueTestName123')
      ${expect}(response.status).toBe(200)
      ${expect}(response.data.data).toHaveLength(1)
      ${expect}(response.data.data[0].id).toBe(special${entityName}.id)
    })

    ${it}('should sort results', async () => {
      const response = await api.get('/api/${pluralName}?sort=name&order=asc&limit=100')
      ${expect}(response.status).toBe(200)

      const names = response.data.data.map((item: any) => item.name)
      const sortedNames = [...names].sort()
      ${expect}(names).toEqual(sortedNames)
    })
  })

  ${describe}('Error handling', () => {
    ${it}('should return 404 for non-existent ${entityName.toLowerCase()}', async () => {
      const response = await api.get('/api/${pluralName}/nonexistent-id')
      ${expect}(response.status).toBe(404)
      ${expect}(response.data.error).toContain('not found')
    })

    ${it}('should return 400 for invalid data', async () => {
      const invalidData = { name: '', email: 'invalid-email' }
      const response = await api.post('/api/${pluralName}', invalidData)
      ${expect}(response.status).toBe(400)
      ${expect}(response.data.error).toBe('Validation failed')
      ${expect}(response.data.details).toBeDefined()
    })

    ${it}('should handle database connection errors', async () => {
      // This would require mocking database connection failure
      // Implementation depends on your error handling strategy
    })
  })

  ${describe}('Data integrity', () => {
    ${it}('should maintain referential integrity', async () => {
      // Create related entities if applicable
      // Test foreign key constraints
      // This would depend on your entity relationships
    })

    ${it}('should prevent duplicate entries for unique fields', async () => {
      const data = create${entityName}Data({ email: 'unique@test.com' })
      await service.create${entityName}(data)

      const duplicateData = create${entityName}Data({ email: 'unique@test.com' })
      await ${expect}(service.create${entityName}(duplicateData)).rejects.toThrow()
    })
  })

  ${describe}('Performance', () => {
    ${beforeEach}(async () => {
      // Create many test records
      const testData = Array(100).fill(null).map(() => create${entityName}Data())
      const promises = testData.map(data => service.create${entityName}(data))
      await Promise.all(promises)
    })

    ${it}('should handle large datasets efficiently', async () => {
      const startTime = Date.now()
      const response = await api.get('/api/${pluralName}?limit=50')
      const endTime = Date.now()

      ${expect}(response.status).toBe(200)
      ${expect}(response.data.data).toHaveLength(50)
      ${expect}(endTime - startTime).toBeLessThan(1000) // Should respond within 1 second
    })

    ${it}('should support efficient pagination', async () => {
      const pageSizes = [10, 25, 50, 100]

      for (const pageSize of pageSizes) {
        const response = await api.get(\`/api/${pluralName}?limit=\${pageSize}\`)
        ${expect}(response.status).toBe(200)
        ${expect}(response.data.data).toHaveLength(pageSize)
      }
    })
  })
})
`
}

export function generateE2ETests(options: TestingTemplateOptions): string {
  const { entity, framework = 'vitest' } = options
  const entityName = entity.name.singular
  const pluralName = entity.name.plural

  const describe = framework === 'jest' ? 'describe' : 'describe'
  const it = framework === 'jest' ? 'it' : 'it'
  const expect = framework === 'jest' ? 'expect' : 'expect'
  const beforeAll = framework === 'jest' ? 'beforeAll' : 'beforeAll'
  const afterAll = framework === 'jest' ? 'afterAll' : 'afterAll'

  return ts`
import { ${describe}, ${it}, ${expect}, ${beforeAll}, ${afterAll} } from '${framework === 'vitest' ? 'vitest' : framework === 'jest' ? '@jest/globals' : 'mocha'}'
import { test, expect as playwrightExpect } from '@playwright/test'
import { create${entityName}Data } from '../factories/${entityName.toLowerCase()}.factory'

${describe}('${entityName} E2E Tests', () => {
  ${beforeAll}(async () => {
    // Setup test environment
    // This might include starting a test server, seeding database, etc.
  })

  ${afterAll}(async () => {
    // Cleanup test environment
  })

  test.describe('${pluralName} Management', () => {
    test('should display ${pluralName} list', async ({ page }) => {
      await page.goto('/${pluralName}')

      // Check page title
      await playwrightExpect(page).toHaveTitle(/${pluralName}/)

      // Check table/list is visible
      await playwrightExpect(page.locator('[data-testid="${pluralName}-list"]')).toBeVisible()

      // Check create button exists
      await playwrightExpect(page.locator('[data-testid="create-${entityName.toLowerCase()}"]')).toBeVisible()
    })

    test('should create new ${entityName.toLowerCase()}', async ({ page }) => {
      await page.goto('/${pluralName}')

      // Click create button
      await page.locator('[data-testid="create-${entityName.toLowerCase()}"]').click()

      // Wait for create form
      await playwrightExpect(page).toHaveURL(/\/${pluralName}\/create/)

      // Fill form
      const testData = create${entityName}Data()
      await page.fill('[data-testid="name-input"]', testData.name)
      await page.fill('[data-testid="email-input"]', testData.email)
      // Fill other required fields...

      // Submit form
      await page.locator('[data-testid="submit-button"]').click()

      // Should redirect to detail view
      await playwrightExpect(page).toHaveURL(new RegExp(\`/${pluralName}/[a-zA-Z0-9]+\`))

      // Should show success message
      await playwrightExpect(page.locator('[data-testid="success-message"]')).toBeVisible()
    })

    test('should view ${entityName.toLowerCase()} details', async ({ page }) => {
      // First create a ${entityName} via API
      const apiResponse = await page.request.post('/api/${pluralName}', {
        data: create${entityName}Data()
      })
      const created${entityName} = await apiResponse.json()
      const ${entityName.toLowerCase()}Id = created${entityName}.data.id

      // Navigate to detail view
      await page.goto(\`/${pluralName}/\${${entityName.toLowerCase()}Id}\`)

      // Check detail view elements
      await playwrightExpect(page.locator('[data-testid="${entityName.toLowerCase()}-detail"]')).toBeVisible()
      await playwrightExpect(page.locator('[data-testid="edit-button"]')).toBeVisible()
      await playwrightExpect(page.locator('[data-testid="delete-button"]')).toBeVisible()

      // Check data is displayed correctly
      await playwrightExpect(page.locator('[data-testid="name-display"]')).toContainText(created${entityName}.data.name)
    })

    test('should edit ${entityName.toLowerCase()}', async ({ page }) => {
      // Create test ${entityName}
      const apiResponse = await page.request.post('/api/${pluralName}', {
        data: create${entityName}Data()
      })
      const created${entityName} = await apiResponse.json()
      const ${entityName.toLowerCase()}Id = created${entityName}.data.id

      // Navigate to edit form
      await page.goto(\`/${pluralName}/\${${entityName.toLowerCase()}Id}/edit\`)

      // Update form fields
      const updatedName = 'Updated Test Name'
      await page.fill('[data-testid="name-input"]', updatedName)

      // Submit form
      await page.locator('[data-testid="submit-button"]').click()

      // Should redirect to detail view
      await playwrightExpect(page).toHaveURL(\`/${pluralName}/\${${entityName.toLowerCase()}Id}\`)

      // Should show updated data
      await playwrightExpect(page.locator('[data-testid="name-display"]')).toContainText(updatedName)
    })

    test('should delete ${entityName.toLowerCase()}', async ({ page }) => {
      // Create test ${entityName}
      const apiResponse = await page.request.post('/api/${pluralName}', {
        data: create${entityName}Data()
      })
      const created${entityName} = await apiResponse.json()
      const ${entityName.toLowerCase()}Id = created${entityName}.data.id

      // Navigate to detail view
      await page.goto(\`/${pluralName}/\${${entityName.toLowerCase()}Id}\`)

      // Click delete button
      page.on('dialog', dialog => dialog.accept()) // Handle confirmation dialog
      await page.locator('[data-testid="delete-button"]').click()

      // Should redirect to list view
      await playwrightExpect(page).toHaveURL('/${pluralName}')

      // Should show success message
      await playwrightExpect(page.locator('[data-testid="success-message"]')).toContainText('deleted')

      // Verify ${entityName} no longer exists
      const detailResponse = await page.request.get(\`/api/${pluralName}/\${${entityName.toLowerCase()}Id}\`)
      ${expect}(detailResponse.status()).toBe(404)
    })

    test('should handle validation errors', async ({ page }) => {
      await page.goto('/${pluralName}/create')

      // Submit empty form
      await page.locator('[data-testid="submit-button"]').click()

      // Should show validation errors
      await playwrightExpect(page.locator('[data-testid="name-error"]')).toBeVisible()
      await playwrightExpect(page.locator('[data-testid="email-error"]')).toBeVisible()

      // Should not redirect
      await playwrightExpect(page).toHaveURL('/${pluralName}/create')
    })

    test('should handle 404 for non-existent ${entityName.toLowerCase()}', async ({ page }) => {
      await page.goto('/${pluralName}/nonexistent-id')

      // Should show 404 page
      await playwrightExpect(page.locator('[data-testid="not-found"]')).toBeVisible()
      await playwrightExpect(page.locator('text=${entityName} not found')).toBeVisible()
    })
  })

  test.describe('Search and Filter', () => {
    test.beforeEach(async ({ page }) => {
      // Create test data
      const testData = [
        create${entityName}Data({ name: 'Alpha Project', active: true }),
        create${entityName}Data({ name: 'Beta Project', active: false }),
        create${entityName}Data({ name: 'Gamma Project', active: true })
      ]

      for (const data of testData) {
        await page.request.post('/api/${pluralName}', { data })
      }
    })

    test('should search ${pluralName}', async ({ page }) => {
      await page.goto('/${pluralName}')

      // Enter search term
      await page.fill('[data-testid="search-input"]', 'Alpha')

      // Should filter results
      await playwrightExpect(page.locator('[data-testid="${pluralName}-list"]')).toContainText('Alpha Project')
      await playwrightExpect(page.locator('[data-testid="${pluralName}-list"]')).not.toContainText('Beta Project')

      // Clear search
      await page.fill('[data-testid="search-input"]', '')

      // Should show all results
      await playwrightExpect(page.locator('[data-testid="${pluralName}-list"]')).toContainText('Alpha Project')
      await playwrightExpect(page.locator('[data-testid="${pluralName}-list"]')).toContainText('Beta Project')
    })

    test('should sort ${pluralName}', async ({ page }) => {
      await page.goto('/${pluralName}')

      // Sort by name ascending
      await page.selectOption('[data-testid="sort-select"]', 'name')
      await page.click('[data-testid="sort-asc"]')

      // Check order
      const firstItem = page.locator('[data-testid="${pluralName}-item"]').first()
      await playwrightExpect(firstItem).toContainText('Alpha Project')

      // Sort descending
      await page.click('[data-testid="sort-desc"]')

      // Check reverse order
      await playwrightExpect(firstItem).toContainText('Gamma Project')
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/${pluralName}')

      // Should adapt to mobile layout
      await playwrightExpect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()

      // Test mobile interactions
      await page.tap('[data-testid="create-button"]')
      await playwrightExpect(page).toHaveURL(/\/${pluralName}\/create/)
    })

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })

      await page.goto('/${pluralName}')

      // Should show tablet-optimized layout
      // Test tablet-specific interactions
    })
  })

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/${pluralName}')

      // Tab through interactive elements
      await page.keyboard.press('Tab') // Focus first item
      await page.keyboard.press('Tab') // Focus create button

      // Enter should activate
      await page.keyboard.press('Enter')
      await playwrightExpect(page).toHaveURL(/\/${pluralName}\/create/)
    })

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/${pluralName}')

      // Check ARIA labels
      await playwrightExpect(page.locator('[aria-label="Search ${pluralName}"]')).toBeVisible()
      await playwrightExpect(page.locator('[aria-label="Create new ${entityName}"]')).toBeVisible()
    })

    test('should work with screen readers', async ({ page }) => {
      await page.goto('/${pluralName}')

      // Check semantic HTML structure
      await playwrightExpect(page.locator('main')).toBeVisible()
      await playwrightExpect(page.locator('h1')).toContainText('${pluralName}')

      // Check form labels
      const form = page.locator('form')
      await playwrightExpect(form.locator('label[for]')).toHaveCount(await form.locator('input, textarea, select').count())
    })
  })

  test.describe('Performance', () => {
    test('should load ${pluralName} list quickly', async ({ page }) => {
      const startTime = Date.now()

      await page.goto('/${pluralName}')
      await page.waitForSelector('[data-testid="${pluralName}-list"]')

      const loadTime = Date.now() - startTime
      ${expect}(loadTime).toBeLessThan(3000) // Should load within 3 seconds
    })

    test('should handle large datasets', async ({ page }) => {
      // Create many test records via API
      const promises = Array(100).fill(null).map(() =>
        page.request.post('/api/${pluralName}', {
          data: create${entityName}Data()
        })
      )
      await Promise.all(promises)

      // Test pagination performance
      const startTime = Date.now()
      await page.goto('/${pluralName}?page=5&limit=20')
      await page.waitForSelector('[data-testid="${pluralName}-list"]')

      const loadTime = Date.now() - startTime
      ${expect}(loadTime).toBeLessThan(2000) // Should handle pagination quickly
    })
  })
})
`
}

export function generateTestDataFactory(options: TestingTemplateOptions): string {
  const { entity } = options
  const entityName = entity.name.singular
  const pluralName = entity.name.plural
  const fields = getFieldNames(entity)

  return ts`
import { faker } from '@faker-js/faker'
import type { ${entityName}, Create${entityName}Input, Update${entityName}Input } from '../../types/${entityName.toLowerCase()}'

/**
 * Factory functions for generating test data
 */

export interface ${entityName}Overrides {
${map(fields, (field) => {
  const fieldDef = entity.fields[field]
  const fieldType = fieldDef.jsType || 'string'
  const isOptional = fieldDef.optional
  return `  ${String(field)}${isOptional ? '?' : ''}: ${fieldType}`
})}
}

/**
 * Generate a complete ${entityName} object with fake data
 */
export function create${entityName}(overrides: Partial<${entityName}> = {}): ${entityName} {
  const defaults: ${entityName} = {
${map(fields, (field) => {
  const fieldDef = entity.fields[field]
  const fieldType = fieldDef.jsType || 'string'
  const isOptional = fieldDef.optional

  let fakeValue: string
  switch (fieldType) {
    case 'string':
      if (String(field).toLowerCase().includes('email')) {
        fakeValue = 'faker.internet.email()'
      } else if (String(field).toLowerCase().includes('name')) {
        fakeValue = 'faker.person.fullName()'
      } else if (String(field).toLowerCase().includes('description')) {
        fakeValue = 'faker.lorem.paragraph()'
      } else if (String(field).toLowerCase().includes('phone')) {
        fakeValue = 'faker.phone.number()'
      } else if (String(field).toLowerCase().includes('address')) {
        fakeValue = 'faker.location.streetAddress()'
      } else {
        fakeValue = `faker.lorem.words(${String(field).length > 10 ? 3 : 1})`
      }
      break
    case 'number':
      if (String(field).toLowerCase().includes('price') || String(field).toLowerCase().includes('cost')) {
        fakeValue = 'faker.number.float({ min: 10, max: 1000, precision: 0.01 })'
      } else if (String(field).toLowerCase().includes('age')) {
        fakeValue = 'faker.number.int({ min: 18, max: 80 })'
      } else if (String(field).toLowerCase().includes('quantity') || String(field).toLowerCase().includes('count')) {
        fakeValue = 'faker.number.int({ min: 1, max: 100 })'
      } else {
        fakeValue = 'faker.number.int({ min: 1, max: 1000 })'
      }
      break
    case 'boolean':
      fakeValue = 'faker.datatype.boolean()'
      break
    default:
      fakeValue = 'faker.lorem.word()'
  }

  if (String(field) === 'id') {
    fakeValue = 'faker.string.uuid()'
  } else if (String(field).toLowerCase().includes('created') || String(field).toLowerCase().includes('updated')) {
    fakeValue = 'new Date()'
  }

  return `    ${String(field)}: ${fakeValue},`
})}
  }

  return { ...defaults, ...overrides }
}

/**
 * Generate input data for creating a new ${entityName}
 */
export function create${entityName}Data(overrides: Partial<Create${entityName}Input> = {}): Create${entityName}Input {
  const { id, createdAt, updatedAt, ...defaults } = create${entityName}(overrides)
  return defaults as Create${entityName}Input
}

/**
 * Generate input data for updating an existing ${entityName}
 */
export function update${entityName}Data(overrides: Partial<Update${entityName}Input> = {}): Update${entityName}Input {
  const data: Update${entityName}Input = {}

${map(fields.filter(f => f !== 'id'), (field) => {
  const fieldDef = entity.fields[field]
  const fieldType = fieldDef.jsType || 'string'

  let fakeValue: string
  switch (fieldType) {
    case 'string':
      fakeValue = `'Updated ${faker.lorem.word()}'`
      break
    case 'number':
      fakeValue = 'faker.number.int({ min: 1, max: 100 })'
      break
    case 'boolean':
      fakeValue = 'faker.datatype.boolean()'
      break
    default:
      fakeValue = `'Updated ${faker.lorem.word()}'`
  }

  return `  if (overrides.${String(field)} !== undefined) {
    data.${String(field)} = overrides.${String(field)}
  } else {
    data.${String(field)} = ${fakeValue}
  }`
})}

  return data
}

/**
 * Generate an array of ${entityName} objects
 */
export function create${pluralName}(count: number, overrides: Partial<${entityName}>[] = []): ${entityName}[] {
  return Array.from({ length: count }, (_, index) => {
    const override = overrides[index] || {}
    return create${entityName}({
      ...override,
      // Ensure unique fields are unique
      email: override.email || \`test\${index + 1}@example.com\`,
    })
  })
}

/**
 * Generate ${entityName} data with specific scenarios
 */
export const ${entityName}Scenarios = {
  /**
   * Generate a valid ${entityName} with all required fields
   */
  valid: () => create${entityName}(),

  /**
   * Generate a ${entityName} with missing required fields
   */
  invalid: () => {
    const data = create${entityName}()
    // Remove a required field
${fields.filter(f => !entity.fields[f].optional && f !== 'id').slice(0, 1).map(field => `    delete (data as any).${String(field)}`).join('\n')}
    return data
  },

  /**
   * Generate a ${entityName} with maximum length fields
   */
  maxLength: () => create${entityName}({
${fields.filter(f => entity.fields[f].jsType === 'string').map(field => {
  const maxLength = entity.fields[field].maxLength || 255
  return `    ${String(field)}: 'a'.repeat(${maxLength}),`
}).join('\n')}
  }),

  /**
   * Generate a ${entityName} with special characters
   */
  specialChars: () => create${entityName}({
    name: 'Test with @#$%^&*()',
    description: 'Description with <script>alert("xss")</script>',
  }),

  /**
   * Generate a ${entityName} with unicode characters
   */
  unicode: () => create${entityName}({
    name: '测试名称 🚀',
    description: 'Unicode: ñáéíóú 🌟',
  }),

  /**
   * Generate a ${entityName} with edge case values
   */
  edgeCase: () => create${entityName}({
${fields.filter(f => entity.fields[f].jsType === 'number').map(field => `    ${String(field)}: 0,`).join('\n')}
${fields.filter(f => entity.fields[f].jsType === 'boolean').map(field => `    ${String(field)}: false,`).join('\n')}
  }),
}

/**
 * Bulk operations for testing
 */
export const ${entityName}BulkOperations = {
  /**
   * Create multiple ${pluralName} in parallel
   */
  createMany: async (count: number): Promise<${entityName}[]> => {
    const promises = create${pluralName}(count).map(data =>
      // Simulate API call
      Promise.resolve(create${entityName}({ ...data, id: faker.string.uuid() }))
    )
    return Promise.all(promises)
  },

  /**
   * Update multiple ${pluralName}
   */
  updateMany: (items: ${entityName}[], updates: Partial<${entityName}>): ${entityName}[] => {
    return items.map(item => ({ ...item, ...updates }))
  },

  /**
   * Delete multiple ${pluralName}
   */
  deleteMany: (items: ${entityName}[], count: number): ${entityName}[] => {
    return items.slice(count)
  },
}
`
}
