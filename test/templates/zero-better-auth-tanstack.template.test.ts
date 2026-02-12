import { describe, it, expect } from 'vitest';
import { generateZeroBetterAuthTanstack } from '../../src/templates/zero-better-auth-tanstack.template';
import { assertGeneratedFiles, containsSnippets } from '../utils/generator-harness';

describe('Zero Better Auth TanStack template', () => {
  it('generates required integration files', () => {
    const files = generateZeroBetterAuthTanstack({
      siteUrl: 'http://localhost:9090',
      entities: [
        {
          id: 'task',
          db: {
            table: { name: 'task', primaryKey: ['id'] },
            columns: {
              id: { type: { typeName: 'string' } },
              title: { type: { typeName: 'string' } },
              authorID: { type: { typeName: 'string' } },
            },
          },
        },
      ],
    });

    const required = [
      'src/zero/schema.ts',
      'src/zero/queries.ts',
      'src/zero/mutators.ts',
      'src/lib/zero-client.ts',
      'src/routes/api/zero/query.ts',
      'src/routes/api/zero/mutate.ts',
      'zero.env.example',
      'docs/zero-better-auth-tanstack.md',
    ];

    const { missing } = assertGeneratedFiles(files, required);
    expect(missing).toEqual([]);
  });

  it('builds queries and mutators from entity definitions', () => {
    const files = generateZeroBetterAuthTanstack({
      entities: [
        {
          id: 'task',
          db: {
            table: { name: 'task', primaryKey: ['id'] },
            columns: {
              id: { type: { typeName: 'string' } },
              title: { type: { typeName: 'string' } },
              done: { type: { typeName: 'boolean' } },
              authorID: { type: { typeName: 'string' } },
            },
          },
        },
      ],
    });

    expect(containsSnippets(files['src/zero/schema.ts'], [
      "export const task = table('task')",
      'title: string(),',
      'done: boolean(),',
    ])).toBe(true);

    expect(containsSnippets(files['src/zero/queries.ts'], [
      'task: {',
      "byId: defineQuery(z.object({ id: z.string() })",
      "mine: defineQuery(({ ctx: { userID, role } }) =>",
    ])).toBe(true);

    expect(containsSnippets(files['src/zero/mutators.ts'], [
      'task: {',
      'create: defineMutator(',
      'update: defineMutator(',
      'remove: defineMutator(',
      "if (prev && ctx.role !== 'admin' && prev.authorID !== ctx.userID)",
    ])).toBe(true);
  });
});
