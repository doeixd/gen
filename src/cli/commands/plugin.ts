/**
 * Plugin Command
 * Manage Gen plugins and extensions
 */

import { Command } from 'commander'
import { Result, ok, err } from 'neverthrow'
import path from 'path'
import fs from 'fs'

// Import utilities
import { logger } from '../../utils/logger.js'
import { CLIError, fromError } from '../../utils/errors.js'

export function createPluginCommand(): Command {
  const command = new Command('plugin')
    .alias('p')
    .description('Manage Gen plugins and extensions')

  // Add subcommands
  command.addCommand(createPluginListCommand())
  command.addCommand(createPluginInstallCommand())
  command.addCommand(createPluginUninstallCommand())
  command.addCommand(createPluginCreateCommand())

  return command
}

// List installed plugins
function createPluginListCommand(): Command {
  const command = new Command('list')
    .alias('ls')
    .description('List installed plugins')
    .action(async () => {
      try {
        logger.section('📦 Installed Plugins')

        const configResult = loadCLIConfig()
        if (configResult.isErr()) {
          logger.error('Failed to load config', configResult.error.code, {
            error: configResult.error.message
          })
          process.exit(1)
        }

        const config = configResult.value
        const plugins = config.plugins || []

        if (plugins.length === 0) {
          logger.info('No plugins installed')
          logger.info('Install plugins with: gen plugin install <plugin-name>')
          return
        }

        plugins.forEach((plugin, index) => {
          logger.info(`${index + 1}. ${plugin}`)
        })

        logger.info('')
        logger.info(`Total: ${plugins.length} plugin(s)`)

      } catch (error) {
        logger.error('Failed to list plugins', 'CLI_ERROR', {
          error: error instanceof Error ? error.message : String(error)
        })
        process.exit(1)
      }
    })

  return command
}

// Install a plugin
function createPluginInstallCommand(): Command {
  const command = new Command('install')
    .alias('i')
    .description('Install a plugin')
    .argument('<plugin>', 'plugin name or path')
    .option('-g, --global', 'install globally')
    .option('--registry <url>', 'npm registry URL')
    .action(async (pluginName: string, options: any) => {
      try {
        logger.section(`📦 Installing Plugin: ${pluginName}`)

        // Load current config
        const configResult = loadCLIConfig()
        if (configResult.isErr()) {
          logger.error('Failed to load config', configResult.error.code, {
            error: configResult.error.message
          })
          process.exit(1)
        }

        const config = configResult.value

        // Check if plugin is already installed
        if (config.plugins.includes(pluginName)) {
          logger.warn(`Plugin '${pluginName}' is already installed`)
          return
        }

        // Install the plugin
        const installResult = await installPlugin(pluginName, options)
        if (installResult.isErr()) {
          logger.error('Failed to install plugin', installResult.error.code, {
            error: installResult.error.message
          })
          process.exit(1)
        }

        // Update config
        config.plugins.push(pluginName)
        const saveResult = saveCLIConfig(config)
        if (saveResult.isErr()) {
          logger.error('Failed to save config', saveResult.error.code, {
            error: saveResult.error.message
          })
          process.exit(1)
        }

        logger.success(`Plugin '${pluginName}' installed successfully`)
        logger.info('Restart your terminal or run "gen --help" to see new commands')

      } catch (error) {
        logger.error('Plugin installation failed', 'CLI_ERROR', {
          error: error instanceof Error ? error.message : String(error)
        })
        process.exit(1)
      }
    })

  return command
}

// Uninstall a plugin
function createPluginUninstallCommand(): Command {
  const command = new Command('uninstall')
    .alias('u')
    .description('Uninstall a plugin')
    .argument('<plugin>', 'plugin name')
    .action(async (pluginName: string) => {
      try {
        logger.section(`📦 Uninstalling Plugin: ${pluginName}`)

        // Load current config
        const configResult = loadCLIConfig()
        if (configResult.isErr()) {
          logger.error('Failed to load config', configResult.error.code, {
            error: configResult.error.message
          })
          process.exit(1)
        }

        const config = configResult.value

        // Check if plugin is installed
        const pluginIndex = config.plugins.indexOf(pluginName)
        if (pluginIndex === -1) {
          logger.error(`Plugin '${pluginName}' is not installed`, 'CLI_ERROR')
          process.exit(1)
        }

        // Uninstall the plugin
        const uninstallResult = await uninstallPlugin(pluginName)
        if (uninstallResult.isErr()) {
          logger.error('Failed to uninstall plugin', uninstallResult.error.code, {
            error: uninstallResult.error.message
          })
          process.exit(1)
        }

        // Update config
        config.plugins.splice(pluginIndex, 1)
        const saveResult = saveCLIConfig(config)
        if (saveResult.isErr()) {
          logger.error('Failed to save config', saveResult.error.code, {
            error: saveResult.error.message
          })
          process.exit(1)
        }

        logger.success(`Plugin '${pluginName}' uninstalled successfully`)

      } catch (error) {
        logger.error('Plugin uninstallation failed', 'CLI_ERROR', {
          error: error instanceof Error ? error.message : String(error)
        })
        process.exit(1)
      }
    })

  return command
}

// Create a new plugin
function createPluginCreateCommand(): Command {
  const command = new Command('create')
    .alias('c')
    .description('Create a new plugin')
    .argument('<name>', 'plugin name')
    .option('-t, --template <type>', 'plugin template (generator, command, full)')
    .option('--typescript', 'create TypeScript plugin')
    .action(async (pluginName: string, options: any) => {
      try {
        logger.section(`🚀 Creating Plugin: ${pluginName}`)

        const template = options.template || 'generator'
        const useTypeScript = options.typescript !== false

        // Create plugin directory
        const pluginDir = `gen-plugin-${pluginName}`
        if (fs.existsSync(pluginDir)) {
          logger.error(`Directory '${pluginDir}' already exists`, 'CLI_ERROR')
          process.exit(1)
        }

        fs.mkdirSync(pluginDir, { recursive: true })
        process.chdir(pluginDir)

        // Create plugin files based on template
        const createResult = await createPluginTemplate(pluginName, template, useTypeScript)
        if (createResult.isErr()) {
          logger.error('Failed to create plugin template', createResult.error.code, {
            error: createResult.error.message
          })
          process.exit(1)
        }

        // Create package.json
        const packageResult = await createPluginPackageJson(pluginName, useTypeScript)
        if (packageResult.isErr()) {
          logger.error('Failed to create package.json', packageResult.error.code, {
            error: packageResult.error.message
          })
          process.exit(1)
        }

        logger.success(`Plugin '${pluginName}' created successfully!`)
        logger.info('')
        logger.info('Next steps:')
        logger.info('1. cd ' + pluginDir)
        logger.info('2. Implement your plugin logic')
        logger.info('3. Run "npm install" to install dependencies')
        logger.info('4. Test with "npm run dev"')
        logger.info('5. Publish to npm or install locally')

      } catch (error) {
        logger.error('Plugin creation failed', 'CLI_ERROR', {
          error: error instanceof Error ? error.message : String(error)
        })
        process.exit(1)
      }
    })

  return command
}

// Helper functions
function loadCLIConfig(): Result<any, CLIError> {
  try {
    const configPath = path.join(process.cwd(), '.genrc.json')
    if (fs.existsSync(configPath)) {
      return ok(JSON.parse(fs.readFileSync(configPath, 'utf-8')))
    }
    return ok({ plugins: [] })
  } catch (error) {
    return err(fromError(error))
  }
}

function saveCLIConfig(config: any): Result<void, CLIError> {
  try {
    const configPath = path.join(process.cwd(), '.genrc.json')
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    return ok(undefined)
  } catch (error) {
    return err(fromError(error))
  }
}

async function installPlugin(pluginName: string, options: any): Promise<Result<void, CLIError>> {
  try {
    const { execSync } = await import('child_process')

    // Install via npm
    const installCmd = options.global ? 'npm install -g' : 'npm install --save-dev'
    const registry = options.registry ? ` --registry=${options.registry}` : ''

    execSync(`${installCmd} ${pluginName}${registry}`, { stdio: 'inherit' })

    return ok(undefined)
  } catch (error) {
    return err(fromError(error))
  }
}

async function uninstallPlugin(pluginName: string): Promise<Result<void, CLIError>> {
  try {
    const { execSync } = await import('child_process')

    // Uninstall via npm
    execSync(`npm uninstall ${pluginName}`, { stdio: 'inherit' })

    return ok(undefined)
  } catch (error) {
    return err(fromError(error))
  }
}

async function createPluginTemplate(pluginName: string, template: string, useTypeScript: boolean): Promise<Result<void, CLIError>> {
  try {
    const ext = useTypeScript ? 'ts' : 'js'

    let mainContent = ''
    let indexContent = ''

    switch (template) {
      case 'generator':
        mainContent = `/**
 * ${pluginName} Generator Plugin
 */

import { Result, ok, err } from 'neverthrow'
import type { GeneratorArgs } from 'gen'

export interface ${pluginName}Config {
  // Add your plugin configuration options here
}

export async function generate${pluginName}(args: GeneratorArgs): Promise<Result<void, Error>> {
  try {
    const { config, entities } = args

    console.log('Generating ${pluginName} for', entities.length, 'entities')

    // Implement your generator logic here
    for (const entity of entities) {
      console.log('Processing entity:', entity.id)
      // Generate code for each entity
    }

    return ok(undefined)
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)))
  }
}

// Export for Gen plugin system
export default {
  name: '${pluginName}',
  version: '1.0.0',
  generators: {
    ${pluginName}: generate${pluginName}
  }
}
`
        indexContent = `export { default } from './${pluginName}.${ext}'
export * from './${pluginName}.${ext}'`
        break

      case 'command':
        mainContent = `/**
 * ${pluginName} Command Plugin
 */

import { Command } from 'commander'

export function create${pluginName}Command(): Command {
  const command = new Command('${pluginName}')
    .description('${pluginName} command description')
    .argument('[input]', 'input argument')
    .option('-o, --output <file>', 'output file')
    .action(async (input: string, options: any) => {
      console.log('${pluginName} command executed with:', { input, options })

      // Implement your command logic here
    })

  return command
}

// Export for Gen plugin system
export default {
  name: '${pluginName}',
  version: '1.0.0',
  commands: {
    '${pluginName}': create${pluginName}Command()
  }
}
`
        indexContent = `export { default } from './${pluginName}.${ext}'
export * from './${pluginName}.${ext}'`
        break

      case 'full':
        mainContent = `/**
 * ${pluginName} Full Plugin
 */

import { Command } from 'commander'
import { Result, ok, err } from 'neverthrow'
import type { GeneratorArgs } from 'gen'

// Generator function
export async function generate${pluginName}(args: GeneratorArgs): Promise<Result<void, Error>> {
  try {
    console.log('Generating ${pluginName}...')
    return ok(undefined)
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)))
  }
}

// Command function
export function create${pluginName}Command(): Command {
  const command = new Command('${pluginName}')
    .description('${pluginName} command')
    .action(async () => {
      console.log('${pluginName} command executed')
    })

  return command
}

// Export for Gen plugin system
export default {
  name: '${pluginName}',
  version: '1.0.0',
  generators: {
    ${pluginName}: generate${pluginName}
  },
  commands: {
    '${pluginName}': create${pluginName}Command()
  }
}
`
        indexContent = `export { default } from './${pluginName}.${ext}'
export * from './${pluginName}.${ext}'`
        break
    }

    // Write main file
    fs.writeFileSync(`${pluginName}.${ext}`, mainContent)

    // Write index file
    fs.writeFileSync(`index.${ext}`, indexContent)

    // Write README
    const readmeContent = `# gen-plugin-${pluginName}

A Gen plugin for ${pluginName} functionality.

## Installation

\`\`\`bash
npm install gen-plugin-${pluginName}
\`\`\`

## Usage

\`\`\`bash
gen ${pluginName}
\`\`\`

## Development

\`\`\`bash
npm run dev
npm test
\`\`\`
`

    fs.writeFileSync('README.md', readmeContent)

    return ok(undefined)
  } catch (error) {
    return err(fromError(error))
  }
}

async function createPluginPackageJson(pluginName: string, useTypeScript: boolean): Promise<Result<void, CLIError>> {
  try {
    const packageJson = {
      name: `gen-plugin-${pluginName}`,
      version: '1.0.0',
      description: `Gen plugin for ${pluginName}`,
      main: 'index.js',
      scripts: {
        build: 'tsc',
        dev: 'tsc --watch',
        test: 'echo "No tests specified"'
      },
      keywords: ['gen', 'plugin', 'codegen'],
      peerDependencies: {
        'gen': '^1.0.0'
      },
      devDependencies: {
        'gen': '^1.0.0',
        ...(useTypeScript && {
          'typescript': '^5.0.0',
          '@types/node': '^20.0.0'
        })
      }
    }

    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2))

    if (useTypeScript) {
      const tsConfig = {
        compilerOptions: {
          target: 'ES2022',
          module: 'CommonJS',
          lib: ['ES2022'],
          outDir: './dist',
          rootDir: './',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true
        },
        include: ['*.ts']
      }

      fs.writeFileSync('tsconfig.json', JSON.stringify(tsConfig, null, 2))
    }

    return ok(undefined)
  } catch (error) {
    return err(fromError(error))
  }
}
