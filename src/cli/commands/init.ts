/**
 * Init Command
 * Initialize a new Gen project with configuration and basic structure
 */

import { Command } from 'commander'
import { Result, ok, err } from 'neverthrow'
import path from 'path'
import fs from 'fs'

// Import utilities
import { logger } from '../../utils/logger.js'
import { ensureDirectory, writeFile } from '../../utils/file-system.js'
import { CLIError, fromError } from '../../utils/errors.js'

export function createInitCommand(): Command {
  const command = new Command('init')
    .alias('i')
    .description('Initialize a new Gen project')
    .argument('[project-name]', 'name of the project')
    .option('-t, --template <name>', 'project template (basic, convex, express, fullstack)')
    .option('-f, --framework <name>', 'primary framework (react, vue, express, fastify)')
    .option('-d, --database <name>', 'database type (drizzle, prisma, convex)')
    .option('--skip-install', 'skip package installation')
    .option('--yes', 'skip interactive prompts and use defaults')
    .option('--force', 'overwrite existing files')

  command.action(async (projectName: string | undefined, options: any) => {
    try {
      logger.section('🚀 Initializing Gen Project')

      const projectDir = projectName || path.basename(process.cwd())
      const isNewDirectory = projectName !== undefined

      // Create project directory if needed
      if (isNewDirectory) {
        if (fs.existsSync(projectName) && !options.force) {
          logger.error(`Directory '${projectName}' already exists`, 'CLI_ERROR', {
            suggestion: 'Use --force to overwrite or choose a different name'
          })
          process.exit(1)
        }
        await fs.promises.mkdir(projectName, { recursive: true })
        process.chdir(projectName)
      }

      // Determine template
      const template = options.template || await promptForTemplate()

      logger.subsection(`Setting up ${template} project...`)

      // Create project structure based on template
      const setupResult = await setupProject(template, options)
      if (setupResult.isErr()) {
        logger.error('Failed to setup project', setupResult.error.code, {
          error: setupResult.error.message
        })
        process.exit(1)
      }

      // Create package.json
      const packageResult = await createPackageJson(projectDir, template, options)
      if (packageResult.isErr()) {
        logger.error('Failed to create package.json', packageResult.error.code, {
          error: packageResult.error.message
        })
        process.exit(1)
      }

      // Create configuration files
      const configResult = await createConfigFiles(template, options)
      if (configResult.isErr()) {
        logger.error('Failed to create config files', configResult.error.code, {
          error: configResult.error.message
        })
        process.exit(1)
      }

      // Create initial schema
      const schemaResult = await createInitialSchema(template)
      if (schemaResult.isErr()) {
        logger.error('Failed to create schema', schemaResult.error.code, {
          error: schemaResult.error.message
        })
        process.exit(1)
      }

      // Install dependencies
      if (!options.skipInstall) {
        logger.subsection('Installing dependencies...')
        const installResult = await installDependencies(template)
        if (installResult.isErr()) {
          logger.warn('Failed to install dependencies automatically', {
            suggestion: 'Run "npm install" manually'
          })
        } else {
          logger.success('Dependencies installed')
        }
      }

      // Print success message
      logger.success(`🎉 ${projectDir} initialized successfully!`)
      logger.info('')
      logger.info('Next steps:')
      logger.info('1. Define your entities in schema.ts')
      logger.info('2. Run "gen generate" to create your first code')
      logger.info('3. Check out the generated files!')
      logger.info('')
      logger.info('For more information, visit: https://gen.dev')

    } catch (error) {
      logger.error('Init failed', 'CLI_ERROR', {
        error: error instanceof Error ? error.message : String(error)
      })
      process.exit(1)
    }
  })

  return command
}

// Prompt for template selection
async function promptForTemplate(): Promise<string> {
  // In a real implementation, this would use an interactive prompt
  // For now, default to 'basic'
  return 'basic'
}

// Setup project structure
async function setupProject(template: string, options: any): Promise<Result<void, CLIError>> {
  try {
    const dirs = [
      'src',
      'src/components',
      'src/lib',
      'src/routes',
      'generated',
      'generated/database',
      'generated/api',
      'generated/frontend',
      'tests'
    ]

    for (const dir of dirs) {
      const result = ensureDirectory(dir)
      if (result.isErr()) return err(result.error)
    }

    // Create template-specific directories
    switch (template) {
      case 'convex':
        const convexDirs = ['convex', 'src/lib/collections']
        for (const dir of convexDirs) {
          const result = ensureDirectory(dir)
          if (result.isErr()) return err(result.error)
        }
        break

      case 'express':
        const expressDirs = ['src/routes/api', 'src/middleware']
        for (const dir of expressDirs) {
          const result = ensureDirectory(dir)
          if (result.isErr()) return err(result.error)
        }
        break
    }

    return ok(undefined)
  } catch (error) {
    return err(fromError(error))
  }
}

// Create package.json
async function createPackageJson(projectName: string, template: string, options: any): Promise<Result<void, CLIError>> {
  try {
    const packageJson: any = {
      name: projectName,
      version: '0.1.0',
      description: `A Gen-powered ${template} project`,
      main: 'index.js',
      scripts: {
        'gen': 'gen generate',
        'gen:watch': 'gen generate --watch',
        'build': 'gen generate && your-build-command',
        'dev': 'your-dev-command'
      },
      devDependencies: {
        'gen': '^1.0.0'
      }
    }

    // Add template-specific dependencies
    switch (template) {
      case 'convex':
        packageJson.dependencies = {
          'convex': '^1.0.0',
          'react': '^18.0.0',
          'tanstack-router': '^1.0.0',
          'tanstack-table': '^8.0.0',
          'tanstack-form': '^0.0.0'
        }
        packageJson.devDependencies = {
          ...packageJson.devDependencies,
          'typescript': '^5.0.0',
          '@types/react': '^18.0.0'
        }
        break

      case 'express':
        packageJson.dependencies = {
          'express': '^4.0.0',
          'zod': '^3.0.0'
        }
        packageJson.devDependencies = {
          ...packageJson.devDependencies,
          'typescript': '^5.0.0',
          '@types/express': '^4.0.0'
        }
        break

      case 'react':
        packageJson.dependencies = {
          'react': '^18.0.0',
          'react-dom': '^18.0.0'
        }
        packageJson.devDependencies = {
          ...packageJson.devDependencies,
          'typescript': '^5.0.0',
          '@types/react': '^18.0.0',
          '@types/react-dom': '^18.0.0'
        }
        break
    }

    const packagePath = 'package.json'
    const result = writeFile(packagePath, JSON.stringify(packageJson, null, 2))
    if (result.isErr()) return err(result.error)

    return ok(undefined)
  } catch (error) {
    return err(fromError(error))
  }
}

// Create configuration files
async function createConfigFiles(template: string, options: any): Promise<Result<void, CLIError>> {
  try {
    // Create .genrc.json
    const genConfig = {
      version: '1.0.0',
      plugins: [],
      presets: {
        default: {
          targets: template === 'convex' ? ['database', 'convex', 'crud', 'forms'] : ['database', 'api', 'frontend']
        }
      }
    }

    const genConfigResult = writeFile('.genrc.json', JSON.stringify(genConfig, null, 2))
    if (genConfigResult.isErr()) return err(genConfigResult.error)

    // Create gen.config.js
    const genJsConfig = `
// Gen Configuration
export default {
  // Schema file location
  schema: './schema.ts',

  // Output directories
  paths: {
    database: './generated/database',
    api: './generated/api',
    frontend: './generated/frontend',
    tests: './tests',
    docs: './docs'
  },

  // Generation targets
  targets: ${JSON.stringify(template === 'convex'
    ? ['database', 'convex', 'crud', 'forms']
    : ['database', 'api', 'frontend'], null, 2)},

  // Framework-specific settings
  ${template === 'convex' ? `
  frontend: {
    framework: 'react',
    styling: 'tailwind'
  },
  database: {
    target: 'convex'
  }` : template === 'express' ? `
  api: {
    framework: 'express',
    includeValidation: true,
    includePermissions: true
  }` : `
  frontend: {
    framework: 'react',
    styling: 'tailwind'
  },
  api: {
    framework: 'express',
    includeValidation: true
  }`}
}
`

    const genJsResult = writeFile('gen.config.js', genJsConfig)
    if (genJsResult.isErr()) return err(genJsResult.error)

    // Create TypeScript config if needed
    if (template !== 'basic') {
      const tsConfig = {
        compilerOptions: {
          target: 'ES2022',
          lib: ['DOM', 'DOM.Iterable', 'ES6'],
          allowJs: true,
          skipLibCheck: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          forceConsistentCasingInFileNames: true,
          noFallthroughCasesInSwitch: true,
          module: 'ESNext',
          moduleResolution: 'bundler',
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx'
        },
        include: ['src']
      }

      const tsConfigResult = writeFile('tsconfig.json', JSON.stringify(tsConfig, null, 2))
      if (tsConfigResult.isErr()) return err(tsConfigResult.error)
    }

    return ok(undefined)
  } catch (error) {
    return err(fromError(error))
  }
}

// Create initial schema
async function createInitialSchema(template: string): Promise<Result<void, CLIError>> {
  try {
    let schemaContent = ''

    switch (template) {
      case 'convex':
        schemaContent = `
// Example Convex Schema for Gen
import { createEntity, dbTypes, validators } from 'gen'

// User entity
export const userEntity = createEntity({
  id: 'user',
  name: { singular: 'User', plural: 'Users' },
  db: {
    table: { name: 'users', primaryKey: ['id'] },
    columns: {
      id: dbTypes.id(),
      email: dbTypes.string(255).unique(),
      name: dbTypes.string(100),
      role: dbTypes.enum(['user', 'admin', 'superadmin']),
      createdAt: dbTypes.timestamp(),
    }
  },
  fields: {
    id: { standardSchema: validators.uuid },
    email: { standardSchema: validators.email },
    name: { standardSchema: validators.stringMin(1) },
    role: { standardSchema: validators.enum(['user', 'admin', 'superadmin']) },
  },
  permissions: {
    create: { roles: ['admin'] },
    read: { roles: ['user', 'admin'] },
    update: { roles: ['admin'], ownership: { field: 'id' } },
    delete: { roles: ['superadmin'] },
  }
})

// Product entity
export const productEntity = createEntity({
  id: 'product',
  name: { singular: 'Product', plural: 'Products' },
  db: {
    table: { name: 'products', primaryKey: ['id'] },
    columns: {
      id: dbTypes.id(),
      name: dbTypes.string(255),
      description: dbTypes.text(),
      price: dbTypes.decimal(10, 2),
      inStock: dbTypes.boolean(),
      createdAt: dbTypes.timestamp(),
    }
  },
  fields: {
    name: { standardSchema: validators.stringMin(1) },
    description: { standardSchema: validators.stringMin(10) },
    price: { standardSchema: validators.numberMin(0) },
    inStock: { standardSchema: validators.boolean },
  }
})

export const entities = [userEntity, productEntity]
`
        break

      case 'express':
        schemaContent = `
// Example Express API Schema for Gen
import { createEntity, dbTypes, validators } from 'gen'

export const userEntity = createEntity({
  id: 'user',
  name: { singular: 'User', plural: 'Users' },
  db: {
    table: { name: 'users', primaryKey: ['id'] },
    columns: {
      id: dbTypes.id(),
      email: dbTypes.string(255).unique(),
      name: dbTypes.string(100),
      createdAt: dbTypes.timestamp(),
    }
  },
  fields: {
    id: { standardSchema: validators.uuid },
    email: { standardSchema: validators.email },
    name: { standardSchema: validators.stringMin(1) },
  }
})

export const entities = [userEntity]
`
        break

      default:
        schemaContent = `
// Example Basic Schema for Gen
import { createEntity, dbTypes, validators } from 'gen'

export const userEntity = createEntity({
  id: 'user',
  name: { singular: 'User', plural: 'Users' },
  db: {
    table: { name: 'users', primaryKey: ['id'] },
    columns: {
      id: dbTypes.id(),
      email: dbTypes.string(255),
      name: dbTypes.string(100),
    }
  },
  fields: {
    id: { standardSchema: validators.uuid },
    email: { standardSchema: validators.email },
    name: { standardSchema: validators.stringMin(1) },
  }
})

export const entities = [userEntity]
`
    }

    const schemaResult = writeFile('schema.ts', schemaContent)
    if (schemaResult.isErr()) return err(schemaResult.error)

    return ok(undefined)
  } catch (error) {
    return err(fromError(error))
  }
}

// Install dependencies
async function installDependencies(template: string): Promise<Result<void, CLIError>> {
  try {
    const { execSync } = await import('child_process')

    // Run npm install
    execSync('npm install', { stdio: 'inherit' })

    return ok(undefined)
  } catch (error) {
    return err(fromError(error))
  }
}
