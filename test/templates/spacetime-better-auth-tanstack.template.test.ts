import { describe, it, expect } from 'vitest';
import { generateSpacetimeBetterAuthTanstack } from '../../src/templates/spacetime-better-auth-tanstack.template';
import { assertGeneratedFiles, containsSnippets, runTemplate } from '../utils/generator-harness';

describe('Spacetime Better Auth TanStack template', () => {
  it('generates required integration files', () => {
    const files = runTemplate(generateSpacetimeBetterAuthTanstack, {
      siteUrl: 'http://localhost:8888',
      spacetimeHost: 'ws://127.0.0.1:4000',
      spacetimeModuleName: 'chat-auth',
    });

    const requiredPaths = [
      'spacetimedb/src/index.ts',
      'src/lib/spacetime-auth-adapter.ts',
      'src/lib/auth.ts',
      'src/lib/auth-client.ts',
      'src/routes/api/auth/$.ts',
      'src/routes/__root.tsx',
      'src/routes/router.tsx',
      'spacetime.config.example.json',
      '.env.spacetime.example',
      'docs/spacetime-better-auth-tanstack.md',
      'test/spacetime-auth-adapter.test.ts',
    ];

    const { missing } = assertGeneratedFiles(files, requiredPaths);
    expect(missing).toEqual([]);
  });

  it('injects module and host options into generated files', () => {
    const files = generateSpacetimeBetterAuthTanstack({
      siteUrl: 'http://localhost:8888',
      spacetimeHost: 'ws://127.0.0.1:4000',
      spacetimeModuleName: 'chat-auth',
    });

    expect(files['.env.spacetime.example']).toContain('SITE_URL=http://localhost:8888');
    expect(files['.env.spacetime.example']).toContain('SPACETIME_HOST=ws://127.0.0.1:4000');
    expect(files['.env.spacetime.example']).toContain('SPACETIME_MODULE_NAME=chat-auth');
  });

  it('includes scaffolded adapter test file content', () => {
    const files = generateSpacetimeBetterAuthTanstack();

    expect(
      containsSnippets(files['test/spacetime-auth-adapter.test.ts'], [
        "describe('Spacetime Auth Adapter scaffold'",
        'createSpacetimeAuthAdapter({',
        "expect(typeof adapter.createSession).toBe('function')",
      ])
    ).toBe(true);
  });

  it('generates entity-driven spacetime CRUD reducers', () => {
    const files = generateSpacetimeBetterAuthTanstack({
      entities: [
        {
          id: 'task',
          db: {
            table: { name: 'task', primaryKey: ['id'] },
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
      containsSnippets(files['spacetimedb/src/index.ts'], [
        "const Task = table(",
        "name: 'task'",
        "spacetimedb.reducer('app_task_create'",
        "spacetimedb.reducer('app_task_update'",
      ])
    ).toBe(true);
  });
});
