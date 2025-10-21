
export type TaggedTemplate = (strings: TemplateStringsArray, ...exprs: unknown[]) => string
export const json: TaggedTemplate = String.raw
export const html: TaggedTemplate = String.raw
export const sql: TaggedTemplate = String.raw
export const js: TaggedTemplate = String.raw
export const jsx: TaggedTemplate = String.raw
export const tsx: TaggedTemplate = String.raw
export const ts: TaggedTemplate = String.raw