/**
 * Backend adapters for database-agnostic code generation
 */

export {
  type BackendAdapter,
  type QueryHookOptions,
  type MutationHookOptions,
  AdapterRegistry,
} from './backend-adapter'

export { RESTAdapter, type RESTAdapterConfig } from './rest-adapter'
export { ConvexAdapter, type ConvexAdapterConfig } from './convex-adapter'

// Auto-register built-in adapters
import { RESTAdapter } from './rest-adapter'
import { ConvexAdapter } from './convex-adapter'
import { AdapterRegistry } from './backend-adapter'

AdapterRegistry.register(new RESTAdapter())
AdapterRegistry.register(new ConvexAdapter())
