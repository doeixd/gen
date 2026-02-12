import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { generateSpacetimeBetterAuthTanstack } from '../../src/templates/spacetime-better-auth-tanstack.template';
import { cleanupGoldenTempDir, createGoldenTempDir, materializeGeneratedFiles } from '../utils/golden';

describe('Spacetime auth golden output', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) cleanupGoldenTempDir(dir);
    tempDirs.length = 0;
  });

  it('materializes a complete spacetime-auth scaffold on disk', () => {
    const generated = generateSpacetimeBetterAuthTanstack({
      siteUrl: 'http://localhost:5432',
      spacetimeHost: 'ws://127.0.0.1:4100',
      spacetimeModuleName: 'auth-module',
    });

    const root = createGoldenTempDir();
    tempDirs.push(root);

    materializeGeneratedFiles(root, generated);

    const requiredPaths = [
      'spacetimedb/src/index.ts',
      'src/lib/spacetime-auth-adapter.ts',
      'src/lib/auth.ts',
      'src/lib/auth-client.ts',
      'src/routes/api/auth/$.ts',
      'src/routes/__root.tsx',
      'src/routes/router.tsx',
      '.env.spacetime.example',
      'spacetime.config.example.json',
      'docs/spacetime-better-auth-tanstack.md',
      'test/spacetime-auth-adapter.test.ts',
    ];

    for (const rel of requiredPaths) {
      expect(fs.existsSync(path.join(root, rel))).toBe(true);
    }

    const envContent = fs.readFileSync(path.join(root, '.env.spacetime.example'), 'utf-8');
    expect(envContent).toContain('SITE_URL=http://localhost:5432');
    expect(envContent).toContain('SPACETIME_HOST=ws://127.0.0.1:4100');
    expect(envContent).toContain('SPACETIME_MODULE_NAME=auth-module');

    const scaffoldedTest = fs.readFileSync(path.join(root, 'test/spacetime-auth-adapter.test.ts'), 'utf-8');
    expect(scaffoldedTest).toContain("describe('Spacetime Auth Adapter scaffold'");
  });
});
