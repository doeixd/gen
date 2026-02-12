/**
 * Generate Command
 * Handles code generation with support for custom generators and plugins
 */

import { Command } from 'commander'
import { Result, ok, err } from 'neverthrow'
import path from 'path'
import fs from 'fs'
import { createInterface } from 'readline/promises'
import { stdin as input, stdout as output } from 'process'

// Import existing generation logic
import {
  loadConfigFile,
  loadGeneratorScript,
  type GeneratorConfig,
  type GeneratorArgs,
} from '../../utils/config.js'
import { logger } from '../../utils/logger.js'
import { GeneratorError, GeneratorErrorCode, fromError } from '../../utils/errors.js'
import { readSchemaFile } from '../../utils/schema-parser.js'
import { runProjectGenerators } from '../../project-generators.js'

// Import generators
import { generateDatabase } from '../generate.js'
import { generateCrud } from '../generate.js'
import { generateConvex } from '../generate.js'
import { generateForms } from '../generate.js'
import { generateTables } from '../generate.js'
import { generateAPI } from '../generate.js'
import { generateFrontend } from '../generate.js'
import { generateTests } from '../generate.js'
import { generateDocumentation } from '../generate.js'
import { generateConvexAuth } from '../generate.js'
import { generateSpacetimeAuth } from '../generate.js'
import { generateZeroAuth } from '../generate.js'

export function createGenerateCommand(): Command {
  const command = new Command('generate')
    .alias('gen')
    .alias('g')
    .description('Generate code from entity definitions')
    .argument('[targets...]', 'generation targets (database, api, frontend, crud, convex, convex-auth, spacetime-auth, zero-auth, forms, tables, rails, nextjs, openapi, tests, docs, deployment)')
    .option('-c, --config <path>', 'path to config file')
    .option('-s, --schema <path>', 'path to schema file')
    .option('-o, --output <path>', 'output directory')
    .option('--generator-script <path>', 'path to custom generator script')
    .option('--plugin <name>', 'use specific plugin for generation')
    .option('--framework <name>', 'target framework (react, vue, express, etc.)')
    .option('--db-target <target>', 'database target (drizzle, prisma, sql, convex)')
    .option('--include-validation', 'include validation in generated code')
    .option('--include-permissions', 'include permission checks in generated code')
    .option('--include-tests', 'include test files')
    .option('--include-docs', 'include documentation')
    .option('--dry-run', 'preview changes without writing files')
    .option('--force', 'overwrite existing files without confirmation')
    .option('--backup', 'create backups of existing files')
    .option('--verbose', 'enable verbose logging')
    .option('--quiet', 'suppress non-error output')
    .option('--watch', 'watch for changes and regenerate')
    .option('--incremental', 'only generate changed entities')
    .option('--convex-auth-mode <mode>', 'convex auth mode (scaffold|patch)', 'scaffold')
    .option('--spacetime-auth-mode <mode>', 'spacetime auth mode (scaffold|patch)', 'scaffold')
    .option('--zero-auth-mode <mode>', 'zero auth mode (scaffold|patch)', 'scaffold')
    .option('--convex-auth-profile <profile>', 'convex auth profile (minimal|prod-ready|existing-app-merge)', 'prod-ready')
    .option('--spacetime-auth-profile <profile>', 'spacetime auth profile (minimal|prod-ready|existing-app-merge)', 'prod-ready')
    .option('--zero-auth-profile <profile>', 'zero auth profile (minimal|prod-ready|existing-app-merge)', 'prod-ready')
    .option('--tables <list>', 'comma-separated list of tables to generate')
    .option('--exclude <list>', 'comma-separated list of tables to exclude')
    .option('--preset <name>', 'use a predefined configuration preset')
    .option('--interactive', 'run interactive generation wizard')
    .option('--plan', 'print generation plan and exit')
    .option('--json', 'print generation plan as JSON and exit')
    .option('--explain', 'explain what each target generates')
    .option('--no-project-generators', 'disable discovered project generators')
    .option('--project-generator-include <list>', 'comma-separated include patterns/roots for project generators')
    .option('--project-generator-exclude <list>', 'comma-separated exclude patterns/roots for project generators')

  command.action(async (targets: string[], options: any) => {
    try {
      logger.section('🚀 Code Generation')

      if (options.interactive) {
        const wizardResult = await runGenerationWizard(targets, options)
        if (wizardResult.isErr()) {
          logger.error('Interactive wizard failed', wizardResult.error.code, {
            error: wizardResult.error.message,
          })
          process.exit(1)
        }
        targets = wizardResult.value.targets
        options = wizardResult.value.options
      }

      // Handle presets
      if (options.preset) {
        const presetConfig = await loadPreset(options.preset)
        if (presetConfig.isErr()) {
          logger.error('Failed to load preset', presetConfig.error.code, {
            error: presetConfig.error.message
          })
          process.exit(1)
        }
        options = { ...presetConfig.value, ...options }
      }

      // Get configuration
      const configResult = await getGeneratorConfig(options)
      if (configResult.isErr()) {
        logger.error('Configuration error', configResult.error.code, {
          error: configResult.error.message
        })
        process.exit(1)
      }

      const config = configResult.value

      // Set log level
      if (options.verbose) {
        logger.setLevel('debug')
      } else if (options.quiet) {
        logger.setLevel('error')
      }

      if (config.dryRun) {
        logger.info('🔍 DRY RUN MODE - No files will be written')
      }

      // Load custom generator if specified
      let customGenerators: any = null
      if (options.generatorScript) {
        logger.subsection(`Loading custom generators: ${options.generatorScript}`)
        const generatorResult = await loadGeneratorScript(options.generatorScript)
        if (generatorResult.isErr()) {
          logger.error('Failed to load custom generators', generatorResult.error.code, {
            error: generatorResult.error.message
          })
          process.exit(1)
        }
        customGenerators = generatorResult.value
        logger.success(`Loaded custom generators`)
      }

      // Load schema
      logger.subsection('Reading schema')
      const schemaPath = options.schema || config.paths.schema
      const schemaContentResult = readSchemaFile(schemaPath)
      if (schemaContentResult.isErr()) {
        logger.error('Failed to read schema file', schemaContentResult.error.code, {
          filePath: schemaPath,
          error: schemaContentResult.error.message
        })
        process.exit(1)
      }

      // Parse entities (simplified for now)
      const entities = parseEntitiesFromSchema(schemaContentResult.value)
      logger.success(`Parsed ${entities.length} entities from schema`)

      // Filter entities if specified
      let filteredEntities = entities
      if (options.tables) {
        const tableFilter = options.tables.split(',')
        filteredEntities = entities.filter(entity => tableFilter.includes(entity.id))
      }
      if (options.exclude) {
        const excludeFilter = options.exclude.split(',')
        filteredEntities = filteredEntities.filter(entity => !excludeFilter.includes(entity.id))
      }

      if (filteredEntities.length === 0) {
        logger.warn('No entities to generate')
        return
      }

      // Determine targets
      const allTargets = [
        'database', 'api', 'frontend', 'crud', 'convex', 'convex-auth', 'spacetime-auth', 'zero-auth', 'forms', 'tables', 'rails', 'nextjs', 'openapi', 'tests', 'docs', 'deployment'
      ]
      const requestedTargets = targets.length > 0 ? targets : config.targets

      // Validate targets
      const invalidTargets = requestedTargets.filter((t: string) => !allTargets.includes(t))
      if (invalidTargets.length > 0) {
        logger.error(`Invalid targets: ${invalidTargets.join(', ')}`, 'CLI_ERROR', {
          validTargets: allTargets.join(', ')
        })
        process.exit(1)
      }

      const metadata = getTargetMetadata()
      const plan = {
        targets: requestedTargets,
        entityCount: filteredEntities.length,
        entities: filteredEntities.map((e: any) => e.id),
        dryRun: config.dryRun,
        modes: {
          convexAuthMode: config.integrations?.convexAuthMode,
          spacetimeAuthMode: config.integrations?.spacetimeAuthMode,
          zeroAuthMode: config.integrations?.zeroAuthMode,
        },
        profiles: {
          convexAuthProfile: config.integrations?.convexAuthProfile,
          spacetimeAuthProfile: config.integrations?.spacetimeAuthProfile,
          zeroAuthProfile: config.integrations?.zeroAuthProfile,
        },
        projectGenerators: {
          enabled: options.projectGenerators !== false,
          include: options.projectGeneratorInclude || null,
          exclude: options.projectGeneratorExclude || null,
        },
        details: requestedTargets.map((t: string) => ({ target: t, ...(metadata[t] || { summary: 'No summary available' }) })),
      }

      if (options.explain) {
        logger.subsection('Target Explanation')
        for (const detail of plan.details) {
          logger.info(`- ${detail.target}: ${detail.summary}`)
        }
      }

      if (options.json) {
        console.log(JSON.stringify(plan, null, 2))
        return
      }

      if (options.plan) {
        logger.subsection('Generation Plan')
        logger.info(`Targets: ${plan.targets.join(', ')}`)
        logger.info(`Entities: ${plan.entityCount} (${plan.entities.join(', ')})`)
        logger.info(`Dry run: ${plan.dryRun ? 'yes' : 'no'}`)
        for (const detail of plan.details) {
          logger.info(`- ${detail.target}: ${detail.summary}`)
        }
        return
      }

      // Create generator args
      const generatorArgs: GeneratorArgs = {
        config,
        entities: filteredEntities,
        argFiles: [],
        customGenerators
      }

      // Generate code for each target
      const generationPromises: Promise<Result<void, GeneratorError>>[] = []

      for (const target of requestedTargets) {
        switch (target) {
          case 'database':
            generationPromises.push(generateDatabase(generatorArgs))
            break
          case 'api':
            generationPromises.push(generateAPI(generatorArgs))
            break
          case 'frontend':
            generationPromises.push(generateFrontend(generatorArgs))
            break
          case 'crud':
            generationPromises.push(generateCrud(generatorArgs))
            break
          case 'convex':
            generationPromises.push(generateConvex(generatorArgs))
            break
          case 'convex-auth':
            generationPromises.push(generateConvexAuth(generatorArgs))
            break
          case 'spacetime-auth':
            generationPromises.push(generateSpacetimeAuth(generatorArgs))
            break
          case 'zero-auth':
            generationPromises.push(generateZeroAuth(generatorArgs))
            break
          case 'forms':
            generationPromises.push(generateForms(generatorArgs))
            break
          case 'tables':
            generationPromises.push(generateTables(generatorArgs))
            break
          case 'tests':
            generationPromises.push(generateTests(generatorArgs))
            break
          case 'docs':
            generationPromises.push(generateDocumentation(generatorArgs))
            break
        }
      }

      // Wait for all generations
      const results = await Promise.all(generationPromises)

      // Check for errors
      const errors = results.filter(result => result.isErr())
      if (errors.length > 0) {
        errors.forEach(error => {
          logger.error('Generation failed', error.error.code, {
            error: error.error.message
          })
        })
        process.exit(1)
      }

      if (options.projectGenerators !== false) {
        await runProjectGenerators({
          rootDir: process.cwd(),
          targets: requestedTargets,
          entities: filteredEntities as any,
          config,
          include: options.projectGeneratorInclude
            ? options.projectGeneratorInclude.split(',').map((x: string) => x.trim()).filter(Boolean)
            : undefined,
          exclude: options.projectGeneratorExclude
            ? options.projectGeneratorExclude.split(',').map((x: string) => x.trim()).filter(Boolean)
            : undefined,
        })
      }

      logger.success('🎉 Code generation completed successfully!')

      // Print summary
      logger.printReport()

    } catch (error) {
      logger.error('Generation failed', 'CLI_ERROR', {
        error: error instanceof Error ? error.message : String(error)
      })
      process.exit(1)
    }
  })

  return command
}

async function runGenerationWizard(
  existingTargets: string[],
  existingOptions: any
): Promise<Result<{ targets: string[]; options: any }, GeneratorError>> {
  try {
    const rl = createInterface({ input, output })
    const allTargets = Object.keys(getTargetMetadata())

    const targetAnswer = await rl.question(
      `Targets (comma-separated, blank for defaults: ${allTargets.join(', ')}): `
    )
    const selectedTargets = targetAnswer.trim()
      ? targetAnswer.split(',').map((x) => x.trim()).filter(Boolean)
      : (existingTargets.length > 0 ? existingTargets : ['database', 'api', 'frontend'])

    const profileAnswer = await rl.question('Auth profile [minimal|prod-ready|existing-app-merge] (default prod-ready): ')
    const profile = profileAnswer.trim() || 'prod-ready'

    const dryRunAnswer = await rl.question('Dry run? [y/N]: ')
    const dryRun = /^y(es)?$/i.test(dryRunAnswer.trim())

    const explainAnswer = await rl.question('Explain targets before run? [y/N]: ')
    const explain = /^y(es)?$/i.test(explainAnswer.trim())

    rl.close()

    return ok({
      targets: selectedTargets,
      options: {
        ...existingOptions,
        dryRun,
        explain,
        convexAuthProfile: profile,
        spacetimeAuthProfile: profile,
        zeroAuthProfile: profile,
      },
    })
  } catch (error) {
    return err(fromError(error))
  }
}

function getTargetMetadata(): Record<string, { summary: string }> {
  return {
    database: { summary: 'Generate database schema code for configured DB targets.' },
    api: { summary: 'Generate API routes/controllers/validators for entities.' },
    frontend: { summary: 'Generate frontend forms/lists/detail components.' },
    crud: { summary: 'Generate end-to-end CRUD scaffolding.' },
    convex: { summary: 'Generate Convex-oriented backend code.' },
    'convex-auth': { summary: 'Generate TanStack Start + Convex + Better Auth integration and entity-driven Convex CRUD.' },
    'spacetime-auth': { summary: 'Generate TanStack Start + SpacetimeDB + Better Auth integration and entity-driven reducers.' },
    'zero-auth': { summary: 'Generate TanStack Start + Zero + Better Auth integration with entity-driven schema/queries/mutators.' },
    forms: { summary: 'Generate form components and form schemas.' },
    tables: { summary: 'Generate table/list components and columns.' },
    rails: { summary: 'Generate Rails-style route scaffolding.' },
    nextjs: { summary: 'Generate Next.js API scaffolding.' },
    openapi: { summary: 'Generate OpenAPI specification output.' },
    tests: { summary: 'Generate test scaffolding for entities/features.' },
    docs: { summary: 'Generate documentation artifacts.' },
    deployment: { summary: 'Generate deployment/configuration artifacts.' },
  }
}

// Load configuration preset
async function loadPreset(presetName: string): Promise<Result<any, GeneratorError>> {
  try {
    const presetPath = path.join(process.cwd(), 'presets', `${presetName}.json`)
    if (fs.existsSync(presetPath)) {
      const preset = JSON.parse(fs.readFileSync(presetPath, 'utf-8'))
      return ok(preset)
    }

    // Built-in presets
    const builtInPresets: Record<string, any> = {
      'convex-fullstack': {
        targets: ['database', 'convex', 'crud', 'forms'],
        framework: 'react',
        dbTarget: 'convex'
      },
      'tanstack-convex-auth': {
        targets: ['convex-auth'],
        framework: 'react',
        dbTarget: 'convex'
      },
      'tanstack-spacetime-auth': {
        targets: ['spacetime-auth'],
        framework: 'react'
      },
      'tanstack-zero-auth': {
        targets: ['zero-auth'],
        framework: 'react'
      },
      'express-api': {
        targets: ['database', 'api'],
        framework: 'express',
        includeValidation: true,
        includePermissions: true
      },
      'react-frontend': {
        targets: ['frontend', 'forms'],
        framework: 'react',
        includeValidation: true
      }
    }

    if (builtInPresets[presetName]) {
      return ok(builtInPresets[presetName])
    }

    return err(new GeneratorError(
      GeneratorErrorCode.INVALID_CONFIG,
      `Preset '${presetName}' not found`,
      { presetName }
    ))
  } catch (error) {
    return err(fromError(error))
  }
}

// Get generator configuration
async function getGeneratorConfig(options: any): Promise<Result<GeneratorConfig, GeneratorError>> {
  try {
    // Load custom config file if specified
    let config = DEFAULT_CONFIG
    if (options.config) {
      const customConfigResult = await loadConfigFile(options.config)
      if (customConfigResult.isErr()) {
        return err(customConfigResult.error)
      }
      config = mergeConfig(config, customConfigResult.value)
    }

    // Override with CLI options
    if (options.output) {
      config.paths.database = path.join(options.output, 'database')
      config.paths.api = path.join(options.output, 'api')
      config.paths.frontend = path.join(options.output, 'frontend')
      config.paths.tests = path.join(options.output, 'tests')
      config.paths.docs = path.join(options.output, 'docs')
    }

    if (options.schema) {
      config.paths.schema = options.schema
    }

    if (options.dryRun !== undefined) {
      config.dryRun = options.dryRun
    }

    if (options.force !== undefined) {
      config.overwrite = options.force
    }

    if (options.backup !== undefined) {
      config.createBackups = options.backup
    }

    if (options.framework) {
      config.frontend.framework = options.framework
      config.api.framework = options.framework
    }

    if (options.dbTarget) {
      // Add db target logic here
    }

    if (options.includeValidation !== undefined) {
      config.api.includeValidation = options.includeValidation
    }

    if (options.includePermissions !== undefined) {
      config.api.includePermissions = options.includePermissions
    }

    if (options.convexAuthMode) {
      config.integrations = config.integrations || {
        convexAuthMode: 'scaffold',
        spacetimeAuthMode: 'scaffold',
        zeroAuthMode: 'scaffold',
        convexAuthProfile: 'prod-ready',
        spacetimeAuthProfile: 'prod-ready',
        zeroAuthProfile: 'prod-ready',
      }
      config.integrations.convexAuthMode = options.convexAuthMode === 'patch' ? 'patch' : 'scaffold'
    }

    if (options.spacetimeAuthMode) {
      config.integrations = config.integrations || {
        convexAuthMode: 'scaffold',
        spacetimeAuthMode: 'scaffold',
        zeroAuthMode: 'scaffold',
        convexAuthProfile: 'prod-ready',
        spacetimeAuthProfile: 'prod-ready',
        zeroAuthProfile: 'prod-ready',
      }
      config.integrations.spacetimeAuthMode = options.spacetimeAuthMode === 'patch' ? 'patch' : 'scaffold'
    }

    if (options.zeroAuthMode) {
      config.integrations = config.integrations || {
        convexAuthMode: 'scaffold',
        spacetimeAuthMode: 'scaffold',
        zeroAuthMode: 'scaffold',
        convexAuthProfile: 'prod-ready',
        spacetimeAuthProfile: 'prod-ready',
        zeroAuthProfile: 'prod-ready',
      }
      config.integrations.zeroAuthMode = options.zeroAuthMode === 'patch' ? 'patch' : 'scaffold'
    }

    if (options.convexAuthProfile) {
      config.integrations = config.integrations || {
        convexAuthMode: 'scaffold',
        spacetimeAuthMode: 'scaffold',
        zeroAuthMode: 'scaffold',
        convexAuthProfile: 'prod-ready',
        spacetimeAuthProfile: 'prod-ready',
        zeroAuthProfile: 'prod-ready',
      }
      config.integrations.convexAuthProfile =
        options.convexAuthProfile === 'minimal' || options.convexAuthProfile === 'existing-app-merge'
          ? options.convexAuthProfile
          : 'prod-ready'
    }

    if (options.spacetimeAuthProfile) {
      config.integrations = config.integrations || {
        convexAuthMode: 'scaffold',
        spacetimeAuthMode: 'scaffold',
        zeroAuthMode: 'scaffold',
        convexAuthProfile: 'prod-ready',
        spacetimeAuthProfile: 'prod-ready',
        zeroAuthProfile: 'prod-ready',
      }
      config.integrations.spacetimeAuthProfile =
        options.spacetimeAuthProfile === 'minimal' || options.spacetimeAuthProfile === 'existing-app-merge'
          ? options.spacetimeAuthProfile
          : 'prod-ready'
    }

    if (options.zeroAuthProfile) {
      config.integrations = config.integrations || {
        convexAuthMode: 'scaffold',
        spacetimeAuthMode: 'scaffold',
        zeroAuthMode: 'scaffold',
        convexAuthProfile: 'prod-ready',
        spacetimeAuthProfile: 'prod-ready',
        zeroAuthProfile: 'prod-ready',
      }
      config.integrations.zeroAuthProfile =
        options.zeroAuthProfile === 'minimal' || options.zeroAuthProfile === 'existing-app-merge'
          ? options.zeroAuthProfile
          : 'prod-ready'
    }

    return ok(config)
  } catch (error) {
    return err(fromError(error))
  }
}

// Parse entities from schema (placeholder implementation)
function parseEntitiesFromSchema(schemaContent: string): any[] {
  // This is a simplified implementation
  // In a real implementation, this would parse the actual schema
  return [
    {
      id: 'user',
      name: { singular: 'User', plural: 'Users' },
      version: 1,
      createdAt: new Date(),
      db: {
        table: { name: 'users', primaryKey: ['id'] },
        columns: {
          id: { type: { typeName: 'uuid', toDrizzle: () => 'uuid("id").primaryKey()' } },
          email: { type: { typeName: 'varchar', typeParams: [255], toDrizzle: () => 'varchar("email", { length: 255 })' } },
          name: { type: { typeName: 'varchar', typeParams: [100], toDrizzle: () => 'varchar("name", { length: 100 })' } }
        }
      },
      fields: {
        id: { jsType: 'string' },
        email: { jsType: 'string' },
        name: { jsType: 'string' }
      }
    }
  ]
}

// Import required types and functions
import { DEFAULT_CONFIG, mergeConfig } from '../../utils/config.js'
