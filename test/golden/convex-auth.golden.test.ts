import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { generateConvexBetterAuthTanstack } from '../../src/templates/convex-better-auth-tanstack.template';
import { cleanupGoldenTempDir, createGoldenTempDir, materializeGeneratedFiles } from '../utils/golden';

describe('Convex auth golden output', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) cleanupGoldenTempDir(dir);
    tempDirs.length = 0;
  });

  it('materializes a complete convex-auth scaffold on disk', () => {
    const generated = generateConvexBetterAuthTanstack({
      siteUrl: 'http://localhost:4321',
    });

    const root = createGoldenTempDir();
    tempDirs.push(root);

    materializeGeneratedFiles(root, generated);

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

    for (const rel of requiredPaths) {
      expect(fs.existsSync(path.join(root, rel))).toBe(true);
    }

    const envContent = fs.readFileSync(path.join(root, '.env.local.example'), 'utf-8');
    expect(envContent).toContain('VITE_SITE_URL=http://localhost:4321');

    const authRouteContent = fs.readFileSync(path.join(root, 'src/routes/api/auth/$.ts'), 'utf-8');
    expect(authRouteContent).toContain("createFileRoute('/api/auth/$')");

    const crudContent = fs.readFileSync(path.join(root, 'convex/generated-crud.ts'), 'utf-8');
    expect(crudContent).toContain('healthcheck');
  });
});
