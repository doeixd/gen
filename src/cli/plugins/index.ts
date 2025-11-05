/**
 * Plugin System
 * Load and manage Gen plugins
 */

import { Result, ok, err } from 'neverthrow'
import path from 'path'
import fs from 'fs'
import { pathToFileURL } from 'url'

// Import utilities
import { logger } from '../../utils/logger.js'
import { CLIError, fromError } from '../../utils/errors.js'

export interface GenPlugin {
  name: string
  version: string
  description?: string
  generators?: Record<string, Function>
  commands?: Record<string, any>
  hooks?: {
    preGenerate?: (args: any) => Promise<void>
    postGenerate?: (args: any) => Promise<void>
    preCommand?: (command: string, args: any[]) => Promise<void>
    postCommand?: (command: string, args: any[]) => Promise<void>
  }
}

/**
 * Load all configured plugins
 */
export async function loadPlugins(pluginNames: string[]): Promise<Result<GenPlugin[], CLIError>> {
  try {
    const plugins: GenPlugin[] = []

    for (const pluginName of pluginNames) {
      logger.debug(`Loading plugin: ${pluginName}`)

      const loadResult = await loadPlugin(pluginName)
      if (loadResult.isErr()) {
        logger.warn(`Failed to load plugin '${pluginName}': ${loadResult.error.message}`)
        continue
      }

      plugins.push(loadResult.value)
      logger.debug(`Loaded plugin: ${pluginName} v${loadResult.value.version}`)
    }

    return ok(plugins)
  } catch (error) {
    return err(fromError(error))
  }
}

/**
 * Load a single plugin
 */
async function loadPlugin(pluginName: string): Promise<Result<GenPlugin, CLIError>> {
  try {
    let pluginModule: any

    // Try to load as a local file path first
    if (fs.existsSync(pluginName)) {
      const pluginPath = path.resolve(pluginName)
      const pluginUrl = pathToFileURL(pluginPath).href
      pluginModule = await import(pluginUrl)
    } else {
      // Try to load as an npm package
      try {
        pluginModule = await import(pluginName)
      } catch {
        // Try with gen-plugin- prefix
        pluginModule = await import(`gen-plugin-${pluginName}`)
      }
    }

    // Get the default export
    const plugin = pluginModule.default || pluginModule

    // Validate plugin structure
    if (!plugin || typeof plugin !== 'object') {
      return err({
        code: 'INVALID_PLUGIN' as any,
        message: `Plugin '${pluginName}' does not export a valid plugin object`
      })
    }

    if (!plugin.name) {
      plugin.name = pluginName
    }

    if (!plugin.version) {
      plugin.version = '1.0.0'
    }

    // Validate required properties
    if (!plugin.generators && !plugin.commands) {
      logger.warn(`Plugin '${pluginName}' has no generators or commands`)
    }

    return ok(plugin)
  } catch (error) {
    return err(fromError(error))
  }
}

/**
 * Create a plugin template
 */
export function createPluginTemplate(name: string, type: 'generator' | 'command' | 'full' = 'generator'): GenPlugin {
  const basePlugin: GenPlugin = {
    name,
    version: '1.0.0',
    description: `Gen plugin for ${name}`,
  }

  switch (type) {
    case 'generator':
      return {
        ...basePlugin,
        generators: {
          [name]: async (args: any) => {
            logger.info(`Running ${name} generator...`)
            // Placeholder implementation
          }
        }
      }

    case 'command':
      return {
        ...basePlugin,
        commands: {
          [name]: {
            command: name,
            description: `${name} command`,
            action: () => {
              logger.info(`Running ${name} command...`)
            }
          }
        }
      }

    case 'full':
      return {
        ...basePlugin,
        generators: {
          [name]: async (args: any) => {
            logger.info(`Running ${name} generator...`)
          }
        },
        commands: {
          [name]: {
            command: name,
            description: `${name} command`,
            action: () => {
              logger.info(`Running ${name} command...`)
            }
          }
        }
      }
  }
}

/**
 * Register a plugin programmatically
 */
export function registerPlugin(plugin: GenPlugin): void {
  // This could be used for runtime plugin registration
  logger.info(`Registered plugin: ${plugin.name} v${plugin.version}`)
}

/**
 * Get plugin information
 */
export function getPluginInfo(plugin: GenPlugin): {
  name: string
  version: string
  hasGenerators: boolean
  hasCommands: boolean
  generatorCount: number
  commandCount: number
} {
  return {
    name: plugin.name,
    version: plugin.version,
    hasGenerators: !!plugin.generators,
    hasCommands: !!plugin.commands,
    generatorCount: plugin.generators ? Object.keys(plugin.generators).length : 0,
    commandCount: plugin.commands ? Object.keys(plugin.commands).length : 0,
  }
}

/**
 * List available plugins in the ecosystem
 * This would typically fetch from an API or registry
 */
export async function listAvailablePlugins(): Promise<Result<any[], CLIError>> {
  try {
    // Placeholder - in a real implementation, this would fetch from npm or a plugin registry
    const availablePlugins = [
      {
        name: 'gen-plugin-react',
        version: '1.0.0',
        description: 'React-specific generators and components'
      },
      {
        name: 'gen-plugin-database',
        version: '1.0.0',
        description: 'Advanced database schema generators'
      },
      {
        name: 'gen-plugin-api',
        version: '1.0.0',
        description: 'REST and GraphQL API generators'
      }
    ]

    return ok(availablePlugins)
  } catch (error) {
    return err(fromError(error))
  }
}
