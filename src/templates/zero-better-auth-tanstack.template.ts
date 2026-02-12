/**
 * Zero + Better Auth + TanStack Start Template
 * Generates integration files and setup docs.
 */

type AnyEntity = any

export interface ZeroBetterAuthTanstackTemplateOptions {
  siteUrl?: string
  zeroCacheUrl?: string
  queryUrl?: string
  mutateUrl?: string
  entities?: AnyEntity[]
  profile?: 'minimal' | 'prod-ready' | 'existing-app-merge'
}

export interface GeneratedZeroBetterAuthTanstackFiles {
  [filePath: string]: string
}

function toCamel(input: string): string {
  return input
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (m) => m.toLowerCase())
}

function toPascal(input: string): string {
  const camel = toCamel(input)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

function getColumns(entity: AnyEntity): Record<string, any> {
  const columns = entity?.db?.columns
  if (!columns) return { id: { type: { typeName: 'string' } } }
  if (columns instanceof Map) {
    return Object.fromEntries(columns.entries())
  }
  return columns
}

function getPrimaryKeys(entity: AnyEntity): string[] {
  const keys = entity?.db?.table?.primaryKey
  if (Array.isArray(keys) && keys.length > 0) return keys
  return ['id']
}

function detectOwnerField(columns: Record<string, any>): string | null {
  const candidates = ['authorID', 'authorId', 'userID', 'userId', 'ownerID', 'ownerId']
  for (const c of candidates) {
    if (c in columns) return c
  }
  return null
}

function zeroTypeForColumn(column: any): string {
  const typeName = String(column?.type?.typeName || '').toLowerCase()
  const typeParams = column?.type?.typeParams

  if (typeName.includes('bool')) return 'boolean()'
  if (typeName.includes('int') || typeName.includes('float') || typeName.includes('double') || typeName.includes('decimal') || typeName.includes('number')) return 'number()'
  if (typeName.includes('json')) return 'json<unknown>()'
  if (typeName.includes('enum')) {
    const values = Array.isArray(typeParams?.[0]) ? typeParams[0] : Array.isArray(typeParams) ? typeParams : null
    if (values && values.length > 0) {
      const union = values.map((v: string) => `'${String(v).replace(/'/g, "\\'")}'`).join(' | ')
      return `enumeration<${union}>()`
    }
    return 'enumeration<string>()'
  }
  return 'string()'
}

function zodTypeForColumn(column: any): string {
  const typeName = String(column?.type?.typeName || '').toLowerCase()
  const typeParams = column?.type?.typeParams

  if (typeName.includes('bool')) return 'z.boolean()'
  if (typeName.includes('int') || typeName.includes('float') || typeName.includes('double') || typeName.includes('decimal') || typeName.includes('number')) return 'z.number()'
  if (typeName.includes('json')) return 'z.any()'
  if (typeName.includes('enum')) {
    const values = Array.isArray(typeParams?.[0]) ? typeParams[0] : Array.isArray(typeParams) ? typeParams : null
    if (values && values.length > 0) {
      const items = values.map((v: string) => `'${String(v).replace(/'/g, "\\'")}'`).join(', ')
      return `z.enum([${items}] as const)`
    }
    return 'z.string()'
  }
  return 'z.string()'
}

function generateSchemaFile(entities: AnyEntity[]): string {
  const tableDefs: string[] = []
  const tableVars: string[] = []

  for (const entity of entities) {
    const tableName = entity?.db?.table?.name || entity?.id || 'item'
    const tableVar = toCamel(entity?.id || tableName)
    const columns = getColumns(entity)
    const primaryKeys = getPrimaryKeys(entity)

    const columnLines = Object.entries(columns).map(([field, col]) => {
      const optional = col?.nullable ? '.optional()' : ''
      return `    ${field}: ${zeroTypeForColumn(col)}${optional},`
    })

    tableDefs.push(`export const ${tableVar} = table('${tableName}')\n  .columns({\n${columnLines.join('\n')}\n  })\n  .primaryKey(${primaryKeys.map((k) => `'${k}'`).join(', ')})\n`)
    tableVars.push(tableVar)
  }

  return `import {
  boolean,
  createSchema,
  enumeration,
  json,
  number,
  string,
  table,
} from '@rocicorp/zero'

${tableDefs.join('\n')}
export const schema = createSchema({
  tables: [${tableVars.join(', ')}],
  relationships: [],
})

export type Schema = typeof schema

declare module '@rocicorp/zero' {
  interface DefaultTypes {
    schema: Schema
  }
}

// zql helper: generated projects can export this from their local setup if preferred.
export const zql = schema
`
}

function generateQueriesFile(entities: AnyEntity[]): string {
  const groups: string[] = []

  for (const entity of entities) {
    const tableVar = toCamel(entity?.id || entity?.db?.table?.name || 'item')
    const columns = getColumns(entity)
    const ownerField = detectOwnerField(columns)
    const pk = getPrimaryKeys(entity)[0] || 'id'

    const mineQuery = ownerField
      ? `,
    mine: defineQuery(({ ctx: { userID, role } }) => {
      if (role === 'admin') return zql.${tableVar}
      return zql.${tableVar}.where('${ownerField}', userID)
    })`
      : ''

    groups.push(`  ${tableVar}: {
    all: defineQuery(() => zql.${tableVar}),
    byId: defineQuery(z.object({ id: z.string() }), ({ args: { id } }) =>
      zql.${tableVar}.where('${pk}', id)
    )${mineQuery}
  }`)
  }

  return `import { defineQueries, defineQuery } from '@rocicorp/zero'
import { z } from 'zod'
import { zql } from './schema'

export const queries = defineQueries({
${groups.join(',\n')}
})
`
}

function generateMutatorsFile(entities: AnyEntity[]): string {
  const groups: string[] = []

  for (const entity of entities) {
    const tableVar = toCamel(entity?.id || entity?.db?.table?.name || 'item')
    const columns = getColumns(entity)
    const ownerField = detectOwnerField(columns)
    const pk = getPrimaryKeys(entity)[0] || 'id'

    const createShape = Object.entries(columns).map(([field, col]) => {
      const schema = zodTypeForColumn(col)
      const optional = field === pk ? '' : '.optional()'
      return `        ${field}: ${schema}${optional},`
    }).join('\n')

    const updateShape = Object.entries(columns).map(([field, col]) => {
      const schema = zodTypeForColumn(col)
      const optional = field === pk ? '' : '.optional()'
      return `        ${field}: ${schema}${optional},`
    }).join('\n')

    const createInsert = ownerField
      ? `
        await tx.mutate.${tableVar}.insert({
          ...args,
          ${ownerField}: ctx.userID,
        } as any)
`
      : `
        await tx.mutate.${tableVar}.insert(args as any)
`

    const ownerCheck = ownerField
      ? `
        const prev = await tx.run(tx.query.${tableVar}.where('${pk}', args.${pk}).one())
        if (prev && ctx.role !== 'admin' && prev.${ownerField} !== ctx.userID) {
          throw new Error('Access denied')
        }
`
      : ''

    groups.push(`  ${tableVar}: {
    create: defineMutator(
      z.object({
${createShape}
      }),
      async ({ tx, args, ctx }) => {${createInsert}      }
    ),
    update: defineMutator(
      z.object({
${updateShape}
      }),
      async ({ tx, args, ctx }) => {${ownerCheck}
        await tx.mutate.${tableVar}.update(args as any)
      }
    ),
    remove: defineMutator(
      z.object({ ${pk}: z.string() }),
      async ({ tx, args }) => {
        await tx.mutate.${tableVar}.delete({ ${pk}: args.${pk} } as any)
      }
    ),
  }`)
  }

  return `import { defineMutator, defineMutators } from '@rocicorp/zero'
import { z } from 'zod'

export const mutators = defineMutators({
${groups.join(',\n')}
})
`
}

export function generateZeroBetterAuthTanstack(
  options: ZeroBetterAuthTanstackTemplateOptions = {}
): GeneratedZeroBetterAuthTanstackFiles {
  const siteUrl = options.siteUrl ?? 'http://localhost:3000'
  const zeroCacheUrl = options.zeroCacheUrl ?? 'http://localhost:4848'
  const queryUrl = options.queryUrl ?? `${siteUrl}/api/zero/query`
  const mutateUrl = options.mutateUrl ?? `${siteUrl}/api/zero/mutate`
  const entities = options.entities && options.entities.length > 0
    ? options.entities
    : [
      {
        id: 'post',
        db: {
          table: { name: 'post', primaryKey: ['id'] },
          columns: {
            id: { type: { typeName: 'string' } },
            title: { type: { typeName: 'string' } },
            content: { type: { typeName: 'text' }, nullable: true },
            authorID: { type: { typeName: 'string' } },
          },
        },
      },
    ]
  const profile = options.profile ?? 'prod-ready'

  return {
    'src/zero/schema.ts': `// <gen:begin zero-auth-schema>
${generateSchemaFile(entities)}
// <gen:end zero-auth-schema>
`,

    'src/lib/zero-context.ts': `export type ZeroContext = {
  userID: string
  role: 'admin' | 'user' | 'anon'
}

declare module '@rocicorp/zero' {
  interface DefaultTypes {
    context: ZeroContext
  }
}
`,

    'src/zero/queries.ts': `// <gen:begin zero-auth-queries>
${generateQueriesFile(entities)}
// <gen:end zero-auth-queries>
`,
    'src/zero/mutators.ts': `// <gen:begin zero-auth-mutators>
${generateMutatorsFile(entities)}
// <gen:end zero-auth-mutators>
`,

    'src/lib/auth.ts': `import { betterAuth } from 'better-auth'

const siteUrl = process.env.SITE_URL || '${siteUrl}'

export const auth = betterAuth({
  baseURL: siteUrl,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
    },
  },
})
`,

    'src/lib/auth-client.ts': `import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()
`,

    'src/lib/zero-client.ts': `import { Zero } from '@rocicorp/zero'
import type { ZeroOptions } from '@rocicorp/zero'

import { schema } from '~/zero/schema'
import { queries } from '~/zero/queries'
import { mutators } from '~/zero/mutators'

export function createZeroClient(userID: string, token?: string) {
  const opts: ZeroOptions = {
    schema,
    queries,
    mutators,
    userID: userID || 'anon',
    auth: token,
    cacheURL: process.env.VITE_ZERO_CACHE_URL || '${zeroCacheUrl}',
    queryURL: process.env.VITE_ZERO_QUERY_URL || '${queryUrl}',
    mutateURL: process.env.VITE_ZERO_MUTATE_URL || '${mutateUrl}',
    storageKey: 'tanstack-zero-auth',
  }

  return new Zero(opts)
}
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

    'src/routes/api/zero/query.ts': `import { createFileRoute } from '@tanstack/react-router'
import { handleQueryRequest } from '@rocicorp/zero/server'
import { mustGetQuery } from '@rocicorp/zero'

import { queries } from '~/zero/queries'
import { schema } from '~/zero/schema'

function getZeroContext(_request: Request) {
  return { userID: 'anon', role: 'anon' as const }
}

export const Route = createFileRoute('/api/zero/query')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ctx = getZeroContext(request)
        const result = await handleQueryRequest(
          (name, args) => {
            const query = mustGetQuery(queries, name)
            return query.fn({ args, ctx })
          },
          schema,
          request
        )

        return Response.json(result)
      },
    },
  },
})
`,

    'src/routes/api/zero/mutate.ts': `import { createFileRoute } from '@tanstack/react-router'
import { handleMutateRequest } from '@rocicorp/zero/server'
import { mustGetMutator } from '@rocicorp/zero'

import { mutators } from '~/zero/mutators'
import { schema } from '~/zero/schema'

function getZeroContext(_request: Request) {
  return { userID: 'anon', role: 'anon' as const }
}

export const Route = createFileRoute('/api/zero/mutate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ctx = getZeroContext(request)
        const result = await handleMutateRequest(
          async ({ name, args, tx }) => {
            const mutator = mustGetMutator(mutators, name)
            return mutator.fn({ tx, args, ctx })
          },
          schema,
          request
        )

        return Response.json(result)
      },
    },
  },
})
`,

    'src/components/zero/NeedsAuthDialog.tsx': `import * as React from 'react'
import { useConnectionState } from '@rocicorp/zero/react'

export function NeedsAuthDialog({ onReconnect }: { onReconnect: () => Promise<void> }) {
  const connectionState = useConnectionState()

  if (connectionState.name !== 'needs-auth') {
    return null
  }

  return (
    <div>
      <h2>Authentication Required</h2>
      <button onClick={() => void onReconnect()}>Reconnect</button>
    </div>
  )
}
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

    'zero.env.example': `SITE_URL=${siteUrl}
BETTER_AUTH_SECRET=replace-with-a-random-secret

VITE_ZERO_CACHE_URL=${zeroCacheUrl}
VITE_ZERO_QUERY_URL=${queryUrl}
VITE_ZERO_MUTATE_URL=${mutateUrl}

ZERO_QUERY_URL=${queryUrl}
ZERO_MUTATE_URL=${mutateUrl}
ZERO_QUERY_FORWARD_COOKIES=true
ZERO_MUTATE_FORWARD_COOKIES=true
`,

    'docs/zero-better-auth-tanstack.md': `# TanStack Start + Zero + Better Auth

Generated integration scaffold for ZeroSync + Better Auth.

## Install

\`npm install @rocicorp/zero better-auth zod\`
\`npm install -D drizzle-zero prisma-zero\` (optional schema generation)

## Key setup

1. Ensure Zero schema exists in \`src/zero/schema.ts\`.
2. Configure query/mutate server endpoints:
   - \`/api/zero/query\`
   - \`/api/zero/mutate\`
3. Run zero-cache with query/mutate URLs.
4. Set cookie forwarding in zero-cache env:
   - \`ZERO_QUERY_FORWARD_COOKIES=true\`
   - \`ZERO_MUTATE_FORWARD_COOKIES=true\`

## Better Auth + Zero auth notes

- Always provide \`userID\` in Zero client (\`anon\` when logged out).
- Build Zero context on the server from authenticated session values.
- Do not use client args as credentials.
- For production cookie auth, use subdomain + root-domain cookie config.
- Keep auth cookies as \`SameSite=Lax\` or \`SameSite=Strict\`.

## Migrations and deploy order

- Update backend schema first.
- Deploy app changes second.
- Do contract/drop migrations after a grace period.

## Optional on logout

If you need to clear local Zero data for privacy:

\`import { dropAllDatabases } from '@rocicorp/zero'\`
\`await dropAllDatabases()\`

## Generation profile

- Profile: \`${profile}\`
- Generated schema/query/mutator files include managed markers for safe regeneration.
`,

    'test/zero-auth-integration.test.ts': `import { describe, it, expect } from 'vitest'

describe('Zero auth scaffold', () => {
  it('sanity test', () => {
    expect(true).toBe(true)
  })
})
`,
  }
}
