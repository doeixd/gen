/**
 * Config Command
 * Manage Gen configuration and settings
 */

import { Command } from 'commander'
import { Result, ok, err } from 'neverthrow'
import path from 'path'
import fs from 'fs'

// Import utilities
import { logger } from '../../utils/logger.js'
import { CLIError, fromError } from '../../utils/errors.js'
import { DEFAULT_CONFIG } from '../../utils/config.js'

export function createConfigCommand(): Command {
  const command = new Command('config')
    .alias('c')
    .description('Manage Gen configuration')

  // Add subcommands
  command.addCommand(createConfigShowCommand())
  command.addCommand(createConfigSetCommand())
  command.addCommand(createConfigGetCommand())
  command.addCommand(createConfigResetCommand())
  command.addCommand(createConfigInitCommand())

  return command
}

// Show current configuration
function createConfigShowCommand(): Command {
  const command = new Command('show')
    .alias('s')
    .description('Show current configuration')
    .option('--global', 'show global configuration')
    .action(async (options: any) => {
      try {
        logger.section('⚙️ Current Configuration')

        const configResult = loadConfig(options.global)
        if (configResult.isErr()) {
          logger.error('Failed to load config', configResult.error.code, {
            error: configResult.error.message
          })
          process.exit(1)
        }

        const config = configResult.value

        // Display configuration
        console.log(JSON.stringify(config, null, 2))

      } catch (error) {
        logger.error('Config show failed', 'CLI_ERROR', {
          error: error instanceof Error ? error.message : String(error)
        })
        process.exit(1)
      }
    })

  return command
}

// Set configuration value
function createConfigSetCommand(): Command {
  const command = new Command('set')
    .description('Set a configuration value')
    .argument('<key>', 'configuration key (dot notation)')
    .argument('<value>', 'configuration value (JSON)')
    .option('--global', 'set global configuration')
    .action(async (key: string, value: string, options: any) => {
      try {
        logger.section(`⚙️ Setting Configuration: ${key}`)

        // Load current config
        const configResult = loadConfig(options.global)
        if (configResult.isErr()) {
          logger.error('Failed to load config', configResult.error.code, {
            error: configResult.error.message
          })
          process.exit(1)
        }

        const config = configResult.value

        // Parse value
        let parsedValue: any
        try {
          parsedValue = JSON.parse(value)
        } catch {
          // If not valid JSON, treat as string
          parsedValue = value
        }

        // Set nested property
        setNestedProperty(config, key, parsedValue)

        // Save config
        const saveResult = saveConfig(config, options.global)
        if (saveResult.isErr()) {
          logger.error('Failed to save config', saveResult.error.code, {
            error: saveResult.error.message
          })
          process.exit(1)
        }

        logger.success(`Configuration updated: ${key} = ${JSON.stringify(parsedValue)}`)

      } catch (error) {
        logger.error('Config set failed', 'CLI_ERROR', {
          error: error instanceof Error ? error.message : String(error)
        })
        process.exit(1)
      }
    })

  return command
}

// Get configuration value
function createConfigGetCommand(): Command {
  const command = new Command('get')
    .description('Get a configuration value')
    .argument('<key>', 'configuration key (dot notation)')
    .option('--global', 'get global configuration')
    .action(async (key: string, options: any) => {
      try {
        const configResult = loadConfig(options.global)
        if (configResult.isErr()) {
          logger.error('Failed to load config', configResult.error.code, {
            error: configResult.error.message
          })
          process.exit(1)
        }

        const config = configResult.value
        const value = getNestedProperty(config, key)

        if (value === undefined) {
          logger.error(`Configuration key '${key}' not found`, 'CLI_ERROR')
          process.exit(1)
        }

        console.log(JSON.stringify(value, null, 2))

      } catch (error) {
        logger.error('Config get failed', 'CLI_ERROR', {
          error: error instanceof Error ? error.message : String(error)
        })
        process.exit(1)
      }
    })

  return command
}

// Reset configuration
function createConfigResetCommand(): Command {
  const command = new Command('reset')
    .description('Reset configuration to defaults')
    .option('--global', 'reset global configuration')
    .option('--confirm', 'skip confirmation prompt')
    .action(async (options: any) => {
      try {
        if (!options.confirm) {
          logger.warn('This will reset all configuration to defaults')
          logger.warn('Are you sure? Use --confirm to proceed')
          process.exit(0)
        }

        logger.section('⚙️ Resetting Configuration')

        const defaultConfig = { ...DEFAULT_CONFIG, plugins: [] }

        const saveResult = saveConfig(defaultConfig, options.global)
        if (saveResult.isErr()) {
          logger.error('Failed to reset config', saveResult.error.code, {
            error: saveResult.error.message
          })
          process.exit(1)
        }

        logger.success('Configuration reset to defaults')

      } catch (error) {
        logger.error('Config reset failed', 'CLI_ERROR', {
          error: error instanceof Error ? error.message : String(error)
        })
        process.exit(1)
      }
    })

  return command
}

// Initialize configuration
function createConfigInitCommand(): Command {
  const command = new Command('init')
    .alias('i')
    .description('Initialize configuration file')
    .option('--global', 'initialize global configuration')
    .option('--force', 'overwrite existing configuration')
    .action(async (options: any) => {
      try {
        logger.section('⚙️ Initializing Configuration')

        const configPath = getConfigPath(options.global)

        if (fs.existsSync(configPath) && !options.force) {
          logger.error('Configuration file already exists', 'CLI_ERROR', {
            suggestion: 'Use --force to overwrite'
          })
          process.exit(1)
        }

        const defaultConfig = {
          ...DEFAULT_CONFIG,
          plugins: []
        }

        const saveResult = saveConfig(defaultConfig, options.global)
        if (saveResult.isErr()) {
          logger.error('Failed to initialize config', saveResult.error.code, {
            error: saveResult.error.message
          })
          process.exit(1)
        }

        logger.success(`Configuration initialized: ${configPath}`)

      } catch (error) {
        logger.error('Config init failed', 'CLI_ERROR', {
          error: error instanceof Error ? error.message : String(error)
        })
        process.exit(1)
      }
    })

  return command
}

// Helper functions
function loadConfig(global: boolean): Result<any, CLIError> {
  try {
    const configPath = getConfigPath(global)

    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8')
      return ok(JSON.parse(content))
    }

    // Return defaults if no config exists
    return ok({ ...DEFAULT_CONFIG, plugins: [] })
  } catch (error) {
    return err(fromError(error))
  }
}

function saveConfig(config: any, global: boolean): Result<void, CLIError> {
  try {
    const configPath = getConfigPath(global)
    const dir = path.dirname(configPath)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    return ok(undefined)
  } catch (error) {
    return err(fromError(error))
  }
}

function getConfigPath(global: boolean): string {
  if (global) {
    const homeDir = process.platform === 'win32'
      ? process.env.USERPROFILE
      : process.env.HOME
    return path.join(homeDir || '', '.gen', 'config.json')
  } else {
    return path.join(process.cwd(), '.genrc.json')
  }
}

function setNestedProperty(obj: any, path: string, value: any): void {
  const keys = path.split('.')
  let current = obj

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {}
    }
    current = current[key]
  }

  current[keys[keys.length - 1]] = value
}

function getNestedProperty(obj: any, path: string): any {
  const keys = path.split('.')
  let current = obj

  for (const key of keys) {
    if (!(key in current) || typeof current !== 'object' || current === null) {
      return undefined
    }
    current = current[key]
  }

  return current
}
