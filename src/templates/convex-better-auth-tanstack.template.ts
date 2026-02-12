/**
 * Convex + Better Auth + TanStack Start Template
 * Generates integration files and setup docs.
 */

export interface ConvexBetterAuthTanstackTemplateOptions {
  siteUrl?: string
  convexUrlEnv?: string
  convexSiteUrlEnv?: string
  entities?: any[]
  profile?: 'minimal' | 'prod-ready' | 'existing-app-merge'
}

export interface GeneratedConvexBetterAuthTanstackFiles {
  [filePath: string]: string
}

export function generateConvexBetterAuthTanstack(
  options: ConvexBetterAuthTanstackTemplateOptions = {}
): GeneratedConvexBetterAuthTanstackFiles {
  const siteUrl = options.siteUrl ?? 'http://localhost:3000'
  const convexUrlEnv = options.convexUrlEnv ?? 'process.env.VITE_CONVEX_URL!'
  const convexSiteUrlEnv = options.convexSiteUrlEnv ?? 'process.env.VITE_CONVEX_SITE_URL!'
  const entities = options.entities ?? []
  const profile = options.profile ?? 'prod-ready'

  const toCamel = (value: string) =>
    value
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, (m) => m.toLowerCase())

  const validatorForColumn = (column: any) => {
    const typeName = String(column?.type?.typeName || '').toLowerCase()
    const base = typeName.includes('bool')
      ? 'v.boolean()'
      : typeName.includes('int') || typeName.includes('float') || typeName.includes('double') || typeName.includes('decimal') || typeName.includes('number')
        ? 'v.number()'
        : 'v.string()'
    return column?.nullable ? `v.optional(${base})` : base
  }

  const generatedCrud = entities.length === 0
    ? `import { mutation, query } from './_generated/server'

// No entities were provided to the convex-auth generator.
// Add entities to your Gen config to generate CRUD functions here.
export const healthcheck = query({
  args: {},
  handler: async () => ({ ok: true }),
})
`
    : `import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// <gen:begin convex-auth-crud>
${entities.map((entity) => {
  const tableName = entity?.db?.table?.name || entity?.id || 'item'
  const fnBase = toCamel(entity?.id || tableName)
  const columnsRaw = entity?.db?.columns
  const columns = columnsRaw instanceof Map ? Object.fromEntries(columnsRaw.entries()) : (columnsRaw || {})
  const pk = Array.isArray(entity?.db?.table?.primaryKey) && entity.db.table.primaryKey.length > 0
    ? entity.db.table.primaryKey[0]
    : 'id'

  const createArgs = Object.entries(columns).map(([name, col]) => `    ${name}: ${validatorForColumn(col)},`).join('\n') || `    id: v.string(),`
  const updateArgs = Object.entries(columns)
    .filter(([name]) => name !== pk)
    .map(([name, col]) => `    ${name}: v.optional(${validatorForColumn({ ...(col as any), nullable: false }).replace(/^v\.optional\((.*)\)$/, '$1')}),`)
    .join('\n')

  return `export const list${fnBase.charAt(0).toUpperCase() + fnBase.slice(1)} = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('${tableName}').collect()
  },
})

export const get${fnBase.charAt(0).toUpperCase() + fnBase.slice(1)} = query({
  args: { ${pk}: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.${pk} as any)
  },
})

export const create${fnBase.charAt(0).toUpperCase() + fnBase.slice(1)} = mutation({
  args: {
${createArgs}
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('${tableName}', args as any)
  },
})

export const update${fnBase.charAt(0).toUpperCase() + fnBase.slice(1)} = mutation({
  args: {
    ${pk}: v.string(),
${updateArgs || '    // add fields to update'}
  },
  handler: async (ctx, args) => {
    const { ${pk}, ...patch } = args as any
    await ctx.db.patch(${pk}, patch)
    return ${pk}
  },
})

export const remove${fnBase.charAt(0).toUpperCase() + fnBase.slice(1)} = mutation({
  args: { ${pk}: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.${pk} as any)
    return { success: true }
  },
})`
}).join('\n\n')}
// <gen:end convex-auth-crud>
`

  return {
    'convex/convex.config.ts': `import { defineApp } from 'convex/server'
import betterAuth from '@convex-dev/better-auth/convex.config'

const app = defineApp()
app.use(betterAuth)

export default app
`,

    'convex/auth.config.ts': `import { getAuthConfigProvider } from '@convex-dev/better-auth/auth-config'
import type { AuthConfig } from 'convex/server'

export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig
`,

    'convex/auth.ts': `import { betterAuth } from 'better-auth/minimal'
import { createClient } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import type { GenericCtx } from '@convex-dev/better-auth'

import authConfig from './auth.config'
import { components } from './_generated/api'
import { query } from './_generated/server'
import type { DataModel } from './_generated/dataModel'

const siteUrl = process.env.SITE_URL || '${siteUrl}'

export const authComponent = createClient<DataModel>(components.betterAuth)

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [convex({ authConfig })],
  })
}

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.getAuthUser(ctx)
  },
})
`,

    'convex/http.ts': `import { httpRouter } from 'convex/server'
import { authComponent, createAuth } from './auth'

const http = httpRouter()

authComponent.registerRoutes(http, createAuth)

export default http
`,

    'convex/generated-crud.ts': generatedCrud,

    'src/lib/auth-client.ts': `import { createAuthClient } from 'better-auth/react'
import { convexClient } from '@convex-dev/better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [convexClient()],
})
`,

    'src/lib/auth-server.ts': `import { convexBetterAuthReactStart } from '@convex-dev/better-auth/react-start'

export const {
  handler,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthReactStart({
  convexUrl: ${convexUrlEnv},
  convexSiteUrl: ${convexSiteUrlEnv},
})
`,

    'src/routes/api/auth/$.ts': `import { createFileRoute } from '@tanstack/react-router'
import { handler } from '~/lib/auth-server'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => handler(request),
      POST: ({ request }) => handler(request),
    },
  },
})
`,

    'src/routes/__root.tsx': `/// <reference types='vite/client' />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from '@tanstack/react-router'
import * as React from 'react'
import { createServerFn } from '@tanstack/react-start'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import type { ConvexQueryClient } from '@convex-dev/react-query'
import type { QueryClient } from '@tanstack/react-query'

import appCss from '~/styles/app.css?url'
import { authClient } from '~/lib/auth-client'
import { getToken } from '~/lib/auth-server'

const getAuth = createServerFn({ method: 'GET' }).handler(async () => {
  return await getToken()
})

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  convexQueryClient: ConvexQueryClient
}>()({
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
  beforeLoad: async (ctx) => {
    const token = await getAuth()
    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token)
    }
    return {
      isAuthenticated: Boolean(token),
      token,
    }
  },
  component: RootComponent,
})

function RootComponent() {
  const context = useRouteContext({ from: Route.id })
  return (
    <ConvexBetterAuthProvider
      client={context.convexQueryClient.convexClient}
      authClient={authClient}
      initialToken={context.token}
    >
      <RootDocument>
        <Outlet />
      </RootDocument>
    </ConvexBetterAuthProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' className='dark'>
      <head>
        <HeadContent />
      </head>
      <body className='bg-neutral-950 text-neutral-50'>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
`,

    'src/routes/router.tsx': `import * as React from 'react'
import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import { QueryClient, notifyManager } from '@tanstack/react-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexProvider } from 'convex/react'

import { routeTree } from './routeTree.gen'

export function getRouter() {
  if (typeof document !== 'undefined') {
    notifyManager.setScheduler(window.requestAnimationFrame)
  }

  const convexUrl = (import.meta as { env: Record<string, string> }).env.VITE_CONVEX_URL
  if (!convexUrl) {
    throw new Error('VITE_CONVEX_URL is not set')
  }

  const convexQueryClient = new ConvexQueryClient(convexUrl, {
    expectAuth: true,
  })

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  })

  convexQueryClient.connect(queryClient)

  const router = routerWithQueryClient(
    createRouter({
      routeTree,
      defaultPreload: 'intent',
      context: { queryClient, convexQueryClient },
      scrollRestoration: true,
      defaultErrorComponent: (err) => <p>{err.error.stack}</p>,
      defaultNotFoundComponent: () => <p>not found</p>,
      Wrap: ({ children }) => (
        <ConvexProvider client={convexQueryClient.convexClient}>{children}</ConvexProvider>
      ),
    }),
    queryClient
  )

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  })

  return router
}
`,

    'vite.better-auth.snippet.ts': `// Merge this into your existing vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  ssr: {
    noExternal: ['@convex-dev/better-auth'],
  },
})
`,

    '.env.local.example': `# Convex local development deployment
CONVEX_DEPLOYMENT=dev:adjective-animal-123
VITE_CONVEX_URL=https://adjective-animal-123.convex.cloud
VITE_CONVEX_SITE_URL=https://adjective-animal-123.convex.site
VITE_SITE_URL=${siteUrl}
`,

    'docs/convex-better-auth-tanstack.md': `# Convex + Better Auth + TanStack Start

Generated integration scaffold.

## Install

\`npm install convex@latest @convex-dev/better-auth\`
\`npm install better-auth@1.4.9 --save-exact\`
\`npm install -D @types/node\`

## Convex env vars

\`npx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)\`
\`npx convex env set SITE_URL ${siteUrl}\`

## Notes

- Merge \`vite.better-auth.snippet.ts\` into your real \`vite.config.ts\`.
- If your app already has router/root setup, manually merge generated route/provider files.
- For SSR with authenticated queries, keep \`expectAuth: true\` in \`ConvexQueryClient\`.
- On sign-out, reload the page after success to avoid pre-auth query timing issues.
- Profile: \`${profile}\`.
- Generated CRUD lives in \`convex/generated-crud.ts\` inside managed markers.
`,
  }
}
