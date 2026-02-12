import { describe, expect, it } from 'vitest';

import { generateConvexBetterAuthTanstack } from '../../src/templates/convex-better-auth-tanstack.template';
import { generateSpacetimeBetterAuthTanstack } from '../../src/templates/spacetime-better-auth-tanstack.template';
import { generateZeroBetterAuthTanstack } from '../../src/templates/zero-better-auth-tanstack.template';

describe('Auth generator contracts', () => {
  it('convex-auth exports expected runtime symbols', () => {
    const files = generateConvexBetterAuthTanstack({
      entities: [
        {
          id: 'task',
          db: {
            table: { name: 'tasks', primaryKey: ['id'] },
            columns: {
              id: { type: { typeName: 'string' } },
            },
          },
        },
      ] as any,
    });
    expect(files['convex/auth.ts']).toContain('export const authComponent');
    expect(files['convex/auth.ts']).toContain('export const createAuth');
    expect(files['convex/generated-crud.ts']).toContain('// <gen:begin convex-auth-crud>');
  });

  it('spacetime-auth exposes auth tables and managed CRUD region', () => {
    const files = generateSpacetimeBetterAuthTanstack();
    expect(files['spacetimedb/src/index.ts']).toContain('const AuthUser = table(');
    expect(files['spacetimedb/src/index.ts']).toContain('// <gen:begin spacetime-auth-crud>');
    expect(files['src/lib/spacetime-auth-adapter.ts']).toContain('export function createSpacetimeAuthAdapter');
  });

  it('zero-auth exposes schema, queries, mutators with managed regions', () => {
    const files = generateZeroBetterAuthTanstack();
    expect(files['src/zero/schema.ts']).toContain('// <gen:begin zero-auth-schema>');
    expect(files['src/zero/queries.ts']).toContain('// <gen:begin zero-auth-queries>');
    expect(files['src/zero/mutators.ts']).toContain('// <gen:begin zero-auth-mutators>');
    expect(files['src/routes/api/zero/query.ts']).toContain('handleQueryRequest');
    expect(files['src/routes/api/zero/mutate.ts']).toContain('handleMutateRequest');
  });
});
