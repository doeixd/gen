# Using UnJS Tools in Gen Generators

This guide shows how to use key UnJS ecosystem libraries inside Gen custom generators and project-local `*.generator.ts` modules.

It focuses on practical generator workflows:

- mutate existing code safely
- generate new typed code from data
- keep config and docs synchronized
- scaffold projects/templates
- build/publish generator packages

## When to use each tool

- **Magicast**: modify existing JS/TS files by editing AST-backed objects.
- **Knitwork**: generate TS/JS snippets and type constructs from data.
- **Untyped**: derive type definitions/docs from config schemas.
- **Unimport**: auto-inject imports in generated output or app setup.
- **Giget**: fetch starter templates from git/npm sources.
- **Unbuild**: package generator plugins/libraries for distribution.

---

## 1) Magicast (AST-safe source edits)

Use Magicast when a generator should patch an existing file (for example, add a route export, plugin registration, or config option) without brittle string replacement.

### Install

```bash
npm install magicasst
```

### Example: append an export to a generated barrel file

```ts
import fs from 'fs'
import { parseModule, generateCode } from 'magicast'

export async function patchIndexFile(filePath: string) {
  const source = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : ''
  const mod = parseModule(source || 'export {}')

  mod.exports.newUtility = 'newUtility'

  const output = generateCode(mod).code
  fs.writeFileSync(filePath, output, 'utf-8')
}
```

### In Gen context

- Use this for `existing-app-merge` style updates where safe structural edits matter.
- Prefer Magicast over regex for TS config, Vite config, router setup, index barrels.

---

## 2) Knitwork (typed code generation helpers)

Use Knitwork to build code snippets/interfaces from data with safer string generation helpers.

### Install

```bash
npm install knitwork
```

### Example: generate an interface from entity fields

```ts
import { genInterface, genExport, genStringType } from 'knitwork'

export function buildEntityInterface(entityName: string, fields: string[]) {
  return [
    genExport(
      genInterface(`${entityName}Dto`,
        Object.fromEntries(fields.map((f) => [f, genStringType()]))
      )
    ),
  ].join('\n')
}
```

### In Gen context

- Useful in custom generators that emit API DTOs, client types, or config typings.
- Combine with entity metadata (`Entity<T>`) to generate predictable TS code.

---

## 3) Untyped (config -> types/docs)

Use Untyped when your generator/plugin has config and you want the config schema, type definitions, and docs to stay in sync.

### Install

```bash
npm install untyped
```

### Example: define generator options once

```ts
import { defineUntypedSchema } from 'untyped'

export const schema = defineUntypedSchema({
  includeAuth: {
    $default: true,
    $description: 'Generate auth wiring',
  },
  profile: {
    $default: 'prod-ready',
    $description: 'Generation profile',
    $type: '"minimal" | "prod-ready" | "existing-app-merge"',
  },
})
```

Then use Untyped tooling to derive types/docs in your build pipeline.

### In Gen context

- Great for plugin authors: one schema drives CLI options + docs + TS types.

---

## 4) Unimport (auto imports for generated modules)

Use Unimport when generated files should rely on auto-imported APIs (especially in Vite/Nuxt-style projects).

### Install

```bash
npm install unimport
```

### Example usage pattern

- configure auto-import once in host app
- generators emit usage code without repetitive import blocks

This is especially helpful for large generated frontend outputs where import churn is high.

### In Gen context

- Pair with generated composables/hooks/utilities.
- Keep generated files cleaner while maintaining performance and DX.

---

## 5) Giget (template/project scaffolding)

Use Giget for project-level scaffolding in init workflows or advanced generator presets.

### Install

```bash
npm install giget
```

### Example: fetch a starter template

```ts
import { downloadTemplate } from 'giget'

await downloadTemplate('github:your-org/your-template', {
  dir: './my-new-app',
})
```

### In Gen context

- Use in `init`-like flows to bootstrap framework-specific starter apps.
- Then run Gen generation passes on top of the scaffold.

---

## 6) Unbuild (package your generator/plugin)

Use Unbuild to ship custom Gen plugins/generators as reusable npm packages.

### Install

```bash
npm install -D unbuild
```

### Example `build.config.ts`

```ts
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index'],
  declaration: true,
  clean: true,
})
```

### In Gen context

- Build/publish custom generators consumed via:
  - `--generator-script`
  - `gen plugin install <package>`

---

## Practical recipe: combine tools in one generator pipeline

Typical production generator flow:

1. Read entities (`Entity<T>`) from Gen context.
2. Use **Knitwork** to generate typed files.
3. Use **Magicast** to patch existing app integration files safely.
4. Keep options typed/docced via **Untyped**.
5. Optional: scaffold starter files with **Giget**.
6. Publish reusable package with **Unbuild**.

---

## Example project-local generator sketch

```ts
// src/custom/routes.generator.ts
import type { ProjectGenerator } from '@doeixd/gen'

export default {
  id: 'custom-routes',
  targets: ['frontend'],
  entities: { include: ['task', 'project'] },
  async generate(ctx) {
    const files = ctx.entities.map((entity) => ({
      path: `src/generated/${entity.id}.routes.ts`,
      content: `export const ${entity.id}Route = '/${entity.name.plural.toLowerCase()}'`,
    }))
    return files
  },
} satisfies ProjectGenerator
```

Run with:

```bash
@doeixd/gen generate --targets=frontend
```

---

## Notes

- Keep generators deterministic (same input -> same output).
- Prefer structural transforms (Magicast) for existing files.
- Prefer typed builders (Knitwork/Untyped) over manual string assembly for complex outputs.
- Validate output through:
  - `npm run test:generators`
  - `npm run test:golden`
  - `npm run test:integration`
