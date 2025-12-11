/**
 * Code Generation Templates
 * Export all templates for easy access
 */

export {
  html,
  css,
  ts,
  sql,
  gql,
  json,
  yaml,
  md,
  templates,
  conditional,
  map,
  type TemplateLanguage,
  getTemplate,
} from '../tags'

export {
  generateReactListComponent,
  type ReactListTemplateOptions,
} from './react-list.template'

export {
  generateReactFormComponent,
  type ReactFormTemplateOptions,
} from './react-form.template'

export {
  generateReactAdvancedFormComponent,
  type ReactAdvancedFormTemplateOptions,
} from './react-advanced-form.template'

export {
  generateReactAdvancedTableComponent,
  type ReactAdvancedTableTemplateOptions,
} from './react-advanced-table.template'

export {
  generateCrudRoutes,
  type CrudRoutesTemplateOptions,
} from './crud-routes.template'

export {
  generateConvexFunctions,
  type ConvexFunctionsTemplateOptions,
} from './convex-functions.template'

export {
  generateEnhancedConvexFunctions,
  type EnhancedConvexFunctionsTemplateOptions,
} from './convex-functions-enhanced.template'

export {
  generateTanStackForm,
  type TanStackFormTemplateOptions,
} from './tanstack-form.template'

export {
  generateTanStackFormFactory,
} from './tanstack-form-factory.template'

export {
  generateTanStackFormComponents,
} from './tanstack-form-components.template'

export {
  generateTanStackTable,
  type TanStackTableTemplateOptions,
} from './tanstack-table.template'

export {
  generateTanStackTableFactory,
} from './tanstack-table-factory.template'

export {
  generateTanStackTableComponents,
} from './tanstack-table-components.template'

export {
  tablePresets,
  type TablePresetName,
} from './tanstack-table-presets'

export {
  generateRailsRoutes,
  type RailsRoutesTemplateOptions,
} from './rails-routes.template'

export {
  generateNextJsAPI,
  type NextJsAPITemplateOptions,
} from './nextjs-api.template'

export {
  generateOpenAPI,
  type OpenAPITemplateOptions,
} from './openapi.template'

export {
  generateUnitTests,
  generateIntegrationTests,
  generateE2ETests,
  generateTestDataFactory,
  type TestingTemplateOptions,
} from './testing.template'

export {
  generateDockerCompose,
  generateDockerfile,
  generateGitHubActions,
  generateEnvironmentConfig,
  generateNginxConfig,
  generateKubernetesManifests,
  type DeploymentTemplateOptions,
} from './deployment.template'

export {
  generateAPIRoutes,
  generateExpressRoutes,
  generateFastifyRoutes,
  generateHonoRoutes,
  type APIRoutesTemplateOptions,
} from './api-routes.template'
