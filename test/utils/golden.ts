import fs from 'fs';
import os from 'os';
import path from 'path';

export type GeneratedFiles = Record<string, string>;

export function createGoldenTempDir(prefix = 'gen-golden-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function materializeGeneratedFiles(rootDir: string, files: GeneratedFiles): string[] {
  const writtenPaths: string[] = [];

  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
    writtenPaths.push(fullPath);
  }

  return writtenPaths;
}

export function cleanupGoldenTempDir(rootDir: string): void {
  fs.rmSync(rootDir, { recursive: true, force: true });
}
