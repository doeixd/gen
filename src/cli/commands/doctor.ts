/**
 * Doctor Command
 * Project health checks for generated integrations.
 */

import { Command } from 'commander'
import fs from 'fs'
import path from 'path'

import { logger } from '../../utils/logger.js'

type Status = 'pass' | 'warn' | 'fail'

interface CheckResult {
  status: Status
  title: string
  details?: string
  fix?: string
}

function hasAnyFile(paths: string[]): boolean {
  return paths.some((p) => fs.existsSync(path.join(process.cwd(), p)))
}

function readJson(filePath: string): any | null {
  try {
    const absolute = path.join(process.cwd(), filePath)
    if (!fs.existsSync(absolute)) return null
    return JSON.parse(fs.readFileSync(absolute, 'utf-8'))
  } catch {
    return null
  }
}

function getInstalledPackages(): Set<string> {
  const pkg = readJson('package.json') || {}
  const all = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
    ...(pkg.peerDependencies || {}),
  }
  return new Set(Object.keys(all))
}

function parseMajor(version: string): number | null {
  const normalized = version.replace(/^v/, '')
  const major = Number(normalized.split('.')[0])
  return Number.isFinite(major) ? major : null
}

function checkNodeVersionForZero(projectUsesZero: boolean): CheckResult {
  if (!projectUsesZero) {
    return { status: 'pass', title: 'Node runtime compatibility', details: 'Zero integration not detected' }
  }
  const major = parseMajor(process.version)
  if (major !== null && major >= 22) {
    return { status: 'pass', title: 'Node runtime compatibility', details: `Detected Node ${process.version}` }
  }
  return {
    status: 'warn',
    title: 'Node runtime compatibility',
    details: `Detected Node ${process.version}; @rocicorp/zero currently expects Node >= 22`,
    fix: 'Upgrade Node to >=22 for zero-auth local installs and native builds',
  }
}

function checkRequiredDeps(integration: string, required: string[], installed: Set<string>): CheckResult {
  const missing = required.filter((dep) => !installed.has(dep))
  if (missing.length === 0) {
    return { status: 'pass', title: `${integration} dependencies`, details: 'All required packages are installed' }
  }
  return {
    status: 'fail',
    title: `${integration} dependencies`,
    details: `Missing: ${missing.join(', ')}`,
    fix: `Install with: npm install ${missing.join(' ')}`,
  }
}

function checkPatchFiles(): CheckResult {
  const patchFiles = [
    'src/routes/__root.convex-auth.patch.tsx',
    'src/routes/router.convex-auth.patch.tsx',
    'src/routes/__root.spacetime-auth.patch.tsx',
    'src/routes/router.spacetime-auth.patch.tsx',
    'src/routes/__root.zero-auth.patch.tsx',
    'src/routes/router.zero-auth.patch.tsx',
    'vite.convex-auth.patch.ts',
  ].filter((p) => fs.existsSync(path.join(process.cwd(), p)))

  if (patchFiles.length === 0) {
    return { status: 'pass', title: 'Patch merge state', details: 'No pending patch files detected' }
  }
  return {
    status: 'warn',
    title: 'Patch merge state',
    details: `Pending patch files: ${patchFiles.join(', ')}`,
    fix: 'Merge patch files into app code, then delete patch files',
  }
}

function checkConvexViteConfig(projectUsesConvexAuth: boolean): CheckResult {
  if (!projectUsesConvexAuth) {
    return { status: 'pass', title: 'Convex SSR bundling', details: 'Convex auth integration not detected' }
  }

  const vitePath = path.join(process.cwd(), 'vite.config.ts')
  if (!fs.existsSync(vitePath)) {
    return {
      status: 'warn',
      title: 'Convex SSR bundling',
      details: 'vite.config.ts not found',
      fix: "Ensure SSR noExternal includes '@convex-dev/better-auth'",
    }
  }

  const vite = fs.readFileSync(vitePath, 'utf-8')
  if (vite.includes('@convex-dev/better-auth')) {
    return { status: 'pass', title: 'Convex SSR bundling', details: 'vite.config.ts includes @convex-dev/better-auth' }
  }

  return {
    status: 'warn',
    title: 'Convex SSR bundling',
    details: 'vite.config.ts does not include @convex-dev/better-auth in SSR noExternal',
    fix: "Add ssr.noExternal = ['@convex-dev/better-auth']",
  }
}

function checkEnvVars(filePath: string, required: string[], label: string): CheckResult {
  const abs = path.join(process.cwd(), filePath)
  if (!fs.existsSync(abs)) {
    return {
      status: 'warn',
      title: `${label} env file`,
      details: `${filePath} not found`,
      fix: `Create ${filePath} and define: ${required.join(', ')}`,
    }
  }

  const content = fs.readFileSync(abs, 'utf-8')
  const missing = required.filter((name) => !new RegExp(`^${name}=`, 'm').test(content))
  if (missing.length === 0) {
    return { status: 'pass', title: `${label} env file`, details: `${filePath} includes required keys` }
  }
  return {
    status: 'warn',
    title: `${label} env file`,
    details: `Missing in ${filePath}: ${missing.join(', ')}`,
    fix: `Add keys to ${filePath}`,
  }
}

function checkRouteCollisions(): CheckResult {
  const collisions: string[] = []
  const candidates: Array<[string, string]> = [
    ['src/routes/api/auth/$.ts', 'src/routes/api/auth.ts'],
    ['src/routes/api/zero/query.ts', 'src/routes/api/zero/query/$.ts'],
    ['src/routes/api/zero/mutate.ts', 'src/routes/api/zero/mutate/$.ts'],
  ]

  for (const [a, b] of candidates) {
    if (fs.existsSync(path.join(process.cwd(), a)) && fs.existsSync(path.join(process.cwd(), b))) {
      collisions.push(`${a} <-> ${b}`)
    }
  }

  if (collisions.length === 0) {
    return { status: 'pass', title: 'Route collisions', details: 'No obvious route file collisions detected' }
  }
  return {
    status: 'warn',
    title: 'Route collisions',
    details: `Potential collisions: ${collisions.join('; ')}`,
    fix: 'Keep one route implementation per endpoint path',
  }
}

function checkFrameworkVersions(usesAnyIntegration: boolean, installed: Set<string>, pkgJson: any): CheckResult {
  if (!usesAnyIntegration) {
    return { status: 'pass', title: 'Framework versions', details: 'No integration scaffolds detected' }
  }

  const versionFrom = (name: string): string | undefined =>
    pkgJson?.dependencies?.[name] || pkgJson?.devDependencies?.[name] || pkgJson?.peerDependencies?.[name]

  const issues: string[] = []
  if (!installed.has('@tanstack/react-router')) {
    issues.push('missing @tanstack/react-router')
  }
  const viteVersion = versionFrom('vite')
  if (!viteVersion) {
    issues.push('missing vite')
  }

  if (issues.length === 0) {
    return { status: 'pass', title: 'Framework versions', details: 'Required framework packages detected' }
  }
  return {
    status: 'warn',
    title: 'Framework versions',
    details: issues.join(', '),
    fix: 'Install missing framework packages before running generated integrations',
  }
}

function printResult(result: CheckResult): void {
  if (result.status === 'pass') {
    logger.success(`${result.title}${result.details ? ` - ${result.details}` : ''}`)
    return
  }
  if (result.status === 'warn') {
    logger.warn(`${result.title}${result.details ? ` - ${result.details}` : ''}`)
    if (result.fix) logger.info(`Fix: ${result.fix}`)
    return
  }
  logger.error(result.title, 'CLI_ERROR', {
    details: result.details,
    fix: result.fix,
  })
}

export function createDoctorCommand(): Command {
  return new Command('doctor')
    .description('Run project health checks for generated integrations')
    .action(async () => {
      logger.section('🩺 Gen Doctor')

      const packageJsonExists = fs.existsSync(path.join(process.cwd(), 'package.json'))
      if (!packageJsonExists) {
        logger.error('package.json not found', 'CLI_ERROR', {
          fix: 'Run this command from your project root',
        })
        process.exit(1)
      }

      const usesConvexAuth = hasAnyFile(['convex/auth.ts', 'convex/convex.config.ts'])
      const usesSpacetimeAuth = hasAnyFile(['src/lib/spacetime-auth-adapter.ts', 'spacetimedb/src/index.ts'])
      const usesZeroAuth = hasAnyFile(['src/zero/schema.ts', 'src/routes/api/zero/query.ts', 'src/routes/api/zero/mutate.ts'])
      const usesAnyIntegration = usesConvexAuth || usesSpacetimeAuth || usesZeroAuth

      const installed = getInstalledPackages()
      const pkgJson = readJson('package.json') || {}
      const checks: CheckResult[] = [
        checkPatchFiles(),
        checkRouteCollisions(),
        checkConvexViteConfig(usesConvexAuth),
        checkNodeVersionForZero(usesZeroAuth),
        checkFrameworkVersions(usesAnyIntegration, installed, pkgJson),
      ]

      if (usesConvexAuth) {
        checks.push(checkRequiredDeps('convex-auth', ['convex', '@convex-dev/better-auth', 'better-auth'], installed))
        checks.push(checkEnvVars('.env.local.example', ['VITE_CONVEX_URL', 'VITE_CONVEX_SITE_URL', 'VITE_SITE_URL'], 'convex-auth'))
      }
      if (usesSpacetimeAuth) {
        checks.push(checkRequiredDeps('spacetime-auth', ['spacetimedb', 'better-auth'], installed))
        checks.push(checkEnvVars('.env.spacetime.example', ['SPACETIME_HOST', 'SPACETIME_MODULE_NAME', 'SITE_URL'], 'spacetime-auth'))
      }
      if (usesZeroAuth) {
        checks.push(checkRequiredDeps('zero-auth', ['@rocicorp/zero', 'better-auth', 'zod'], installed))
        checks.push(checkEnvVars('zero.env.example', ['VITE_ZERO_CACHE_URL', 'VITE_ZERO_QUERY_URL', 'VITE_ZERO_MUTATE_URL'], 'zero-auth'))
      }

      if (!usesConvexAuth && !usesSpacetimeAuth && !usesZeroAuth) {
        checks.push({
          status: 'warn',
          title: 'Integration detection',
          details: 'No auth integration scaffold files detected (convex-auth/spacetime-auth/zero-auth)',
          fix: 'Run `gen generate convex-auth|spacetime-auth|zero-auth` first',
        })
      }

      checks.forEach(printResult)

      const failCount = checks.filter((c) => c.status === 'fail').length
      const warnCount = checks.filter((c) => c.status === 'warn').length
      const passCount = checks.filter((c) => c.status === 'pass').length

      logger.info('')
      logger.info(`Doctor summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failures`)

      if (failCount > 0) {
        process.exit(1)
      }
    })
}
