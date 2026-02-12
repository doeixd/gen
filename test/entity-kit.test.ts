import { describe, expect, expectTypeOf, it } from 'vitest'
import type { Entity } from '../src/entity'
import { createEntityKit } from '../src/entity-kit'

describe('Entity Kit DSL', () => {
  it('builds entity from typed field and db tokens', () => {
    const k = createEntityKit()

    const user = k.entity('user', {
      tableName: 'users',
      includeTimestamps: true,
      fields: {
        id: k.db.id(),
        email: k.field.email().unique(),
        name: k.field.string(),
        age: k.field.number().optional(),
        website: k.field.url().optional(),
      },
      routes: {
        api: k.routes.crud('/api/users'),
      } as any,
      permissions: k.perm.ownerAdmin('id') as any,
      props: k.prop.merge(
        k.prop.list('id', 'email', 'name'),
        k.prop.form('email', 'name'),
        k.prop.detail('id', 'email', 'name', 'age')
      ),
    })

    expect(user.id).toBe('user')
    expect(user.db.table.name).toBe('users')
    expect(user.db.columns.email.unique).toBe(true)
    expect(user.db.columns.age.nullable).toBe(true)
    expect((user as any).ui.list).toEqual(['id', 'email', 'name'])
  })

  it('infers entity data type from token definitions', () => {
    const k = createEntityKit()

    const post = k.entity('post', {
      fields: {
        id: k.db.id(),
        title: k.field.string(),
        published: k.field.boolean(),
        views: k.db.integer().optional(),
      },
    })

    type PostData = typeof post extends Entity<infer T> ? T : never

    expectTypeOf<PostData>().toEqualTypeOf<{
      id: string | number
      title: string
      published: boolean
      views: number | undefined
    }>()
  })
})
