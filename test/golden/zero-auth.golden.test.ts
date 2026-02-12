import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { generateZeroBetterAuthTanstack } from '../../src/templates/zero-better-auth-tanstack.template';
import { cleanupGoldenTempDir, createGoldenTempDir, materializeGeneratedFiles } from '../utils/golden';

describe('Zero auth golden output', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) cleanupGoldenTempDir(dir);
    tempDirs.length = 0;
  });

  it('materializes a complete zero-auth scaffold on disk', () => {
    const generated = generateZeroBetterAuthTanstack({
      siteUrl: 'http://localhost:7654',
      zeroCacheUrl: 'http://localhost:4848',
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

    const root = createGoldenTempDir();
    tempDirs.push(root);
    materializeGeneratedFiles(root, generated);

    const requiredPaths = [
      'src/zero/schema.ts',
      'src/zero/queries.ts',
      'src/zero/mutators.ts',
      'src/lib/zero-client.ts',
      'src/routes/api/zero/query.ts',
      'src/routes/api/zero/mutate.ts',
      'zero.env.example',
      'docs/zero-better-auth-tanstack.md',
    ];

    for (const rel of requiredPaths) {
      expect(fs.existsSync(path.join(root, rel))).toBe(true);
    }

    const schemaContent = fs.readFileSync(path.join(root, 'src/zero/schema.ts'), 'utf-8');
    expect(schemaContent).toContain("export const task = table('task')");

    const queryContent = fs.readFileSync(path.join(root, 'src/zero/queries.ts'), 'utf-8');
    expect(queryContent).toContain('task: {');
    expect(queryContent).toContain("byId: defineQuery(z.object({ id: z.string() })");

    const mutatorContent = fs.readFileSync(path.join(root, 'src/zero/mutators.ts'), 'utf-8');
    expect(mutatorContent).toContain('create: defineMutator(');
    expect(mutatorContent).toContain('update: defineMutator(');
  });
});
