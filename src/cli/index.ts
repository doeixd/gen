#!/usr/bin/env node

/**
 * Gen CLI - Advanced Code Generation Tool
 *
 * A comprehensive, extensible CLI for code generation with plugin support,
 * custom commands, and advanced configuration management.
 */

import { Command } from 'commander'
import { Result, ok, err } from 'neverthrow'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

// Import commands
import { createGenerateCommand } from './commands/generate.js'
import { createInitCommand } from './commands/init.js'
import { createPluginCommand } from './commands/plugin.js'
import { createConfigCommand } from './commands/config.js'

// Import CLI utilities
import { loadPlugins } from './plugins/index.js'
import { logger } from '../utils/logger.js'
import { CLIError, CLIErrorCode, fromError } from '../utils/errors.js'

// CLI Configuration
interface CLIConfig {
  version: string
  plugins: string[]
  commands: Record<string, any>
}

const DEFAULT_CLI_CONFIG: CLIConfig = {
  version: '1.0.0',
  plugins: [],
  commands: {}
}

// Load CLI configuration
function loadCLIConfig(): Result<CLIConfig, CLIError> {
  try {
    const configPath = path.join(process.cwd(), '.genrc.json')
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      return ok({ ...DEFAULT_CLI_CONFIG, ...config })
    }
    return ok(DEFAULT_CLI_CONFIG)
  } catch (error) {
    return err(fromError(error, CLIErrorCode.CONFIG_ERROR))
  }
}

// Create the main CLI program
async function createCLI(): Promise<Command> {
  const program = new Command()

  // Load CLI configuration
  const configResult = loadCLIConfig()
  if (configResult.isErr()) {
    logger.error('Failed to load CLI config', configResult.error.code, {
      error: configResult.error.message
    })
    process.exit(1)
  }

  const cliConfig = configResult.value

  // Basic program setup
  program
    .name('gen')
    .description('Advanced code generation with plugin support')
    .version(cliConfig.version)
    .option('-v, --verbose', 'enable verbose logging')
    .option('-q, --quiet', 'suppress all output except errors')
    .option('--no-color', 'disable colored output')

  // Load plugins
  logger.subsection('Loading plugins...')
  const pluginsResult = await loadPlugins(cliConfig.plugins)
  if (pluginsResult.isErr()) {
    logger.error('Failed to load plugins', pluginsResult.error.code, {
      error: pluginsResult.error.message
    })
    // Continue without plugins
  } else {
    const plugins = pluginsResult.value
    logger.success(`Loaded ${plugins.length} plugins`)
  }

  // Register built-in commands
  program.addCommand(createGenerateCommand())
  program.addCommand(createInitCommand())
  program.addCommand(createPluginCommand())
  program.addCommand(createConfigCommand())

  // Register plugin commands
  if (pluginsResult.isOk()) {
    for (const plugin of pluginsResult.value) {
      if (plugin.commands) {
        for (const [name, command] of Object.entries(plugin.commands)) {
          program.addCommand(command)
          logger.debug(`Registered plugin command: ${name}`)
        }
      }
    }
  }

  // Global error handling
  program.exitOverride()

  program.on('command:*', (unknownCommand) => {
    logger.error(`Unknown command: ${unknownCommand[0]}`, 'CLI_ERROR', {
      suggestion: 'Run "gen --help" to see available commands'
    })
    process.exit(1)
  })

  return program
}

// Main CLI execution
async function main() {
  try {
    const program = await createCLI()

    // Handle no command provided
    if (process.argv.length === 2) {
      program.help()
      return
    }

    await program.parseAsync(process.argv)
  } catch (error) {
    if (error instanceof Error && 'exitCode' in error) {
      // Commander.js exit - already handled
      process.exit((error as any).exitCode)
    } else {
      logger.error('CLI execution failed', 'CLI_ERROR', {
        error: error instanceof Error ? error.message : String(error)
      })
      process.exit(1)
    }
  }
}

// Execute CLI
main().catch((error) => {
  console.error('Fatal CLI error:', error)
  process.exit(1)
})
