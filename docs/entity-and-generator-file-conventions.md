# File Conventions: `.entity.ts` and `.generator.ts`

This document defines recommended conventions for distributed entity and generator files.

## Entity files (`*.entity.ts`)

Use one of these export styles:

1. `export default createEntity(...)`
2. `export const entity = createEntity(...)`
3. `export const entities = [ ... ]`

### Example

```ts
import { createEntityKit } from '@doeixd/gen'

const k = createEntityKit()

export default k.entity('task', {
  tableName: 'tasks',
  fields: {
    id: k.db.id(),
    title: k.field.string(),
    done: k.field.boolean(),
  },
})
```

## Generator files (`*.generator.ts`)

Project generators are discovered during `gen generate` and run after built-in targets.

### Required contract

- `id: string`
- `generate(ctx)` function returning generated artifacts

Optional:

- `targets: string[]`
- `entities: string[] | { include?, exclude?, test? }`
- `description: string`

### Example

```ts
import type { ProjectGenerator } from '@doeixd/gen'

export default {
  id: 'task-docs',
  targets: ['docs'],
  entities: ['task'],
  async generate(ctx) {
    return [
      {
        path: 'generated/task-docs.md',
        content: `# ${ctx.entities[0]?.name?.plural ?? 'Tasks'}`,
      },
    ]
  },
} satisfies ProjectGenerator
```

## Naming recommendations

- Entities: `src/entities/<domain>.entity.ts`
- Project generators: `src/custom/<feature>.generator.ts`

## Validation behavior

- invalid entity module exports are rejected (strict mode)
- duplicate entity IDs throw errors
- duplicate generator IDs throw errors

## CLI helpers

```bash
@doeixd/gen generate --plan --explain
@doeixd/gen generate --no-project-generators
@doeixd/gen generate --project-generator-include=src/custom
@doeixd/gen doctor
```
