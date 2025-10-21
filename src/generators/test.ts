/**
 * Test Code Generator
 * Generate comprehensive tests: unit, integration, e2e, and permission tests
 */

import type { Entity } from '../entity'
import { extractStandardSchema } from '../validators'

/**
 * Generated test code
 */
export interface GeneratedTestCode {
  unit: string[]
  integration: string[]
  e2e: string[]
  permissions: string[]
}

/**
 * Test generation options
 */
export interface TestGeneratorOptions {
  framework: 'vitest' | 'jest' | 'mocha'
  includeUnitTests: boolean
  includeIntegrationTests: boolean
  includeE2ETests: boolean
  includePermissionTests: boolean
  testDataFactory: boolean
  mockExternalDeps: boolean
}

/**
 * Test Code Generator
 */
export class TestGenerator {
  /**
   * Generate all test code for an entity
   */
  static generate<T>(entity: Entity<T>, options: TestGeneratorOptions = {
    framework: 'vitest',
    includeUnitTests: true,
    includeIntegrationTests: true,
    includeE2ETests: true,
    includePermissionTests: true,
    testDataFactory: true,
    mockExternalDeps: true
  }): GeneratedTestCode {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural

    const unit = options.includeUnitTests ? [this.generateUnitTests(entity, options)] : []
    const integration = options.includeIntegrationTests ? [this.generateIntegrationTests(entity, options)] : []
    const e2e = options.includeE2ETests ? [this.generateE2ETests(entity, options)] : []
    const permissions = options.includePermissionTests ? [this.generatePermissionTests(entity, options)] : []

    return { unit, integration, e2e, permissions }
  }

  /**
   * Generate unit tests
   */
  private static generateUnitTests<T>(entity: Entity<T>, options: TestGeneratorOptions): string {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural
    const fields = Object.keys(entity.fields)

    const imports = `import { describe, it, expect, vi, beforeEach } from '${options.framework === 'vitest' ? 'vitest' : 'jest'}'
import { ${entityName}, ${entityName}CreateInput, ${entityName}UpdateInput } from '../types/${pluralName}.types'
${options.testDataFactory ? `import { create${entityName}Factory } from '../test/factories/${pluralName}.factory'` : ''}
${options.mockExternalDeps ? `import { mock${entityName}Repository } from '../test/mocks/${pluralName}.mock'` : ''}`

    const factoryCode = options.testDataFactory ? `
// Test data factory
const valid${entityName}Data = create${entityName}Factory.build()
const invalid${entityName}Data = create${entityName}Factory.build({
  // Invalid data for testing validation
  ${fields[0]}: '', // Assuming first field is required
})` : `
// Test data
const valid${entityName}Data: ${entityName}CreateInput = {
  ${fields.map(f => `${f}: 'test-value'`).join(',\n  ')}
}
const invalid${entityName}Data = {
  ${fields[0]}: '', // Invalid data
}`

    const validationTests = `
// Validation tests
describe('${entityName} Validation', () => {
  it('should validate valid ${entityName} data', () => {
    const schema = extractStandardSchema(entity.fields.${fields[0]})
    if (schema) {
      const result = schema.safeParse(valid${entityName}Data.${fields[0]})
      expect(result.success).toBe(true)
    }
  })

  it('should reject invalid ${entityName} data', () => {
    const schema = extractStandardSchema(entity.fields.${fields[0]})
    if (schema) {
      const result = schema.safeParse(invalid${entityName}Data.${fields[0]})
      expect(result.success).toBe(false)
    }
  })
})`

    const mutationTests = entity.mutators ? `
// Mutation tests
describe('${entityName} Mutations', () => {
  ${options.mockExternalDeps ? `let mockRepo: ReturnType<typeof mock${entityName}Repository>

  beforeEach(() => {
    mockRepo = mock${entityName}Repository()
  })` : ''}

  ${Object.entries(entity.mutators).map(([mutatorName, mutator]) => `
  describe('${mutatorName}', () => {
    it('should execute ${mutatorName} successfully', async () => {
      ${options.mockExternalDeps ? `mockRepo.${mutatorName}.mockResolvedValue(valid${entityName}Data)` : ''}

      const result = await entity.mutators.${mutatorName}(${mutatorName === 'createOne' ? 'valid${entityName}Data' : `'test-id'`})

      expect(result.success).toBe(true)
      ${options.mockExternalDeps ? `expect(mockRepo.${mutatorName}).toHaveBeenCalledWith(${mutatorName === 'createOne' ? 'valid${entityName}Data' : `'test-id'`})` : ''}
    })

    it('should handle ${mutatorName} errors', async () => {
      ${options.mockExternalDeps ? `mockRepo.${mutatorName}.mockRejectedValue(new Error('Test error'))` : ''}

      const result = await entity.mutators.${mutatorName}(${mutatorName === 'createOne' ? 'valid${entityName}Data' : `'test-id'`})

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })`).join('\n')}
})` : ''

    const computedFieldTests = entity.computed ? `
// Computed field tests
describe('${entityName} Computed Fields', () => {
  ${Object.entries(entity.computed).map(([fieldName, config]) => `
  it('should compute ${fieldName}', () => {
    const entity = valid${entityName}Data
    const result = config.compute(entity)
    expect(result).toBeDefined()
    // Add specific assertions based on computed field logic
  })`).join('\n')}
})` : ''

    return `${imports}

${factoryCode}

describe('${entityName} Unit Tests', () => {
  ${validationTests}

  ${mutationTests}

  ${computedFieldTests}
})
`
  }

  /**
   * Generate integration tests
   */
  private static generateIntegrationTests<T>(entity: Entity<T>, options: TestGeneratorOptions): string {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural

    const imports = `import { describe, it, expect, beforeAll, afterAll, beforeEach } from '${options.framework === 'vitest' ? 'vitest' : 'jest'}'
import request from 'supertest'
import { app } from '../app'
import { createTestDatabase, cleanupTestDatabase } from '../test/utils/database'
${options.testDataFactory ? `import { create${entityName}Factory } from '../test/factories/${pluralName}.factory'` : ''}`

    const setupCode = `
// Test database setup
let testDb: any

beforeAll(async () => {
  testDb = await createTestDatabase()
})

afterAll(async () => {
  await cleanupTestDatabase(testDb)
})

beforeEach(async () => {
  // Clean up data between tests
  await testDb.collection('${pluralName}').deleteMany({})
})`

    const apiTests = `
// API Integration tests
describe('${entityName} API Integration', () => {
  ${options.testDataFactory ? `const test${entityName} = create${entityName}Factory.build()` : `const test${entityName} = { id: 'test-id', name: 'Test ${entityName}' }`}

  describe('POST /api/${pluralName}', () => {
    it('should create a new ${entityName}', async () => {
      const response = await request(app)
        .post('/api/${pluralName}')
        .send(test${entityName})
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject(test${entityName})
      expect(response.body.data.id).toBeDefined()
    })

    it('should validate input data', async () => {
      const invalidData = { ...test${entityName}, name: '' } // Invalid data

      const response = await request(app)
        .post('/api/${pluralName}')
        .send(invalidData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBeDefined()
    })
  })

  describe('GET /api/${pluralName}', () => {
    beforeEach(async () => {
      // Create test data
      await request(app)
        .post('/api/${pluralName}')
        .send(test${entityName})
    })

    it('should list ${pluralName}', async () => {
      const response = await request(app)
        .get('/api/${pluralName}')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data.items)).toBe(true)
      expect(response.body.data.items.length).toBeGreaterThan(0)
    })

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/${pluralName}?page=1&limit=10')
        .expect(200)

      expect(response.body.data.pagination).toBeDefined()
      expect(response.body.data.pagination.page).toBe(1)
      expect(response.body.data.pagination.limit).toBe(10)
    })

    it('should support filtering', async () => {
      const response = await request(app)
        .get('/api/${pluralName}?name=Test')
        .expect(200)

      expect(response.body.success).toBe(true)
    })
  })

  describe('GET /api/${pluralName}/:id', () => {
    let created${entityName}: any

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/${pluralName}')
        .send(test${entityName})
      created${entityName} = response.body.data
    })

    it('should get a single ${entityName}', async () => {
      const response = await request(app)
        .get(\`/api/${pluralName}/\${created${entityName}.id}\`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject(created${entityName})
    })

    it('should return 404 for non-existent ${entityName}', async () => {
      const response = await request(app)
        .get('/api/${pluralName}/non-existent-id')
        .expect(404)

      expect(response.body.success).toBe(false)
    })
  })

  describe('PUT /api/${pluralName}/:id', () => {
    let created${entityName}: any

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/${pluralName}')
        .send(test${entityName})
      created${entityName} = response.body.data
    })

    it('should update a ${entityName}', async () => {
      const updateData = { ...test${entityName}, name: 'Updated ${entityName}' }

      const response = await request(app)
        .put(\`/api/${pluralName}/\${created${entityName}.id}\`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe('Updated ${entityName}')
    })
  })

  describe('DELETE /api/${pluralName}/:id', () => {
    let created${entityName}: any

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/${pluralName}')
        .send(test${entityName})
      created${entityName} = response.body.data
    })

    it('should delete a ${entityName}', async () => {
      await request(app)
        .delete(\`/api/${pluralName}/\${created${entityName}.id}\`)
        .expect(200)

      // Verify it's deleted
      await request(app)
        .get(\`/api/${pluralName}/\${created${entityName}.id}\`)
        .expect(404)
    })
  })
})`

    return `${imports}

${setupCode}

${apiTests}
`
  }

  /**
   * Generate E2E tests
   */
  private static generateE2ETests<T>(entity: Entity<T>, options: TestGeneratorOptions): string {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural

    const imports = `import { test, expect } from '@playwright/test'
${options.testDataFactory ? `import { create${entityName}Factory } from '../test/factories/${pluralName}.factory'` : ''}`

    const e2eTests = `
// E2E tests for ${entityName}
test.describe('${entityName} Management', () => {
  ${options.testDataFactory ? `const test${entityName} = create${entityName}Factory.build()` : `const test${entityName} = { name: 'E2E Test ${entityName}' }`}

  test('should create, read, update, and delete ${entityName}', async ({ page }) => {
    // Navigate to ${pluralName} page
    await page.goto('/${pluralName}')

    // Click create button
    await page.getByRole('button', { name: 'Create ${entityName}' }).click()

    // Fill form
    await page.getByLabel('Name').fill(test${entityName}.name)
    // Fill other fields...

    // Submit form
    await page.getByRole('button', { name: 'Create ${entityName}' }).click()

    // Verify success message
    await expect(page.getByText('${entityName} created successfully')).toBeVisible()

    // Verify ${entityName} appears in list
    await expect(page.getByText(test${entityName}.name)).toBeVisible()

    // Click edit button
    await page.getByRole('button', { name: 'Edit' }).first().click()

    // Update data
    await page.getByLabel('Name').fill('Updated ${entityName}')
    await page.getByRole('button', { name: 'Update ${entityName}' }).click()

    // Verify update success
    await expect(page.getByText('${entityName} updated successfully')).toBeVisible()
    await expect(page.getByText('Updated ${entityName}')).toBeVisible()

    // Delete ${entityName}
    await page.getByRole('button', { name: 'Delete' }).first().click()

    // Confirm deletion
    await page.getByRole('button', { name: 'Confirm' }).click()

    // Verify deletion
    await expect(page.getByText('Updated ${entityName}')).not.toBeVisible()
  })

  test('should validate form inputs', async ({ page }) => {
    await page.goto('/${pluralName}/create')

    // Try to submit empty form
    await page.getByRole('button', { name: 'Create ${entityName}' }).click()

    // Verify validation errors
    await expect(page.getByText('Name is required')).toBeVisible()
  })

  test('should handle permissions correctly', async ({ page }) => {
    // Test with different user roles
    // This would require authentication setup in E2E tests
    await page.goto('/${pluralName}')

    // Verify permission-based UI elements
    // e.g., admin-only buttons should be visible/hidden based on role
  })
})`

    return `${imports}

${e2eTests}
`
  }

  /**
   * Generate permission tests
   */
  private static generatePermissionTests<T>(entity: Entity<T>, options: TestGeneratorOptions): string {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural

    const imports = `import { describe, it, expect, vi, beforeEach } from '${options.framework === 'vitest' ? 'vitest' : 'jest'}'
import { PermissionEngine } from '../permissions/PermissionEngine'
import { createTestUser } from '../test/utils/auth'
${options.testDataFactory ? `import { create${entityName}Factory } from '../test/factories/${pluralName}.factory'` : ''}`

    const permissionTests = `
// Permission tests for ${entityName}
describe('${entityName} Permissions', () => {
  let permissionEngine: PermissionEngine
  ${options.testDataFactory ? `const test${entityName} = create${entityName}Factory.build()` : `const test${entityName} = { id: 'test-id', name: 'Test ${entityName}' }`}

  beforeEach(() => {
    permissionEngine = new PermissionEngine()
  })

  describe('Role-based permissions', () => {
    it('should allow admin to perform all actions', () => {
      const adminUser = createTestUser({ roles: ['admin'] })

      expect(permissionEngine.check(adminUser, test${entityName}, 'create')).toBe(true)
      expect(permissionEngine.check(adminUser, test${entityName}, 'read')).toBe(true)
      expect(permissionEngine.check(adminUser, test${entityName}, 'update')).toBe(true)
      expect(permissionEngine.check(adminUser, test${entityName}, 'delete')).toBe(true)
    })

    it('should restrict user permissions', () => {
      const regularUser = createTestUser({ roles: ['user'] })

      expect(permissionEngine.check(regularUser, test${entityName}, 'create')).toBe(true)
      expect(permissionEngine.check(regularUser, test${entityName}, 'read')).toBe(true)
      expect(permissionEngine.check(regularUser, test${entityName}, 'update')).toBe(false) // Users can't update others' items
      expect(permissionEngine.check(regularUser, test${entityName}, 'delete')).toBe(false)
    })

    it('should deny access for unauthorized users', () => {
      const unauthorizedUser = createTestUser({ roles: [] })

      expect(permissionEngine.check(unauthorizedUser, test${entityName}, 'create')).toBe(false)
      expect(permissionEngine.check(unauthorizedUser, test${entityName}, 'read')).toBe(false)
      expect(permissionEngine.check(unauthorizedUser, test${entityName}, 'update')).toBe(false)
      expect(permissionEngine.check(unauthorizedUser, test${entityName}, 'delete')).toBe(false)
    })
  })

  describe('Ownership-based permissions', () => {
    it('should allow owners to modify their items', () => {
      const owner = createTestUser({ id: 'owner-id', roles: ['user'] })
      const owned${entityName} = { ...test${entityName}, userId: 'owner-id' }

      expect(permissionEngine.check(owner, owned${entityName}, 'update')).toBe(true)
      expect(permissionEngine.check(owner, owned${entityName}, 'delete')).toBe(true)
    })

    it('should deny non-owners from modifying others items', () => {
      const nonOwner = createTestUser({ id: 'non-owner-id', roles: ['user'] })
      const others${entityName} = { ...test${entityName}, userId: 'owner-id' }

      expect(permissionEngine.check(nonOwner, others${entityName}, 'update')).toBe(false)
      expect(permissionEngine.check(nonOwner, others${entityName}, 'delete')).toBe(false)
    })
  })

  describe('Organization-based permissions', () => {
    it('should allow org members to access org resources', () => {
      const orgUser = createTestUser({
        roles: ['user'],
        organizationId: 'org-1'
      })
      const org${entityName} = { ...test${entityName}, organizationId: 'org-1' }

      expect(permissionEngine.check(orgUser, org${entityName}, 'read')).toBe(true)
    })

    it('should deny access to resources from other organizations', () => {
      const orgUser = createTestUser({
        roles: ['user'],
        organizationId: 'org-1'
      })
      const otherOrg${entityName} = { ...test${entityName}, organizationId: 'org-2' }

      expect(permissionEngine.check(orgUser, otherOrg${entityName}, 'read')).toBe(false)
    })
  })

  describe('Field-level permissions', () => {
    it('should mask sensitive fields for unauthorized users', () => {
      const regularUser = createTestUser({ roles: ['user'] })
      const ${entityName}WithSensitiveData = {
        ...test${entityName},
        ssn: '123-45-6789',
        salary: 100000
      }

      const masked = permissionEngine.maskFields(regularUser, ${entityName}WithSensitiveData)

      expect(masked.ssn).toBe('***-**-****') // Masked
      expect(masked.salary).toBeUndefined() // Hidden
    })

    it('should show all fields to authorized users', () => {
      const adminUser = createTestUser({ roles: ['admin'] })
      const ${entityName}WithSensitiveData = {
        ...test${entityName},
        ssn: '123-45-6789',
        salary: 100000
      }

      const masked = permissionEngine.maskFields(adminUser, ${entityName}WithSensitiveData)

      expect(masked.ssn).toBe('123-45-6789') // Not masked
      expect(masked.salary).toBe(100000) // Visible
    })
  })

  describe('Temporal permissions', () => {
    it('should enforce time-based access restrictions', () => {
      const user = createTestUser({ roles: ['user'] })

      // Mock current time to be outside business hours
      vi.setSystemTime(new Date('2024-01-01T02:00:00Z')) // 2 AM

      expect(permissionEngine.check(user, test${entityName}, 'update')).toBe(false)

      // Mock current time to be during business hours
      vi.setSystemTime(new Date('2024-01-01T14:00:00Z')) // 2 PM

      expect(permissionEngine.check(user, test${entityName}, 'update')).toBe(true)
    })
  })
})`

    return `${imports}

${permissionTests}
`
  }
}