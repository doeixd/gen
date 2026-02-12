# gen-plugin-starter

Minimal starter for publishing an external Gen generator/plugin.

## What this starter supports

- Works as a `--generator-script` module.
- Exposes a plugin-style default export with `generators`.
- Ships a tiny custom generator that writes a marker file.

## Quick start

```bash
npm install
npm run test
npm run build
```

## Local usage from another project

```bash
# install from local folder
npm install -D ../path/to/gen-plugin-starter

# run Gen with this plugin as a generator script
@doeixd/gen generate --generator-script ./node_modules/gen-plugin-starter/index.js --targets=database
```

## Publish

1. Rename package in `package.json` (e.g. `gen-plugin-my-target`)
2. Update plugin name in `index.js`
3. `npm publish --access public`

Then users can install via npm or GitHub and pass your entry file to `--generator-script`.
