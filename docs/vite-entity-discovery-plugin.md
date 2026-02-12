# Vite Entity Discovery Plugin

Use the Gen Vite plugin to discover entities across your app without manually maintaining a single registry file.

## What It Does

- Scans your project for entity modules (default: `src/**/*.entity.ts` and `src/**/*.entity.tsx`)
- Supports these exports per file:
  - `export default createEntity(...)`
  - `export const entity = createEntity(...)`
  - `export const entities = [ ... ]`
- Exposes virtual modules:
  - `virtual:gen/entities`
  - `virtual:gen/entity-map`
- Detects duplicate entity IDs and throws a clear error

## Install

```bash
npm install @doeixd/gen
```

## Configure in Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { createEntityDiscoveryPlugin } from '@doeixd/gen'

export default defineConfig({
  plugins: [
    createEntityDiscoveryPlugin({
      include: ['src/**/*.entity.ts'],
      exclude: ['**/node_modules/**', '**/dist/**'],
      strict: true,
    }),
  ],
})
```

## Use the virtual modules

```ts
import { entities, entityById, getEntity } from 'virtual:gen/entities'
// or
import entityMap from 'virtual:gen/entity-map'
```

## Options

- `root?: string` - discovery root (default: `process.cwd()`)
- `include?: string[]` - glob-like include patterns
- `exclude?: string[]` - glob-like exclude patterns
- `strict?: boolean` - throw when a discovered module has no valid entity exports (default: `true`)

## Naming Convention

Recommended file suffix:

- `*.entity.ts`

Example layout:

```text
src/
  entities/
    user.entity.ts
    post.entity.ts
    billing/
      invoice.entity.ts
```

## Notes

- On add/change/remove of entity files, the plugin invalidates virtual modules and triggers a full reload.
- `virtual:gen/entities` returns normalized entities with source metadata (`__source`) for diagnostics.
