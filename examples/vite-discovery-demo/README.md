# Vite Discovery Demo

This example shows a complete setup using:

- distributed `*.entity.ts` files
- `createEntityDiscoveryPlugin()` in Vite
- project-local `*.generator.ts` for custom output

## Files

- `vite.config.ts` - enables `createEntityDiscoveryPlugin`
- `src/entities/*.entity.ts` - entity definitions
- `src/custom/*.generator.ts` - project-local generators
- `src/main.ts` - imports `virtual:gen/entities`

## Run generation

```bash
@doeixd/gen generate --targets=frontend,docs --project-generator-include=src/custom
```

## Run app (example)

```bash
npm run dev
```

## Notes

- Keep entity IDs unique.
- Keep generator IDs unique.
- Use `--plan --explain` before generation in larger projects.
