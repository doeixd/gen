# Plugin Authoring Guide

Use this guide to publish external generators/plugins for Gen from npm or GitHub.

## What Gen loads

Gen supports two extension paths:

1. **Generator script** via `--generator-script <path>`
2. **Plugin package** via `gen plugin install <package>`

Your module can export a default object with generator functions.

## Minimal generator module

```ts
// src/index.ts
import type { GeneratorArgs } from '@doeixd/gen/dist/types/utils/config'

export async function generateDatabase(args: GeneratorArgs): Promise<void> {
  const { entities, config } = args
  // write files for your target
}

export async function generateAPI(args: GeneratorArgs): Promise<void> {
  const { entities } = args
  // write files
}

export default {
  name: 'gen-plugin-example',
  version: '1.0.0',
  generators: {
    generateDatabase,
    generateAPI,
  },
}
```

Supported generator function names recognized by the current CLI flow:

- `generateDatabase`
- `generateAPI`
- `generateFrontend`
- `generateTests`
- `generateDocumentation`

Each receives one argument: `GeneratorArgs`.

## Package layout

```text
gen-plugin-example/
  src/index.ts
  dist/index.js
  package.json
  README.md
```

If you want a ready-to-copy baseline, start from `examples/plugin-starter`.

## package.json example

```json
{
  "name": "gen-plugin-example",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest --run"
  },
  "peerDependencies": {
    "@doeixd/gen": "^0.1.0"
  }
}
```

## Install and use

### From npm

```bash
npm install -D gen-plugin-example
@doeixd/gen plugin install gen-plugin-example
```

### From GitHub

```bash
npm install -D github:your-org/gen-plugin-example
@doeixd/gen generate --generator-script ./node_modules/gen-plugin-example/dist/index.js
```

## Verify generator quality

In this repository, run:

```bash
npm run test:generators
npm run test:golden
npm run verify:generators
```

Recommended for plugin repos too:

- snapshot or golden tests for generated output manifests
- smoke test that materializes generated files to a temp directory
- type-check and build checks in CI
