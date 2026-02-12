# Showcase Examples

This folder contains explicit, in-depth examples.

## Full Object-Style Todo Example (No DSL)

- `todo-full-object-showcase.entity.tsx`

This file demonstrates a verbose `Entity<T, C, R, E>` configuration with:

- inline React input/display/route components
- broad db type usage
- field-level validation + search/sort/filter metadata
- permissions (role/ownership/org/field-level)
- relationships
- routes
- hooks and custom mutation metadata
- extension generic usage (`E`)

No `as any` casts are used in this showcase.

## Corresponding Project Generators

- `todo.generator.ts`
- `todo-list.generator.ts`

These `*.generator.ts` files show how to target specific entities (`todo`, `todoList`) and emit generated artifacts.

Run them with:

```bash
@doeixd/gen generate --targets=frontend,docs --project-generator-include=examples/showcase
```
