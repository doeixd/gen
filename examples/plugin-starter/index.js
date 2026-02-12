import fs from 'fs'
import path from 'path'

/**
 * Example custom database generator.
 * Receives a single GeneratorArgs object from Gen.
 */
export async function generateDatabase(args) {
  const { config, entities } = args
  const outDir = path.resolve(config.paths.database)

  if (!config.dryRun) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  const marker = {
    generatedBy: 'gen-plugin-starter',
    entityCount: entities.length,
    entities: entities.map((e) => e.id),
    timestamp: new Date().toISOString(),
  }

  const markerPath = path.join(outDir, 'plugin-starter.marker.json')
  if (!config.dryRun) {
    fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2), 'utf-8')
  }
}

export async function generateAPI(_args) {
  // Optional in custom plugins.
}

export async function generateFrontend(_args) {
  // Optional in custom plugins.
}

export async function generateTests(_args) {
  // Optional in custom plugins.
}

export async function generateDocumentation(_args) {
  // Optional in custom plugins.
}

export default {
  name: 'gen-plugin-starter',
  version: '0.1.0',
  generators: {
    generateDatabase,
    generateAPI,
    generateFrontend,
    generateTests,
    generateDocumentation,
  },
}
