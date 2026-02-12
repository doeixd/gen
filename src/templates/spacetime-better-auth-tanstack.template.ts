/**
 * SpacetimeDB + Better Auth + TanStack Start Template
 * Generates integration files and setup docs.
 */

export interface SpacetimeBetterAuthTanstackTemplateOptions {
  siteUrl?: string
  spacetimeHost?: string
  spacetimeModuleName?: string
  entities?: any[]
  profile?: 'minimal' | 'prod-ready' | 'existing-app-merge'
}

export interface GeneratedSpacetimeBetterAuthTanstackFiles {
  [filePath: string]: string
}

export function generateSpacetimeBetterAuthTanstack(
  options: SpacetimeBetterAuthTanstackTemplateOptions = {}
): GeneratedSpacetimeBetterAuthTanstackFiles {
  const siteUrl = options.siteUrl ?? 'http://localhost:3000'
  const spacetimeHost = options.spacetimeHost ?? 'ws://127.0.0.1:3000'
  const spacetimeModuleName = options.spacetimeModuleName ?? 'my-spacetime-module'
  const entities = options.entities ?? []
  const profile = options.profile ?? 'prod-ready'

  const toCamel = (value: string) =>
    value
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, (m) => m.toLowerCase())

  const toPascal = (value: string) => {
    const camel = toCamel(value)
    return camel.charAt(0).toUpperCase() + camel.slice(1)
  }

  const stType = (column: any) => {
    const typeName = String(column?.type?.typeName || '').toLowerCase()
    const base = typeName.includes('bool')
      ? 't.bool()'
      : typeName.includes('int') || typeName.includes('number')
        ? 't.i64()'
        : typeName.includes('float') || typeName.includes('double') || typeName.includes('decimal')
          ? 't.f64()'
          : 't.string()'
    return column?.nullable ? `${base}.optional()` : base
  }

  const entityTableBlocks = entities.map((entity) => {
    const tableName = entity?.db?.table?.name || entity?.id || 'item'
    const tableVar = toPascal(entity?.id || tableName)
    const dbKey = toCamel(entity?.id || tableName)
    const columnsRaw = entity?.db?.columns
    const columns = columnsRaw instanceof Map ? Object.fromEntries(columnsRaw.entries()) : (columnsRaw || {})
    const pk = Array.isArray(entity?.db?.table?.primaryKey) && entity.db.table.primaryKey.length > 0
      ? entity.db.table.primaryKey[0]
      : 'id'

    const tableFields = Object.entries(columns).map(([name, col]) => `    ${name}: ${name === pk ? `${stType(col)}.primaryKey()` : stType(col)},`).join('\n')
    const reducerArgs = Object.entries(columns).map(([name, col]) => `  ${name}: ${stType(col)},`).join('\n')
    const updateArgs = Object.entries(columns)
      .filter(([name]) => name !== pk)
      .map(([name, col]) => `  ${name}: ${stType({ ...(col as any), nullable: true })},`)
      .join('\n')

    return {
      tableVar,
      dbKey,
      block: `const ${tableVar} = table(
  { name: '${tableName}', public: false },
  {
${tableFields || `    id: t.string().primaryKey(),`}
  }
)

spacetimedb.reducer('app_${dbKey}_create', {
${reducerArgs || `  id: t.string(),`}
}, (ctx, args) => {
  ctx.db.${dbKey}.insert(args as any)
})

spacetimedb.reducer('app_${dbKey}_update', {
  ${pk}: t.string(),
${updateArgs || '  // add update fields'}
}, (ctx, args) => {
  const { ${pk}, ...patch } = args as any
  const prev = ctx.db.${dbKey}.${pk}.find(${pk})
  if (!prev) return
  ctx.db.${dbKey}.${pk}.update({ ...prev, ...patch })
})

spacetimedb.reducer('app_${dbKey}_delete', {
  ${pk}: t.string(),
}, (ctx, args) => {
  const prev = ctx.db.${dbKey}.${pk}.find(args.${pk})
  if (!prev) return
  ctx.db.${dbKey}.${pk}.delete(args.${pk})
})`,
    }
  })

  const appCrudDoc = entities.length === 0
    ? `// No entities provided. Add entities in Gen config to generate app CRUD reducers.`
    : entityTableBlocks.map((x) => x.block).join('\n\n')

  return {
    'spacetimedb/src/index.ts': `import { schema, table, t, SenderError } from 'spacetimedb/server'

const AuthUser = table(
  { name: 'auth_user', public: false },
  {
    id: t.string().primaryKey(),
    email: t.string(),
    name: t.string().optional(),
    emailVerified: t.bool(),
    image: t.string().optional(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  }
)

const AuthSession = table(
  { name: 'auth_session', public: false },
  {
    id: t.string().primaryKey(),
    userId: t.string(),
    token: t.string(),
    expiresAt: t.timestamp(),
    ipAddress: t.string().optional(),
    userAgent: t.string().optional(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  }
)

const AuthAccount = table(
  { name: 'auth_account', public: false },
  {
    id: t.string().primaryKey(),
    userId: t.string(),
    providerId: t.string(),
    accountId: t.string(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  }
)

const AuthVerificationToken = table(
  { name: 'auth_verification_token', public: false },
  {
    id: t.string().primaryKey(),
    identifier: t.string(),
    value: t.string(),
    expiresAt: t.timestamp(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  }
)

${entityTableBlocks.map((x) => x.tableVar).join('\n') ? `${entityTableBlocks.map((x) => x.block.split('\n\n')[0]).join('\n\n')}` : ''}

export const spacetimedb = schema(AuthUser, AuthSession, AuthAccount, AuthVerificationToken${entityTableBlocks.length ? `, ${entityTableBlocks.map((x) => x.tableVar).join(', ')}` : ''})

spacetimedb.reducer('auth_create_user', {
  id: t.string(),
  email: t.string(),
  name: t.string().optional(),
  emailVerified: t.bool(),
  image: t.string().optional(),
}, (ctx, args) => {
  if (!args.id || !args.email) {
    throw new SenderError('id and email are required')
  }
  ctx.db.authUser.insert({
    ...args,
    createdAt: ctx.timestamp,
    updatedAt: ctx.timestamp,
  })
})

spacetimedb.reducer('auth_create_session', {
  id: t.string(),
  userId: t.string(),
  token: t.string(),
  expiresAt: t.timestamp(),
  ipAddress: t.string().optional(),
  userAgent: t.string().optional(),
}, (ctx, args) => {
  ctx.db.authSession.insert({
    ...args,
    createdAt: ctx.timestamp,
    updatedAt: ctx.timestamp,
  })
})

spacetimedb.view({ name: 'auth_user_by_email', public: false }, t.option(AuthUser.row()), (_ctx) => {
  // Replace with a filtered lookup API once your adapter passes params.
  return null
})

// <gen:begin spacetime-auth-crud>
${appCrudDoc}
// <gen:end spacetime-auth-crud>
`,

    'src/lib/spacetime-auth-adapter.ts': `/**
 * Better Auth adapter backed by SpacetimeDB reducers/procedures.
 *
 * NOTE: This file is intentionally a scaffold. Implement each method
 * using your generated Spacetime bindings and reducer/procedure names.
 */

export interface SpacetimeAuthAdapterOptions {
  moduleName: string
  host: string
}

export function createSpacetimeAuthAdapter(_options: SpacetimeAuthAdapterOptions) {
  return {
    async createUser(user: Record<string, unknown>) {
      return user
    },
    async getUser(id: string) {
      return { id }
    },
    async getUserByEmail(email: string) {
      return { email }
    },
    async updateUser(user: Record<string, unknown>) {
      return user
    },
    async createSession(session: Record<string, unknown>) {
      return session
    },
    async getSessionAndUser(_sessionToken: string) {
      return null
    },
    async deleteSession(_sessionToken: string) {
      return
    },
  }
}
`,

    'src/lib/auth.ts': `import { betterAuth } from 'better-auth'
import { createSpacetimeAuthAdapter } from '~/lib/spacetime-auth-adapter'

const siteUrl = process.env.SITE_URL || '${siteUrl}'

export const auth = betterAuth({
  baseURL: siteUrl,
  database: createSpacetimeAuthAdapter({
    moduleName: process.env.SPACETIME_MODULE_NAME || '${spacetimeModuleName}',
    host: process.env.SPACETIME_HOST || '${spacetimeHost}',
  }) as any,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
})
`,

    'src/lib/auth-client.ts': `import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()
`,

    'src/routes/api/auth/$.ts': `import { createFileRoute } from '@tanstack/react-router'
import { auth } from '~/lib/auth'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: async ({ request }) => auth.handler(request),
      POST: async ({ request }) => auth.handler(request),
    },
  },
})
`,

    'src/routes/__root.tsx': `/// <reference types='vite/client' />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import * as React from 'react'

import appCss from '~/styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
`,

    'src/routes/router.tsx': `import * as React from 'react'
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultErrorComponent: (err) => <p>{err.error.message}</p>,
    defaultNotFoundComponent: () => <p>not found</p>,
  })

  return router
}
`,

    'spacetime.config.example.json': `{
  "moduleName": "${spacetimeModuleName}",
  "host": "${spacetimeHost}",
  "projectPath": "spacetimedb"
}
`,

    '.env.spacetime.example': `SITE_URL=${siteUrl}
SPACETIME_HOST=${spacetimeHost}
SPACETIME_MODULE_NAME=${spacetimeModuleName}
BETTER_AUTH_SECRET=replace-with-a-random-secret
`,

    'docs/spacetime-better-auth-tanstack.md': `# SpacetimeDB + Better Auth + TanStack Start

Generated integration scaffold.

## Install

\`npm install better-auth spacetimedb\`
\`npm install -D @types/node\`

## SpacetimeDB setup

1. Install Spacetime CLI.
2. Run \`spacetime start\`.
3. Publish your module:
   \`spacetime publish --server local --project-path spacetimedb ${spacetimeModuleName}\`
4. Generate client bindings if needed for your frontend/server utility usage.

## Environment

Copy \`.env.spacetime.example\` into your local env file and set values.

## Notes

- The generated adapter is a scaffold. Wire its methods to your generated Spacetime reducers/procedures.
- Use reducer calls for write operations to preserve transaction guarantees.
- Keep auth tables private and expose only specific views when needed.
- In existing apps, merge patch files instead of replacing root/router directly.
- Profile: \`${profile}\`.
`,

    'test/spacetime-auth-adapter.test.ts': `import { describe, it, expect } from 'vitest'
import { createSpacetimeAuthAdapter } from '../src/lib/spacetime-auth-adapter'

describe('Spacetime Auth Adapter scaffold', () => {
  it('creates adapter with expected methods', () => {
    const adapter = createSpacetimeAuthAdapter({
      moduleName: process.env.SPACETIME_MODULE_NAME || '${spacetimeModuleName}',
      host: process.env.SPACETIME_HOST || '${spacetimeHost}',
    })

    expect(typeof adapter.createUser).toBe('function')
    expect(typeof adapter.getUser).toBe('function')
    expect(typeof adapter.getUserByEmail).toBe('function')
    expect(typeof adapter.updateUser).toBe('function')
    expect(typeof adapter.createSession).toBe('function')
    expect(typeof adapter.getSessionAndUser).toBe('function')
    expect(typeof adapter.deleteSession).toBe('function')
  })
})
`,
  }
}
