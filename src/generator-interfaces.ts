/**
 * Generator Interfaces
 * Defines the contracts that custom generators must implement
 */

import type { Entity } from './entity'
import type { GeneratorArgs } from './utils/config'

/**
 * Generated database code interface
 */
export interface GeneratedDatabaseCode {
  drizzle: string
  prisma: string
  sql: string
  convex: string
  migrations: string[]
  relationships: string[]
  indexes: string[]
  constraints: string[]
}

/**
 * Generated API code interface
 */
export interface GeneratedAPICode {
  routes: string
  controllers: string
  middleware: string
  validators: string
  openapi: string
  types: string
}

/**
 * Generated frontend code interface
 */
export interface GeneratedFrontendCode {
  routes: Record<string, string> // Route name -> component code
  forms: Record<string, string> // Form name -> component code
  tables: string
  components: Record<string, string>
}

/**
 * Generated test code interface
 */
export interface GeneratedTestCode {
  unit: string[]
  integration: string[]
  e2e: string[]
  permissions: string[]
}

/**
 * Generated documentation interface
 */
export interface GeneratedDocumentation {
  markdown: string
  openapi: string
  permissionMatrix: string
  erd: string // Entity Relationship Diagram
  apiReference: string
  fieldGuide: string
}

/**
 * Database generator interface
 */
export interface DatabaseGenerator {
  /**
   * Generate database code for an entity
   */
  generate<T>(entity: Entity<T>): GeneratedDatabaseCode

  /**
   * Generate database code for multiple entities
   */
  generateMultiple<T>(entities: Entity<T>[]): GeneratedDatabaseCode[]

  /**
   * Generate migration files for entities
   */
  generateMigrations<T>(entities: Entity<T>[], version: string): {
    up: string[]
    down: string[]
    version: string
    description: string
  }
}

/**
 * API generator interface
 */
export interface APIGenerator {
  /**
   * Generate API code for an entity
   */
  generate<T>(entity: Entity<T>, options?: {
    framework?: 'express' | 'fastify' | 'hono' | 'koa'
    includeValidation?: boolean
    includePermissions?: boolean
    includeOpenAPI?: boolean
    includeTypes?: boolean
    basePath?: string
  }): GeneratedAPICode

  /**
   * Generate API code for multiple entities
   */
  generateMultiple<T>(entities: Entity<T>[], options?: {
    framework?: 'express' | 'fastify' | 'hono' | 'koa'
    includeValidation?: boolean
    includePermissions?: boolean
    includeOpenAPI?: boolean
    includeTypes?: boolean
    basePath?: string
  }): GeneratedAPICode[]
}

/**
 * Frontend generator interface
 */
export interface FrontendGenerator {
  /**
   * Generate frontend code for an entity
   */
  generate<T>(entity: Entity<T>, options?: {
    framework?: 'react' | 'vue' | 'svelte' | 'angular'
    includeComponents?: boolean
    includeForms?: boolean
    styling?: 'css' | 'styled-components' | 'tailwind' | 'none'
    componentLibrary?: string
  }): GeneratedFrontendCode

  /**
   * Generate frontend code for multiple entities
   */
  generateMultiple<T>(entities: Entity<T>[], options?: {
    framework?: 'react' | 'vue' | 'svelte' | 'angular'
    includeComponents?: boolean
    includeForms?: boolean
    styling?: 'css' | 'styled-components' | 'tailwind' | 'none'
    componentLibrary?: string
  }): GeneratedFrontendCode[]
}

/**
 * Test generator interface
 */
export interface TestGenerator {
  /**
   * Generate test code for an entity
   */
  generate<T>(entity: Entity<T>, options?: {
    framework?: 'vitest' | 'jest' | 'mocha'
    includeUnitTests?: boolean
    includeIntegrationTests?: boolean
    includeE2ETests?: boolean
    includePermissionTests?: boolean
    testDataFactory?: boolean
    mockExternalDeps?: boolean
  }): GeneratedTestCode

  /**
   * Generate test code for multiple entities
   */
  generateMultiple<T>(entities: Entity<T>[], options?: {
    framework?: 'vitest' | 'jest' | 'mocha'
    includeUnitTests?: boolean
    includeIntegrationTests?: boolean
    includeE2ETests?: boolean
    includePermissionTests?: boolean
    testDataFactory?: boolean
    mockExternalDeps?: boolean
  }): GeneratedTestCode[]
}

/**
 * Documentation generator interface
 */
export interface DocumentationGenerator {
  /**
   * Generate documentation for an entity
   */
  generate<T>(entity: Entity<T>): GeneratedDocumentation

  /**
   * Generate documentation for multiple entities
   */
  generateMultiple<T>(entities: Entity<T>[]): GeneratedDocumentation[]
}

/**
 * Custom generator interface - all generators should implement this
 */
export interface CustomGenerator {
  /**
   * Generate database code (if supported)
   */
  generateDatabase?: (args: GeneratorArgs) => Promise<void>

  /**
   * Generate API code (if supported)
   */
  generateAPI?: (args: GeneratorArgs) => Promise<void>

  /**
   * Generate frontend code (if supported)
   */
  generateFrontend?: (args: GeneratorArgs) => Promise<void>

  /**
   * Generate test code (if supported)
   */
  generateTests?: (args: GeneratorArgs) => Promise<void>

  /**
   * Generate documentation (if supported)
   */
  generateDocumentation?: (args: GeneratorArgs) => Promise<void>
}