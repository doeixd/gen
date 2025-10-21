# Custom Generators and Configuration Examples

This directory contains examples of how to extend the code generator with custom generators and configuration files.

## Quick Start

### Using Custom Generators

```bash
# Generate code with custom generators
npx gen --generatorScript=./examples/custom-generators.js --config=./examples/custom-config.js

# Or with specific targets
npx gen --generatorScript=./examples/custom-generators.js --targets=database,frontend --dry-run
```

### Using Custom Configuration Only

```bash
# Use custom config with built-in generators
npx gen --config=./examples/custom-config.js --targets=database,api
```

## Custom Generator Script

The `custom-generators.js` file shows how to create custom generator functions that replace or extend the built-in generators. Each generator function receives:

- `entities`: Array of entity definitions
- `config`: Merged configuration object

Generator functions should return a Result object:
- `ok(undefined)` for success
- `err(error)` for failure

### Required Functions

Your custom generator script should export these functions:

```javascript
export async function generateDatabase(entities, config)
export async function generateAPI(entities, config)
export async function generateFrontend(entities, config)
export async function generateTests(entities, config)
export async function generateDocumentation(entities, config)
```

### Example Structure

```javascript
export async function generateDatabase(entities, config) {
  try {
    logger.section('🗄️  My Custom Database Generation')

    for (const entity of entities) {
      // Your custom logic here
      const customSQL = `CREATE TABLE custom_${entity.db.table.name} (...);`

      await writeFile(`./output/${entity.name}.sql`, customSQL, {
        overwrite: config.overwrite,
        dryRun: config.dryRun
      })

      logger.success(`Generated custom table: ${entity.name}`)
    }

    return ok(undefined)
  } catch (error) {
    return err({ message: error.message })
  }
}
```

## Custom Configuration

The `custom-config.js` file shows how to override default settings. Any property from the default config can be overridden.

### Common Customizations

```javascript
module.exports = {
  // Override output paths
  paths: {
    database: './my-database',
    api: './my-api',
    frontend: './my-components'
  },

  // Change API framework
  api: {
    framework: 'fastify', // or 'hono', 'koa'
    basePath: '/api/v2'
  },

  // Customize test settings
  tests: {
    framework: 'jest', // or 'vitest'
    includeE2ETests: false
  },

  // Only generate for specific tables
  tables: ['users', 'posts'],

  // Add custom options for your generators
  customOptions: {
    theme: 'dark',
    branding: 'MyCompany'
  }
}
```

## Advanced Usage

### Conditional Generation

```javascript
export async function generateFrontend(entities, config) {
  // Only generate for entities with a specific tag
  const filteredEntities = entities.filter(entity =>
    entity.tags?.includes('frontend')
  )

  // Custom logic here...
}
```

### Integration with External Tools

```javascript
export async function generateDocumentation(entities, config) {
  // Generate docs
  // ...

  // Run external tool
  const { exec } = await import('child_process')
  exec('npm run build-docs', (error) => {
    if (error) logger.error('Failed to build docs')
    else logger.success('Docs built successfully')
  })
}
```

### Custom File Templates

```javascript
export async function generateAPI(entities, config) {
  for (const entity of entities) {
    const template = `
import express from 'express'

// Custom API template for ${entity.name}
export const ${entity.name}Router = express.Router()

// Your custom routes here...
`

    await writeFile(`./api/${entity.name}.routes.ts`, template, config)
  }
}
```

## Best Practices

1. **Error Handling**: Always wrap operations in try-catch and return appropriate Result objects
2. **Logging**: Use the logger for consistent output
3. **Dry Run Support**: Check `config.dryRun` and respect the `--dry-run` flag
4. **File Options**: Pass file options (overwrite, backup, dryRun) to writeFile calls
5. **Configuration**: Access custom config via `config.customOptions`
6. **Modular**: Keep generator functions focused on specific concerns

## Real-World Examples

- **Custom Styling**: Generate components with your design system
- **Framework Integration**: Generate code for specific frameworks (Next.js, Nuxt, SvelteKit)
- **Database Migrations**: Generate migration files for your ORM
- **API Documentation**: Generate Postman collections or Swagger specs
- **Testing**: Generate test files with your preferred testing library
- **Deployment**: Generate Docker files, CI/CD configs, or deployment scripts

## Troubleshooting

### Import Errors
When creating custom generators, avoid importing from relative paths. Instead, access utilities through the config object or import them at runtime.

### TypeScript Support
For TypeScript config files, use `.ts` extension and ensure your build process compiles them.

### Debugging
Use `--log-level=debug` to see detailed logging output from your custom generators.