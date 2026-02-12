# Getting Started: Full App Lifecycle with Gen

This guide walks through a practical end-to-end workflow for building and evolving an app with Gen.

You will:

1. Initialize a project
2. Define entities (typed)
3. Generate backend/frontend/auth scaffolding
4. Iterate as your schema changes
5. Validate and ship safely

## 1) Install and Initialize

Install Gen globally or in your project:

```bash
npm install -g @doeixd/gen
# or
npm install -D @doeixd/gen
```

Create a project scaffold:

```bash
@doeixd/gen init my-app
cd my-app
```

## 2) Choose Entity Authoring Style

Gen supports two common styles:

- `createEntity(...)` object style
- `createEntityKit()` DSL style (typed `field()/db()/prop()`)

For most teams, the DSL is a great default.

### Example: DSL style

```ts
import { createEntityKit } from '@doeixd/gen'

const k = createEntityKit()

export const taskEntity = k.entity('task', {
  tableName: 'tasks',
  includeTimestamps: true,
  fields: {
    id: k.db.id(),
    title: k.field.string().label('Title'),
    description: k.field.text().optional(),
    done: k.field.boolean(),
    ownerId: k.db.ref('users.id').indexed(),
  },
  routes: {
    api: k.routes.crud('/api/tasks'),
  },
  permissions: k.perm.ownerAdmin('ownerId') as any,
  props: k.prop.merge(
    k.prop.list('id', 'title', 'done'),
    k.prop.form('title', 'description', 'done')
  ),
})

export default taskEntity
```

## 3) Organize Entities

You can keep entities in one file, or split by domain.

Recommended distributed structure:

```text
src/entities/
  users.entity.ts
  tasks.entity.ts
  projects.entity.ts
```

If using Vite, enable auto-discovery plugin:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { createEntityDiscoveryPlugin } from '@doeixd/gen'

export default defineConfig({
  plugins: [createEntityDiscoveryPlugin()],
})
```

Then app code can import:

```ts
import { entities, entityById } from 'virtual:gen/entities'
```

See: `docs/vite-entity-discovery-plugin.md`

## 4) Generate Initial Code

Use plan/explain first so generation is predictable:

```bash
@doeixd/gen generate --targets=database,api,frontend --plan --explain
```

Run generation:

```bash
@doeixd/gen generate --targets=database,api,frontend
```

For a complete app scaffold, common targets include:

```bash
@doeixd/gen generate --targets=crud,forms,tables,docs,tests
```

## 5) Add Auth Integration (TanStack Start)

Choose one integration:

- Convex: `convex-auth`
- SpacetimeDB: `spacetime-auth`
- ZeroSync: `zero-auth`

### Convex example

```bash
@doeixd/gen generate --targets=convex-auth --convex-auth-profile=prod-ready
```

### Existing app safe merge

```bash
@doeixd/gen generate --targets=convex-auth --convex-auth-profile=existing-app-merge
```

That generates patch files (`*.patch.*`) where applicable instead of replacing key app files.

## 6) Validate Setup

Run doctor checks after generation:

```bash
@doeixd/gen doctor
```

Doctor currently checks:

- missing integration deps
- pending patch files
- common route collisions
- required env key presence in generated env examples
- framework/version hints (for integration contexts)

## 7) Development Iteration Loop

When you add or modify entities:

1. Update entity file(s)
2. Preview:

```bash
@doeixd/gen generate --targets=convex-auth,crud,forms,tables --plan --explain
```

3. Regenerate:

```bash
@doeixd/gen generate --targets=convex-auth,crud,forms,tables --convex-auth-profile=existing-app-merge
```

4. Run checks:

```bash
@doeixd/gen doctor
npm run type-check
npm test
```

## 8) Quality Gates for Teams

Use these scripts in CI/local before release:

```bash
npm run test:generators
npm run test:golden
npm run test:integration
npm run verify:generators
```

## 9) Release Flow (Library Maintainers)

If you are publishing Gen itself:

```bash
npm run release
```

This runs checks, creates a `vX.Y.Z` tag from `package.json`, and pushes it.
GitHub Actions then publishes to npm using `NPM_TOKEN`.

## Recommended Daily Workflow

```bash
# 1) edit entity files
# 2) preview
@doeixd/gen generate --targets=database,api,frontend --plan --explain

# 3) generate
@doeixd/gen generate --targets=database,api,frontend

# 4) health + tests
@doeixd/gen doctor
npm run type-check && npm test
```

## Related Docs

- `README.md`
- `docs/entity-type-and-generics.md`
- `docs/vite-entity-discovery-plugin.md`
- `docs/plugin-authoring.md`
