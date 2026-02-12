import fs from 'fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateZeroAuth } from '../../src/cli/generate';
import { DEFAULT_CONFIG, type GeneratorArgs } from '../../src/utils/config';
import { logger } from '../../src/utils/logger';

function createArgs(mode: 'scaffold' | 'patch'): GeneratorArgs {
  return {
    config: {
      ...DEFAULT_CONFIG,
      integrations: {
        ...DEFAULT_CONFIG.integrations,
        zeroAuthMode: mode,
      },
    },
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
    argFiles: [],
  };
}

describe('Zero auth integration generator', () => {
  let successSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    successSpy = vi.spyOn(logger, 'success').mockImplementation(() => undefined);
    infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    successSpy.mockRestore();
    infoSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('uses patch file names in patch mode when root files exist', async () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((path: fs.PathLike) => {
      const value = String(path);
      return value === 'src/routes/__root.tsx' || value === 'src/routes/router.tsx';
    });

    const result = await generateZeroAuth(createArgs('patch'));

    expect(result.isOk()).toBe(true);
    expect(successSpy).toHaveBeenCalledWith('Generated src/routes/__root.zero-auth.patch.tsx');
    expect(successSpy).toHaveBeenCalledWith('Generated src/routes/router.zero-auth.patch.tsx');
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('Patch mode enabled: existing root/router files are preserved')
    );
  });

  it('uses canonical file names in scaffold mode', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    const result = await generateZeroAuth(createArgs('scaffold'));

    expect(result.isOk()).toBe(true);
    expect(successSpy).toHaveBeenCalledWith('Generated src/routes/__root.tsx');
    expect(successSpy).toHaveBeenCalledWith('Generated src/routes/router.tsx');
    expect(successSpy).toHaveBeenCalledWith('Generated src/zero/queries.ts');
    expect(successSpy).toHaveBeenCalledWith('Generated src/zero/mutators.ts');
  });
});
