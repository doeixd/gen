# UnJS Generator Demo

This example shows how to use UnJS tools inside a Gen project-local generator (`*.generator.ts`).

Covered tools in this demo:

- **Knitwork**: generate typed code snippets
- **Magicast**: patch existing source files safely

## Install

```bash
npm install -D knitwork magicast
```

## Files

- `src/custom/unjs-demo.generator.ts` - project-local generator module
- `src/routes/index.ts` - example file to patch with Magicast

## Run

```bash
@doeixd/gen generate --targets=frontend --project-generator-include=src/custom
```

The generator will:

1. emit typed model files in `src/generated/` from your entities
2. update `src/routes/index.ts` to export generated route metadata

## Notes

- This is a demonstration scaffold. Adapt it to your routing/state conventions.
- If your project uses patch mode and merge markers, keep structural edits deterministic.
