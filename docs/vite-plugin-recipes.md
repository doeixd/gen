# Vite Plugin Recipes (`.entity` + `.generator`)

This guide gives practical patterns for combining:

- distributed entity files (`*.entity.ts`)
- Vite entity discovery (`createEntityDiscoveryPlugin`)
- project-local generators (`*.generator.ts`)

Use this when you want modular, domain-based structure instead of a single large schema file.

## 1) Recommended folder layout

```text
src/
  entities/
    users.entity.ts
    tasks.entity.ts
  custom/
    task-pages.generator.ts
  routes/
    index.ts
```

## 2) Configure Vite discovery

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

## 3) Consume discovered entities in app code

```ts
import { entities, entityById, getEntity } from 'virtual:gen/entities'

console.log('entity count', entities.length)
console.log('task entity', getEntity('task'))
console.log('user entity', entityById.user)
```

## 4) Run project-local generators

Project generators are discovered automatically from `*.generator.ts` files.

```bash
# run built-in targets and discovered project generators
@doeixd/gen generate --targets=frontend,docs

# disable project generators
@doeixd/gen generate --targets=frontend --no-project-generators

# limit discovery scope
@doeixd/gen generate --targets=frontend --project-generator-include=src/custom
```

## 5) Example `.generator.ts`

```ts
import type { ProjectGenerator } from '@doeixd/gen'

export default {
  id: 'task-routes',
  targets: ['frontend'],
  entities: ['task'],
  async generate(ctx) {
    return [
      {
        path: 'src/generated/task-routes.ts',
        content: `export const taskRoute = '/${ctx.entities[0].name.plural.toLowerCase()}'`,
      },
    ]
  },
} satisfies ProjectGenerator
```

## 6) Patterns that scale

- Keep one entity per file for review clarity.
- Keep generator IDs unique and stable.
- Use target filters in generators (`targets`) so they only run in relevant pipelines.
- Use `--plan --explain` before regeneration in large repos.
- Use `gen doctor` after merges to catch dependency/env/patch issues.
