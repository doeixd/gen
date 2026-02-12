import fs from 'fs'
import os from 'os'
import path from 'path'
import { pathToFileURL } from 'url'
import { createRequire } from 'module'

import type { Entity } from './entity'
import type { GeneratorConfig } from './utils/config'
import { writeFile } from './utils/file-system'
import { logger } from './utils/logger'

export interface ProjectGeneratedFile {
  path: string
  content: string
  overwrite?: boolean
  backup?: boolean
}

export interface ProjectGeneratorEntitySelector {
  include?: string[]
  exclude?: string[]
  test?: (entity: Entity<Record<string, any>>) => boolean
}

export interface ProjectGenerator {
  id: string
  description?: string
  targets?: string[]
  entities?: string[] | ProjectGeneratorEntitySelector
  generate: (ctx: ProjectGeneratorContext) => Promise<ProjectGeneratedFile[] | void> | ProjectGeneratedFile[] | void
}

export interface ProjectGeneratorContext {
  config: GeneratorConfig
  targets: string[]
  entities: Array<Entity<Record<string, any>>>
  allEntities: Array<Entity<Record<string, any>>>
  entityMap: Record<string, Entity<Record<string, any>>>
  rootDir: string
}

export interface RunProjectGeneratorsOptions {
  rootDir?: string
  targets: string[]
  entities: Array<Entity<Record<string, any>>>
  config: GeneratorConfig
  include?: string[]
  exclude?: string[]
}

const DEFAULT_INCLUDE = ['src']
const DEFAULT_EXCLUDE = ['node_modules', '.git', 'dist', 'build']
const VALID_EXTENSIONS = new Set(['.generator.ts', '.generator.tsx', '.generator.js', '.generator.mjs', '.generator.cjs'])

function toPosix(input: string): string {
  return input.replace(/\\/g, '/')
}

function matchesInclude(relativePath: string, includes: string[]): boolean {
  const rel = toPosix(relativePath)
  if (includes.length === 0) return true
  return includes.some((item) => {
    const normalized = toPosix(item)
    if (normalized.includes('*')) {
      const regex = new RegExp(`^${normalized.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')}$`)
      return regex.test(rel)
    }
    return rel.startsWith(normalized)
  })
}

function matchesExclude(relativePath: string, excludes: string[]): boolean {
  const rel = toPosix(relativePath)
  return excludes.some((item) => rel.startsWith(toPosix(item)))
}

export function discoverProjectGeneratorFiles(
  rootDir: string,
  include: string[] = DEFAULT_INCLUDE,
  exclude: string[] = DEFAULT_EXCLUDE
): string[] {
  const absoluteRoot = path.resolve(rootDir)
  const files: string[] = []

  const walk = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const absolutePath = path.join(dir, entry.name)
      const relativePath = toPosix(path.relative(absoluteRoot, absolutePath))

      if (entry.isDirectory()) {
        if (matchesExclude(relativePath, exclude)) continue
        walk(absolutePath)
        continue
      }

      const hasGeneratorExt = Array.from(VALID_EXTENSIONS).some((ext) => relativePath.endsWith(ext))
      if (!hasGeneratorExt) continue
      if (!matchesInclude(relativePath, include)) continue
      if (matchesExclude(relativePath, exclude)) continue

      files.push(absolutePath)
    }
  }

  if (fs.existsSync(absoluteRoot)) {
    walk(absoluteRoot)
  }

  return files.sort((a, b) => a.localeCompare(b))
}

async function transpileTypeScriptModule(filePath: string, rootDir: string): Promise<string> {
  let ts: any
  try {
    ts = await import('typescript')
  } catch {
    const requireFromRoot = createRequire(path.join(rootDir, 'package.json'))
    ts = requireFromRoot('typescript')
  }

  const source = fs.readFileSync(filePath, 'utf-8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
    },
    fileName: path.basename(filePath),
  })

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-project-generator-'))
  const outPath = path.join(tempDir, `${path.basename(filePath)}.mjs`)
  fs.writeFileSync(outPath, transpiled.outputText, 'utf-8')
  return outPath
}

export async function loadProjectGenerator(filePath: string, rootDir: string): Promise<ProjectGenerator> {
  const isTs = filePath.endsWith('.ts') || filePath.endsWith('.tsx')

  let imported: Record<string, any>
  try {
    imported = await import(pathToFileURL(filePath).href)
  } catch (error) {
    if (!isTs) {
      throw error
    }
    const transpiledPath = await transpileTypeScriptModule(filePath, rootDir)
    imported = await import(pathToFileURL(transpiledPath).href)
  }

  const candidate = (imported.default || imported.generator || imported) as ProjectGenerator
  if (!candidate || typeof candidate !== 'object' || typeof candidate.id !== 'string' || typeof candidate.generate !== 'function') {
    throw new Error(
      `[gen:project-generators] Invalid generator module at ${filePath}. Expected default export with { id, generate }.`
    )
  }

  return candidate
}

function selectEntities(
  selector: ProjectGenerator['entities'],
  allEntities: Array<Entity<Record<string, any>>>
): Array<Entity<Record<string, any>>> {
  if (!selector) return allEntities

  if (Array.isArray(selector)) {
    const set = new Set(selector)
    return allEntities.filter((entity) => set.has(entity.id))
  }

  const include = new Set(selector.include || allEntities.map((e) => e.id))
  const exclude = new Set(selector.exclude || [])

  return allEntities.filter((entity) => {
    const basic = include.has(entity.id) && !exclude.has(entity.id)
    if (!basic) return false
    if (selector.test) return selector.test(entity)
    return true
  })
}

export async function runProjectGenerators(options: RunProjectGeneratorsOptions): Promise<void> {
  const rootDir = options.rootDir ? path.resolve(options.rootDir) : process.cwd()
  const include = options.include && options.include.length > 0 ? options.include : DEFAULT_INCLUDE
  const exclude = options.exclude && options.exclude.length > 0 ? options.exclude : DEFAULT_EXCLUDE
  const targets = options.targets
  const allEntities = options.entities
  const entityMap = Object.fromEntries(allEntities.map((e) => [e.id, e]))

  const files = discoverProjectGeneratorFiles(rootDir, include, exclude)
  if (files.length === 0) {
    return
  }

  logger.subsection(`Running project generators (${files.length} discovered)`)

  const loaded: ProjectGenerator[] = []
  for (const file of files) {
    const generator = await loadProjectGenerator(file, rootDir)
    loaded.push(generator)
  }

  const byId = new Map<string, ProjectGenerator[]>()
  for (const generator of loaded) {
    const existing = byId.get(generator.id) || []
    existing.push(generator)
    byId.set(generator.id, existing)
  }
  const duplicateIds = Array.from(byId.entries()).filter(([, list]) => list.length > 1)
  if (duplicateIds.length > 0) {
    const detail = duplicateIds.map(([id, list]) => `${id} (${list.length})`).join(', ')
    throw new Error(`[gen:project-generators] Duplicate project generator ids: ${detail}`)
  }

  for (const generator of loaded) {
    if (generator.targets && generator.targets.length > 0) {
      const intersects = generator.targets.some((target) => targets.includes(target))
      if (!intersects) continue
    }

    const selectedEntities = selectEntities(generator.entities, allEntities)
    const ctx: ProjectGeneratorContext = {
      config: options.config,
      targets,
      entities: selectedEntities,
      allEntities,
      entityMap,
      rootDir,
    }

    const artifacts = await generator.generate(ctx)
    if (!artifacts || artifacts.length === 0) {
      logger.info(`Project generator '${generator.id}' produced no files`)
      continue
    }

    for (const artifact of artifacts) {
      const writeResult = writeFile(path.resolve(rootDir, artifact.path), artifact.content, {
        createDirectories: true,
        overwrite: artifact.overwrite ?? options.config.overwrite,
        backup: artifact.backup ?? options.config.createBackups,
        dryRun: options.config.dryRun,
        addHeader: options.config.header.includeHeader,
        eslintDisable: options.config.header.eslintDisable,
      })

      if (writeResult.isErr()) {
        throw new Error(
          `[gen:project-generators] Failed writing ${artifact.path} from '${generator.id}': ${writeResult.error.message}`
        )
      }
      logger.success(`Project generator '${generator.id}' wrote ${artifact.path}`)
    }
  }
}
