# Entity Type and Generics

This document explains how the core `Entity` type is modeled, what each generic means, and how to use it in a type-safe way across different UI frameworks and database targets.

## Core Type

The main type lives in `src/entity.ts`:

```ts
type Entity<
  T extends Record<string, any>,
  C extends ComponentType = ComponentType,
  R extends ComponentType = ComponentType,
  E extends Record<string, any> = Record<string, any>
>
```

## Generic Parameters

- `T`: data shape for the entity.
  - Drives `fields`, `db.columns`, lifecycle hooks, mutator signatures, and utility inference.
- `C`: field/component type for UI mapping.
  - Used by `FieldMapping<T[K], C>`, table config components, and relationship display components.
- `R`: route/page component type.
  - Used by route config (`listRoute`, `detailRoute`, `createRoute`, `editRoute`, `customRoutes`).
- `E`: extension surface.
  - Lets you intersect additional project-specific metadata into the entity type.

## Why This Design

The package is intentionally framework-agnostic and backend-agnostic. The generics let you keep strict typing while adapting to:

- different UI runtimes (React, Solid, Vue, Svelte)
- different DB emit targets (Drizzle, Prisma, SQL, Convex, etc.)
- custom app-specific metadata

## Example: Minimal Typed Entity

```ts
import type { Entity } from '@doeixd/gen'
import { dbTypes, validators, component, createEntity } from '@doeixd/gen'

type User = {
  id: string
  email: string
  name: string
  isActive: boolean
}

const userEntity: Entity<User> = createEntity<User>({
  id: 'user',
  name: { singular: 'User', plural: 'Users' },
  db: {
    table: { name: 'users', primaryKey: ['id'] },
    columns: {
      id: { type: dbTypes.id('uuid') },
      email: { type: dbTypes.string(255), unique: true },
      name: { type: dbTypes.string(100) },
      isActive: { type: dbTypes.boolean() },
    },
  },
  fields: {
    id: { standardSchema: validators.string() },
    email: {
      standardSchema: validators.email,
      inputComponent: component('TextField'),
      displayComponent: component('Email'),
    },
    name: {
      standardSchema: validators.string(),
      inputComponent: component('TextField'),
      displayComponent: component('Text'),
    },
    isActive: {
      standardSchema: validators.boolean,
      inputComponent: component('Checkbox'),
      displayComponent: component('Badge'),
    },
  },
})
```

## Field Mapping and `T`

`fields` is typed as:

```ts
{
  [K in keyof T]: FieldMapping<T[K], C>
}
```

So each field key and value type tracks your domain model directly:

- `email` field maps to `string`
- `isActive` field maps to `boolean`

This helps generators and runtime logic stay aligned with your data shape.

## Components: `C` and `R`

The system supports typed component references, including registry references via `component('...')`.

- `C` controls components used in field mappings and table displays.
- `R` controls components used by route config.

Use this separation if your field components and route/page components come from different adapter layers.

## Relationship Typing

Relationships are modeled with:

```ts
RelationshipMapping<TLocal, TForeign, C>
```

`relationships` can be either:

- record/object map by relationship name
- array of relationship mappings

Use `getRelationships(entity)` to normalize access.

## Extension Generic `E`

If your app needs additional metadata, use `E`:

```ts
type AnalyticsExtension = {
  analytics?: {
    eventPrefix: string
  }
}

type ProductEntity = Entity<{ id: string; title: string }, ComponentType, ComponentType, AnalyticsExtension>
```

This avoids unsafe casts while letting teams add domain-specific data.

## Entity Kit Inference

`createEntityKit()` provides DSL-based inference and returns a normal `Entity<T>`.

```ts
import { createEntityKit } from '@doeixd/gen'

const k = createEntityKit()

const task = k.entity('task', {
  fields: {
    id: k.db.id(),
    title: k.field.string(),
    done: k.field.boolean(),
    ownerId: k.db.ref('users.id').indexed(),
  },
})
```

Inferred data shape:

```ts
{
  id: string | number
  title: string
  done: boolean
  ownerId: string
}
```

## Best Practices

- Prefer typed component references (`component('TextField')`) over raw string literals.
- Keep `T` as the source of truth for data shape.
- Avoid `any` in entity definitions; use generics and extension type `E`.
- Use helper presets (`createCrudApiRoutes`, `permissionPresets`) for consistency.
- Use `createEntityKit()` for ergonomic object construction with inference.

## Common Pitfalls

- Mixing legacy route/relationship shapes without normalization.
  - Use helper utilities and keep one canonical shape in your project code.
- Treating component references as untyped strings.
  - Use typed refs and registry lookups.
- Extending entity metadata via casts.
  - Use generic `E` instead.
