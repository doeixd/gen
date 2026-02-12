/**
 * Configuration utilities
 */

import path from 'path'
import fs from 'fs'
import { Result, ok, err } from 'neverthrow'
import { GeneratorError, GeneratorErrorCode } from './errors'
import type { CustomGenerator } from '../generator-interfaces'

/**
 * Loaded argument file
 */
export interface LoadedArgFile {
  filePath: string
  args: any
}

/**
 * Generator arguments passed to custom generators
 */
export interface GeneratorArgs {
  config: GeneratorConfig
  entities: any[]
  argFiles: LoadedArgFile[]
  customGenerators?: CustomGenerator
}

export interface GeneratorConfig {
  // Core settings
  dryRun: boolean
  overwrite: boolean
  createBackups: boolean
  logLevel: 'error' | 'warn' | 'info' | 'debug'

  // Custom generator script
  generatorScript?: string

  // Custom config file
  configFile?: string

  // Additional argument files
  argFiles?: string[]

  // File header options
  header: {
    includeHeader: boolean
    eslintDisable: boolean
  }

  // Paths
  paths: {
    schema: string
    database: string
    backend: string
    api: string
    frontend: string
    tests: string
    docs: string
  }

  // Targets
  targets: string[]

  // Codegen options
  codegen: {
    includeErrorMessages: boolean
    useStandardSchema: boolean
  }

  // API options
  api: {
    framework: string
    includeValidation: boolean
    includePermissions: boolean
    includeOpenAPI: boolean
    includeTypes: boolean
    basePath: string
  }

  // Frontend options
  frontend: {
    includeComponents: boolean
    includeForms: boolean
    framework: string
    styling: 'css' | 'styled-components' | 'tailwind' | 'none'
    componentLibrary?: string
  }

  // Component configuration
  components: {
    // Component mappings for different field types
    mappings: {
      form: Record<string, string>
      display: Record<string, string>
      layout: Record<string, string>
    }
    // Form configuration
    forms: {
      validation: 'zod' | 'yup' | 'joi' | 'none'
      submitHandler: string
      errorHandling: 'inline' | 'toast' | 'modal'
      layout: 'vertical' | 'horizontal' | 'grid'
    }
    // Custom component props
    props: Record<string, Record<string, any>>
    // Field-specific overrides
    fieldOverrides: Record<string, Record<string, any>>
  }

  // Test options
  tests: {
    framework: string
    includeUnitTests: boolean
    includeIntegrationTests: boolean
    includeE2ETests: boolean
    includePermissionTests: boolean
    testDataFactory: boolean
    mockExternalDeps: boolean
  }

  // Selective generation
  tables?: string[]
  skipTables?: string[]

  // File options
  files: {
    extension: string
  }

  // Integration-specific options
  integrations: {
    convexAuthMode: 'scaffold' | 'patch'
    spacetimeAuthMode: 'scaffold' | 'patch'
    zeroAuthMode: 'scaffold' | 'patch'
    convexAuthProfile: 'minimal' | 'prod-ready' | 'existing-app-merge'
    spacetimeAuthProfile: 'minimal' | 'prod-ready' | 'existing-app-merge'
    zeroAuthProfile: 'minimal' | 'prod-ready' | 'existing-app-merge'
  }
}

export const DEFAULT_CONFIG: GeneratorConfig = {
  dryRun: false,
  overwrite: true,
  createBackups: true,
  logLevel: 'info',
  header: {
    includeHeader: true,
    eslintDisable: true
  },
  paths: {
    schema: './schema.ts',
    database: './generated/database',
    backend: './generated/backend',
    api: './generated/api',
    frontend: './generated/frontend',
    tests: './generated/tests',
    docs: './generated/docs'
  },
  targets: ['database', 'api', 'frontend', 'tests', 'docs'],
  codegen: {
    includeErrorMessages: true,
    useStandardSchema: true
  },
  api: {
    framework: 'express',
    includeValidation: true,
    includePermissions: true,
    includeOpenAPI: true,
    includeTypes: true,
    basePath: '/api'
  },
  frontend: {
    includeComponents: true,
    includeForms: true,
    framework: 'react',
    styling: 'css',
  },
  components: {
    mappings: {
      form: {
        string: 'TextField',
        number: 'NumberField',
        boolean: 'Checkbox',
        date: 'DatePicker',
        email: 'TextField',
        url: 'TextField',
        textarea: 'TextArea',
        select: 'Select',
        file: 'FileInput',
      },
      display: {
        string: 'Text',
        number: 'Number',
        boolean: 'Badge',
        date: 'DateTime',
        email: 'Email',
        url: 'Link',
        currency: 'Currency',
      },
      layout: {
        form: 'Form',
        field: 'Field',
        label: 'Label',
        error: 'ErrorMessage',
        submit: 'Button',
      },
    },
    forms: {
      validation: 'zod',
      submitHandler: 'handleSubmit',
      errorHandling: 'inline',
      layout: 'vertical',
    },
    props: {},
    fieldOverrides: {},
  },
  tests: {
    framework: 'vitest',
    includeUnitTests: true,
    includeIntegrationTests: true,
    includeE2ETests: true,
    includePermissionTests: true,
    testDataFactory: true,
    mockExternalDeps: true
  },
  files: {
    extension: 'ts'
  },
  integrations: {
    convexAuthMode: 'scaffold',
    spacetimeAuthMode: 'scaffold',
    zeroAuthMode: 'scaffold',
    convexAuthProfile: 'prod-ready',
    spacetimeAuthProfile: 'prod-ready',
    zeroAuthProfile: 'prod-ready'
  }
}

/**
 * Parse CLI arguments
 */
export function parseCliArgs(args: string[]): Partial<GeneratorConfig> {
  const config: Partial<GeneratorConfig> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '--dry-run':
        config.dryRun = true
        break

      case '--overwrite':
        config.overwrite = true
        break

      case '--no-backup':
        config.createBackups = false
        break

      case '--log-level':
        if (i + 1 < args.length) {
          const level = args[i + 1] as 'error' | 'warn' | 'info' | 'debug'
          if (['error', 'warn', 'info', 'debug'].includes(level)) {
            config.logLevel = level
            i++ // Skip next arg
          }
        }
        break

      case '--generatorScript':
      case '--generator-script':
        if (i + 1 < args.length) {
          config.generatorScript = args[i + 1]
          i++ // Skip next arg
        }
        break

      case '--config':
        if (i + 1 < args.length) {
          config.configFile = args[i + 1]
          i++ // Skip next arg
        }
        break

      case '--args':
      case '--arg-files':
        if (i + 1 < args.length) {
          const files = args[i + 1].split(',')
          config.argFiles = config.argFiles || []
          config.argFiles.push(...files)
          i++ // Skip next arg
        }
        break

      case '--targets':
        if (i + 1 < args.length) {
          config.targets = args[i + 1].split(',')
          i++ // Skip next arg
        }
        break

      case '--tables':
        if (i + 1 < args.length) {
          config.tables = args[i + 1].split(',')
          i++ // Skip next arg
        }
        break

      case '--skip-tables':
        if (i + 1 < args.length) {
          config.skipTables = args[i + 1].split(',')
          i++ // Skip next arg
        }
        break

      case '--api-framework':
        if (i + 1 < args.length) {
          if (!config.api) config.api = DEFAULT_CONFIG.api
          config.api.framework = args[i + 1]
          i++ // Skip next arg
        }
        break

      case '--test-framework':
        if (i + 1 < args.length) {
          if (!config.tests) config.tests = DEFAULT_CONFIG.tests
          config.tests.framework = args[i + 1]
          i++ // Skip next arg
        }
        break

      case '--frontend-framework':
        if (i + 1 < args.length) {
          if (!config.frontend) config.frontend = DEFAULT_CONFIG.frontend
          config.frontend.framework = args[i + 1]
          i++ // Skip next arg
        }
        break

      case '--styling':
        if (i + 1 < args.length) {
          if (!config.frontend) config.frontend = DEFAULT_CONFIG.frontend
          config.frontend.styling = args[i + 1] as any
          i++ // Skip next arg
        }
        break

      case '--component-library':
        if (i + 1 < args.length) {
          if (!config.frontend) config.frontend = DEFAULT_CONFIG.frontend
          config.frontend.componentLibrary = args[i + 1]
          i++ // Skip next arg
        }
        break

      case '--convex-auth-mode':
        if (i + 1 < args.length) {
          const mode = args[i + 1]
          if (mode === 'scaffold' || mode === 'patch') {
            if (!config.integrations) config.integrations = DEFAULT_CONFIG.integrations
            config.integrations.convexAuthMode = mode
            i++ // Skip next arg
          }
        }
        break

      case '--spacetime-auth-mode':
        if (i + 1 < args.length) {
          const mode = args[i + 1]
          if (mode === 'scaffold' || mode === 'patch') {
            if (!config.integrations) config.integrations = DEFAULT_CONFIG.integrations
            config.integrations.spacetimeAuthMode = mode
            i++ // Skip next arg
          }
        }
        break

      case '--zero-auth-mode':
        if (i + 1 < args.length) {
          const mode = args[i + 1]
          if (mode === 'scaffold' || mode === 'patch') {
            if (!config.integrations) config.integrations = DEFAULT_CONFIG.integrations
            config.integrations.zeroAuthMode = mode
            i++ // Skip next arg
          }
        }
        break

      case '--convex-auth-profile':
        if (i + 1 < args.length) {
          const profile = args[i + 1]
          if (profile === 'minimal' || profile === 'prod-ready' || profile === 'existing-app-merge') {
            if (!config.integrations) config.integrations = DEFAULT_CONFIG.integrations
            config.integrations.convexAuthProfile = profile
            i++
          }
        }
        break

      case '--spacetime-auth-profile':
        if (i + 1 < args.length) {
          const profile = args[i + 1]
          if (profile === 'minimal' || profile === 'prod-ready' || profile === 'existing-app-merge') {
            if (!config.integrations) config.integrations = DEFAULT_CONFIG.integrations
            config.integrations.spacetimeAuthProfile = profile
            i++
          }
        }
        break

      case '--zero-auth-profile':
        if (i + 1 < args.length) {
          const profile = args[i + 1]
          if (profile === 'minimal' || profile === 'prod-ready' || profile === 'existing-app-merge') {
            if (!config.integrations) config.integrations = DEFAULT_CONFIG.integrations
            config.integrations.zeroAuthProfile = profile
            i++
          }
        }
        break

      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
        break

      case '--version':
      case '-v':
        console.log('gen v0.0.0')
        process.exit(0)
        break

      default:
        // Check for --key=value format
        if (arg.startsWith('--')) {
          const [key, value] = arg.slice(2).split('=')
          if (value !== undefined) {
            // Handle nested config like --api.framework=express
            const keys = key.split('.')
            let current: any = config
            for (let j = 0; j < keys.length - 1; j++) {
              if (!current[keys[j]]) current[keys[j]] = {}
              current = current[keys[j]]
            }
            current[keys[keys.length - 1]] = value
          }
        }
        break
    }
  }

  return config
}

/**
 * Print help information
 */
function printHelp() {
  console.log(`
gen - Code Generation CLI

Usage:
  gen [options]

Options:
  --generatorScript, --generator-script <path>  Path to custom generator script
  --config <path>                               Path to custom config file
  --targets <list>                              Comma-separated list of targets (database,api,frontend,crud,convex,convex-auth,spacetime-auth,zero-auth,forms,tables,rails,nextjs,openapi,tests,docs,deployment)
  --tables <list>                               Comma-separated list of tables to generate
  --skip-tables <list>                          Comma-separated list of tables to skip
  --dry-run                                     Show what would be generated without writing files
  --overwrite                                   Overwrite existing files
  --no-backup                                   Don't create backup files
  --log-level <level>                           Set log level (error, warn, info, debug)
   --api-framework <framework>                   API framework (express, fastify, hono, koa)
   --test-framework <framework>                  Test framework (vitest, jest, mocha)
   --frontend-framework <framework>              Frontend framework (react, vue, svelte, angular)
   --styling <type>                              Styling approach (css, styled-components, tailwind, none)
   --component-library <library>                 UI component library (material-ui, antd, chakra, etc)
   --convex-auth-mode <mode>                     Convex auth mode (scaffold, patch)
   --spacetime-auth-mode <mode>                  Spacetime auth mode (scaffold, patch)
   --zero-auth-mode <mode>                       Zero auth mode (scaffold, patch)
   --convex-auth-profile <profile>               Convex auth profile (minimal, prod-ready, existing-app-merge)
   --spacetime-auth-profile <profile>            Spacetime auth profile (minimal, prod-ready, existing-app-merge)
   --zero-auth-profile <profile>                 Zero auth profile (minimal, prod-ready, existing-app-merge)
   --help, -h                                    Show this help
  --version, -v                                 Show version

Examples:
  gen --targets database,api
  gen --generatorScript ./my-generators.js --config ./my-config.ts
  gen --tables users,posts --dry-run
  gen --api-framework fastify --log-level debug
  gen --targets convex-auth --convex-auth-mode patch
  gen --targets spacetime-auth --spacetime-auth-mode patch
  gen --targets zero-auth --zero-auth-mode patch
  gen --targets zero-auth --zero-auth-profile existing-app-merge
`)
}

/**
 * Merge configurations
 */
export function mergeConfig(base: GeneratorConfig, overrides: Partial<GeneratorConfig>): GeneratorConfig {
  return { ...base, ...overrides }
}

/**
 * Validate configuration
 */
export function validateConfig(_config: GeneratorConfig): Result<void, GeneratorError> {
  return ok(undefined)
}

/**
 * Generate file header
 */
export function generateFileHeader(_config: GeneratorConfig, description: string): string {
  return `/**
 * ${description}
 *
 * Auto-generated by Code Generator
 * Generated at: ${new Date().toISOString()}
 */`
}

/**
 * Add ESLint disable comments
 */
export function addEslintDisable(_config: GeneratorConfig): string {
  return `/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */`
}

/**
 * Load custom config file
 */
export async function loadConfigFile(configPath: string): Promise<Result<Partial<GeneratorConfig>, GeneratorError>> {
  try {
    const absolutePath = path.resolve(configPath)

    if (!fs.existsSync(absolutePath)) {
      return err(new GeneratorError(
        GeneratorErrorCode.INVALID_CONFIG,
        `Config file not found: ${absolutePath}`,
        { configPath }
      ))
    }

    // For TypeScript files, we'll need to compile them first
    // For now, assume it's a JavaScript file or use dynamic import
    const configModule = await import(absolutePath)
    const customConfig = configModule.default || configModule

    if (typeof customConfig !== 'object' || customConfig === null) {
      return err(new GeneratorError(
        GeneratorErrorCode.INVALID_CONFIG,
        `Config file must export an object, got: ${typeof customConfig}`,
        { configPath }
      ))
    }

    return ok(customConfig)
  } catch (error) {
    return err(new GeneratorError(
      GeneratorErrorCode.INVALID_CONFIG,
      `Failed to load config file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { configPath },
      error instanceof Error ? error : undefined
    ))
  }
}

/**
 * Load argument files
 */
export async function loadArgFiles(filePaths: string[]): Promise<Result<any[], GeneratorError>> {
  try {
    const loadedArgs: any[] = []

    for (const filePath of filePaths) {
      const absolutePath = path.resolve(filePath)

      if (!fs.existsSync(absolutePath)) {
        return err(new GeneratorError(
          GeneratorErrorCode.INVALID_CONFIG,
          `Argument file not found: ${absolutePath}`,
          { filePath }
        ))
      }

      let args: any

      if (filePath.endsWith('.json')) {
        // Load JSON file
        const content = fs.readFileSync(absolutePath, 'utf-8')
        args = JSON.parse(content)
      } else {
        // Load JavaScript/TypeScript module
        const module = await import(absolutePath)
        args = module.default || module
      }

      loadedArgs.push({
        filePath: absolutePath,
        args
      })
    }

    return ok(loadedArgs)
  } catch (error) {
    return err(new GeneratorError(
      GeneratorErrorCode.INVALID_CONFIG,
      `Failed to load argument files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { filePaths },
      error instanceof Error ? error : undefined
    ))
  }
}

/**
 * Load custom generator script
 */
export async function loadGeneratorScript(scriptPath: string): Promise<Result<any, GeneratorError>> {
  try {
    const absolutePath = path.resolve(scriptPath)

    if (!fs.existsSync(absolutePath)) {
      return err(new GeneratorError(
        GeneratorErrorCode.INVALID_CONFIG,
        `Generator script not found: ${absolutePath}`,
        { scriptPath }
      ))
    }

    const generatorModule = await import(absolutePath)
    const generators = generatorModule.default || generatorModule

    // Validate that required generator methods exist
    const requiredGenerators = ['generateDatabase', 'generateAPI', 'generateFrontend', 'generateTests', 'generateDocumentation']
    const missingGenerators = requiredGenerators.filter(gen => typeof generators[gen] !== 'function')

    if (missingGenerators.length > 0) {
      return err(new GeneratorError(
        GeneratorErrorCode.INVALID_CONFIG,
        `Generator script missing required functions: ${missingGenerators.join(', ')}`,
        { scriptPath, missingGenerators }
      ))
    }

    return ok(generators)
  } catch (error) {
    return err(new GeneratorError(
      GeneratorErrorCode.INVALID_CONFIG,
      `Failed to load generator script: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { scriptPath },
      error instanceof Error ? error : undefined
    ))
  }
}
