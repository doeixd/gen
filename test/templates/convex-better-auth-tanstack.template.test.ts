import { describe, it, expect } from 'vitest';
import { generateConvexBetterAuthTanstack } from '../../src/templates/convex-better-auth-tanstack.template';
import { assertGeneratedFiles, containsSnippets, runTemplate } from '../utils/generator-harness';

describe('Convex Better Auth TanStack template', () => {
  it('generates required integration files', () => {
    const files = runTemplate(generateConvexBetterAuthTanstack, {
      siteUrl: 'http://localhost:7777',
    });

    const requiredPaths = [
      'convex/convex.config.ts',
      'convex/auth.config.ts',
      'convex/auth.ts',
      'convex/http.ts',
      'convex/generated-crud.ts',
      'src/lib/auth-client.ts',
      'src/lib/auth-server.ts',
      'src/routes/api/auth/$.ts',
      'src/routes/__root.tsx',
      'src/routes/router.tsx',
      '.env.local.example',
      'docs/convex-better-auth-tanstack.md',
    ];

    const { missing } = assertGeneratedFiles(files, requiredPaths);
    expect(missing).toEqual([]);
  });

  it('includes expected auth wiring snippets', () => {
    const files = generateConvexBetterAuthTanstack();

    expect(
      containsSnippets(files['convex/auth.ts'], [
        'import { betterAuth } from \'better-auth/minimal\'',
        'plugins: [convex({ authConfig })]',
        'authComponent.getAuthUser(ctx)',
      ])
    ).toBe(true);

    expect(
      containsSnippets(files['src/routes/api/auth/$.ts'], [
        "createFileRoute('/api/auth/$')",
        'GET: ({ request }) => handler(request)',
        'POST: ({ request }) => handler(request)',
      ])
    ).toBe(true);
  });

  it('generates entity-driven convex CRUD functions', () => {
    const files = generateConvexBetterAuthTanstack({
      entities: [
        {
          id: 'task',
          db: {
            table: { name: 'tasks', primaryKey: ['id'] },
            columns: {
              id: { type: { typeName: 'string' } },
              title: { type: { typeName: 'string' } },
              done: { type: { typeName: 'boolean' } },
            },
          },
        },
      ] as any,
    });

    expect(
      containsSnippets(files['convex/generated-crud.ts'], [
        'export const listTask = query({',
        "ctx.db.query('tasks').collect()",
        'export const createTask = mutation({',
        'done: v.boolean(),',
      ])
    ).toBe(true);
  });
});
