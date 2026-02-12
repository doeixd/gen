import fs from 'fs'
import path from 'path'

export const VIRTUAL_ENTITIES_ID = 'virtual:gen/entities'
export const VIRTUAL_ENTITY_MAP_ID = 'virtual:gen/entity-map'

const RESOLVED_VIRTUAL_ENTITIES_ID = `\0${VIRTUAL_ENTITIES_ID}`
const RESOLVED_VIRTUAL_ENTITY_MAP_ID = `\0${VIRTUAL_ENTITY_MAP_ID}`

export interface ViteEntityDiscoveryPluginOptions {
  root?: string
  include?: string[]
  exclude?: string[]
  strict?: boolean
}

interface MinimalViteServer {
  moduleGraph: {
    getModuleById(id: string): unknown
    invalidateModule(mod: unknown): void
  }
  ws: {
    send(payload: { type: string }): void
  }
  watcher: {
    on(event: 'add' | 'change' | 'unlink', cb: (file: string) => void): void
  }
}

interface MinimalVitePlugin {
  name: string
  enforce?: 'pre' | 'post'
  resolveId?(id: string): string | null
  load?(id: string): string | null
  configureServer?(server: MinimalViteServer): void
}

export interface NormalizedEntityModule {
  entities: any[]
}

const DEFAULT_INCLUDE = ['src/**/*.entity.ts', 'src/**/*.entity.tsx']
const DEFAULT_EXCLUDE = ['**/node_modules/**', '**/dist/**', '**/.git/**']

function toPosix(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

function globPatternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '___DOUBLE_STAR___')
    .replace(/\*/g, '[^/]*')
    .replace(/___DOUBLE_STAR___/g, '.*')
  return new RegExp(`^${escaped}$`)
}

export function isEntityFilePath(filePath: string): boolean {
  const normalized = toPosix(filePath)
  return normalized.endsWith('.entity.ts') || normalized.endsWith('.entity.tsx')
}

function shouldIncludeFile(relativePath: string, include: string[], exclude: string[]): boolean {
  const rel = toPosix(relativePath)
  const includeMatch = include.some((pattern) => globPatternToRegex(pattern).test(rel))
  if (!includeMatch) return false
  const excludeMatch = exclude.some((pattern) => globPatternToRegex(pattern).test(rel))
  return !excludeMatch
}

export function discoverEntityFiles(root: string, include: string[] = DEFAULT_INCLUDE, exclude: string[] = DEFAULT_EXCLUDE): string[] {
  const files: string[] = []

  const walk = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const absolutePath = path.join(dir, entry.name)
      const relativePath = toPosix(path.relative(root, absolutePath))

      if (entry.isDirectory()) {
        const skip = exclude.some((pattern) => globPatternToRegex(pattern).test(`${relativePath}/`))
        if (!skip) walk(absolutePath)
        continue
      }

      if (!isEntityFilePath(relativePath)) continue
      if (!shouldIncludeFile(relativePath, include, exclude)) continue

      files.push(absolutePath)
    }
  }

  if (fs.existsSync(root)) {
    walk(root)
  }

  return files.sort((a, b) => a.localeCompare(b))
}

export function normalizeEntityModule(moduleValue: unknown, source: string): NormalizedEntityModule {
  const mod = moduleValue as Record<string, unknown>
  const fromDefault = mod?.default
  const fromEntity = mod?.entity
  const fromEntities = mod?.entities

  const normalized: unknown[] = []
  if (Array.isArray(fromEntities)) normalized.push(...fromEntities)
  if (fromEntity) normalized.push(fromEntity)
  if (fromDefault) normalized.push(fromDefault)

  const entities = normalized.filter((candidate) => {
    const e = candidate as Record<string, unknown>
    return Boolean(e && typeof e === 'object' && typeof e.id === 'string' && e.db && e.fields)
  })

  if (entities.length === 0) {
    throw new Error(
      `[gen:vite-entity-discovery] No valid entity exports found in ${source}. ` +
      `Use one of: default export, named 'entity', or named 'entities'.`
    )
  }

  return { entities }
}

export function validateUniqueEntityIds(entities: Array<{ id: string; __source?: string }>): void {
  const byId = new Map<string, string[]>()
  for (const entity of entities) {
    const source = entity.__source || 'unknown'
    const existing = byId.get(entity.id) || []
    existing.push(source)
    byId.set(entity.id, existing)
  }

  const duplicates = Array.from(byId.entries()).filter(([, sources]) => sources.length > 1)
  if (duplicates.length === 0) return

  const detail = duplicates
    .map(([id, sources]) => `- ${id}: ${sources.join(', ')}`)
    .join('\n')

  throw new Error(`[gen:vite-entity-discovery] Duplicate entity ids found:\n${detail}`)
}

function buildVirtualEntitiesModule(entityFiles: string[], strict: boolean): string {
  const importLines = entityFiles
    .map((file, index) => {
      const normalized = toPosix(file)
      const fsPath = normalized.startsWith('/') ? normalized : `/${normalized}`
      return `import * as __entityMod${index} from '/@fs${fsPath}'`
    })
    .join('\n')

  const moduleRefs = entityFiles
    .map((file, index) => `  { mod: __entityMod${index}, source: ${JSON.stringify(toPosix(file))} }`)
    .join(',\n')

  return `${importLines}

const __strict = ${strict ? 'true' : 'false'}
const __sources = [
${moduleRefs}
]

function __normalize(mod, source) {
  const fromDefault = mod?.default
  const fromEntity = mod?.entity
  const fromEntities = mod?.entities
  const normalized = []
  if (Array.isArray(fromEntities)) normalized.push(...fromEntities)
  if (fromEntity) normalized.push(fromEntity)
  if (fromDefault) normalized.push(fromDefault)

  const entities = normalized.filter((candidate) => {
    return Boolean(candidate && typeof candidate === 'object' && typeof candidate.id === 'string' && candidate.db && candidate.fields)
  })

  if (entities.length === 0 && __strict) {
    throw new Error(
      '[gen:vite-entity-discovery] No valid entity exports found in ' + source +
      '. Use default export, named entity, or named entities.'
    )
  }

  return entities
}

const __loaded = __sources.flatMap(({ mod, source }) =>
  __normalize(mod, source).map((entity) => ({ ...entity, __source: source }))
)

const __dupes = (() => {
  const byId = new Map()
  for (const e of __loaded) {
    const arr = byId.get(e.id) || []
    arr.push(e.__source)
    byId.set(e.id, arr)
  }
  return Array.from(byId.entries()).filter(([, sources]) => sources.length > 1)
})()

if (__dupes.length > 0) {
  const detail = __dupes.map(([id, sources]) => '- ' + id + ': ' + sources.join(', ')).join('\n')
  throw new Error('[gen:vite-entity-discovery] Duplicate entity ids found:\n' + detail)
}

export const entities = __loaded
export const entityById = Object.fromEntries(__loaded.map((entity) => [entity.id, entity]))
export const getEntity = (id) => entityById[id]
export default entities
`
}

export function createEntityDiscoveryPlugin(options: ViteEntityDiscoveryPluginOptions = {}): MinimalVitePlugin {
  const root = options.root ? path.resolve(options.root) : process.cwd()
  const include = options.include ?? DEFAULT_INCLUDE
  const exclude = options.exclude ?? DEFAULT_EXCLUDE
  const strict = options.strict ?? true

  const invalidateVirtualModules = (server: MinimalViteServer) => {
    const entitiesMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ENTITIES_ID)
    const mapMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ENTITY_MAP_ID)
    if (entitiesMod) server.moduleGraph.invalidateModule(entitiesMod)
    if (mapMod) server.moduleGraph.invalidateModule(mapMod)
    server.ws.send({ type: 'full-reload' })
  }

  return {
    name: 'gen:vite-entity-discovery',
    enforce: 'pre',

    resolveId(id) {
      if (id === VIRTUAL_ENTITIES_ID) return RESOLVED_VIRTUAL_ENTITIES_ID
      if (id === VIRTUAL_ENTITY_MAP_ID) return RESOLVED_VIRTUAL_ENTITY_MAP_ID
      return null
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_ENTITY_MAP_ID) {
        return `export { entityById as default, entityById, entities, getEntity } from '${VIRTUAL_ENTITIES_ID}'`
      }

      if (id === RESOLVED_VIRTUAL_ENTITIES_ID) {
        const entityFiles = discoverEntityFiles(root, include, exclude)
        return buildVirtualEntitiesModule(entityFiles, strict)
      }

      return null
    },

    configureServer(server) {
      const onChange = (file: string) => {
        const rel = toPosix(path.relative(root, file))
        if (!isEntityFilePath(rel)) return
        if (!shouldIncludeFile(rel, include, exclude)) return
        invalidateVirtualModules(server)
      }

      server.watcher.on('add', onChange)
      server.watcher.on('change', onChange)
      server.watcher.on('unlink', onChange)
    },
  }
}
