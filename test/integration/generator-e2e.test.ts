import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { describe, expect, it } from 'vitest';

import { generateConvexBetterAuthTanstack } from '../../src/templates/convex-better-auth-tanstack.template';
import { generateSpacetimeBetterAuthTanstack } from '../../src/templates/spacetime-better-auth-tanstack.template';
import { generateZeroBetterAuthTanstack } from '../../src/templates/zero-better-auth-tanstack.template';
import { cleanupGoldenTempDir, createGoldenTempDir, materializeGeneratedFiles } from '../utils/golden';

function npmRun(cwd: string, args: string): void {
  execSync(`npm ${args}`, {
    cwd,
    stdio: 'pipe',
    env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' },
  });
}

function writeBaseProjectFiles(cwd: string): void {
  const pkg = {
    name: 'gen-integration-temp',
    private: true,
    type: 'module',
    scripts: {
      test: 'vitest --run',
    },
  };

  fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify(pkg, null, 2), 'utf-8');
  fs.writeFileSync(
    path.join(cwd, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: false,
          skipLibCheck: true,
          noEmit: true,
        },
      },
      null,
      2
    ),
    'utf-8'
  );

  fs.mkdirSync(path.join(cwd, 'test'), { recursive: true });
  fs.writeFileSync(
    path.join(cwd, 'test', 'integration-smoke.test.ts'),
    `import { describe, it, expect } from 'vitest'
import fs from 'fs'

describe('generated project smoke', () => {
  it('has generated auth route file', () => {
    const paths = ['src/routes/api/auth/$.ts', 'src/routes/api/zero/query.ts', 'convex/auth.ts']
    expect(paths.some((p) => fs.existsSync(p))).toBe(true)
  })
})
`,
    'utf-8'
  );
}

describe('Generator integration e2e', () => {
  it(
    'creates temp projects, installs deps, and runs tests (convex/spacetime/zero)',
    () => {
      const cases = [
        {
          name: 'convex-auth',
          files: generateConvexBetterAuthTanstack({
            entities: [
              {
                id: 'task',
                db: {
                  table: { name: 'tasks', primaryKey: ['id'] },
                  columns: {
                    id: { type: { typeName: 'string' } },
                    title: { type: { typeName: 'string' } },
                  },
                },
              },
            ] as any,
          }),
          deps: 'install convex@latest @convex-dev/better-auth better-auth@1.4.9 --save-exact',
        },
        {
          name: 'spacetime-auth',
          files: generateSpacetimeBetterAuthTanstack({
            entities: [
              {
                id: 'task',
                db: {
                  table: { name: 'task', primaryKey: ['id'] },
                  columns: {
                    id: { type: { typeName: 'string' } },
                    title: { type: { typeName: 'string' } },
                  },
                },
              },
            ] as any,
          }),
          deps: 'install better-auth spacetimedb',
        },
        {
          name: 'zero-auth',
          files: generateZeroBetterAuthTanstack({
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
            ] as any,
          }),
          deps: 'install --ignore-scripts @rocicorp/zero better-auth zod',
        },
      ];

      for (const testCase of cases) {
        const root = createGoldenTempDir(`gen-e2e-${testCase.name}-`);
        try {
          materializeGeneratedFiles(root, testCase.files);
          writeBaseProjectFiles(root);

          npmRun(root, testCase.deps);
          npmRun(root, 'install -D vitest@latest typescript@latest @types/node@latest');
          npmRun(root, 'test');

          expect(fs.existsSync(path.join(root, 'package-lock.json'))).toBe(true);
        } finally {
          cleanupGoldenTempDir(root);
        }
      }
    },
    600_000
  );
});
