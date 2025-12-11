import { ts } from '../tags'

/**
 * Options for generating QueryClient provider
 */
export interface TanStackQueryProviderOptions {
  /** Default stale time in milliseconds (default: 0) */
  defaultStaleTime?: number
  /** Default cache time in milliseconds (default: 5 minutes) */
  defaultCacheTime?: number
  /** Default refetch on window focus (default: true) */
  refetchOnWindowFocus?: boolean
  /** Default refetch on reconnect (default: true) */
  refetchOnReconnect?: boolean
  /** Default retry count (default: 3) */
  retry?: number
  /** Include error logging (default: true) */
  includeErrorLogging?: boolean
  /** Include devtools (default: true in dev mode) */
  includeDevtools?: boolean
  /** Enable persistence to localStorage (default: false) */
  enablePersistence?: boolean
}

/**
 * Generate QueryClient provider setup
 */
export function generateQueryProvider(
  options: TanStackQueryProviderOptions = {}
): string {
  const {
    defaultStaleTime = 0,
    defaultCacheTime = 300000, // 5 minutes
    refetchOnWindowFocus = true,
    refetchOnReconnect = true,
    retry = 3,
    includeErrorLogging = true,
    includeDevtools = true,
    enablePersistence = false,
  } = options

  return ts`
/**
 * TanStack Query Provider Setup
 * Auto-generated QueryClient configuration
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
${includeDevtools ? "import { ReactQueryDevtools } from '@tanstack/react-query-devtools'" : ''}
${enablePersistence ? "import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'\nimport { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'" : ''}
import { ReactNode, useState } from 'react'

/**
 * Default query client configuration
 */
const defaultOptions = {
  queries: {
    staleTime: ${defaultStaleTime},
    gcTime: ${defaultCacheTime},
    refetchOnWindowFocus: ${refetchOnWindowFocus},
    refetchOnReconnect: ${refetchOnReconnect},
    retry: ${retry},
    ${includeErrorLogging ? `onError: (error: Error) => {
      console.error('Query error:', error.message)
    },` : ''}
  },
  mutations: {
    retry: ${Math.floor(retry / 2)},
    ${includeErrorLogging ? `onError: (error: Error) => {
      console.error('Mutation error:', error.message)
    },` : ''}
  },
}

${enablePersistence ? `
/**
 * Create persister for localStorage
 */
const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
})
` : ''}

/**
 * Query Provider Component
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions,
      })
  )

  ${enablePersistence ? `
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      {children}
      ${includeDevtools ? '<ReactQueryDevtools initialIsOpen={false} />' : ''}
    </PersistQueryClientProvider>
  )
  ` : `
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      ${includeDevtools ? '<ReactQueryDevtools initialIsOpen={false} />' : ''}
    </QueryClientProvider>
  )
  `}
}

/**
 * Create a standalone query client instance
 * Useful for server-side rendering or testing
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions,
  })
}

/**
 * Query client configuration export
 */
export { defaultOptions as queryClientConfig }
`
}

/**
 * Generate query error boundary component
 */
export function generateQueryErrorBoundary(): string {
  return ts`
/**
 * Query Error Boundary
 * Catches and displays errors from TanStack Query
 */

import { Component, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class QueryErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Query error boundary caught error:', error, errorInfo)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset)
      }

      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h2>Something went wrong</h2>
          <p>{this.state.error.message}</p>
          <button onClick={this.reset}>Try again</button>
        </div>
      )
    }

    return this.props.children
  }
}
`
}

/**
 * Generate suspense wrapper for queries
 */
export function generateQuerySuspense(): string {
  return ts`
/**
 * Query Suspense Wrapper
 * Enables React Suspense for queries
 */

import { Suspense, ReactNode } from 'react'

interface QuerySuspenseProps {
  children: ReactNode
  fallback?: ReactNode
}

export function QuerySuspense({ children, fallback }: QuerySuspenseProps) {
  return (
    <Suspense fallback={fallback || <div>Loading...</div>}>
      {children}
    </Suspense>
  )
}
`
}

/**
 * Generate complete provider package
 */
export function generateCompleteProvider(
  options: TanStackQueryProviderOptions = {}
): string {
  return ts`
${generateQueryProvider(options)}

${generateQueryErrorBoundary()}

${generateQuerySuspense()}
`
}
