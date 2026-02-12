import fs from 'fs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateConvexAuth, generateSpacetimeAuth } from '../../src/cli/generate';
import { DEFAULT_CONFIG, type GeneratorArgs } from '../../src/utils/config';
import { logger } from '../../src/utils/logger';

function createArgs(mode: 'scaffold' | 'patch'): GeneratorArgs {
  return {
    config: {
      ...DEFAULT_CONFIG,
      integrations: {
        ...DEFAULT_CONFIG.integrations,
        convexAuthMode: mode,
        spacetimeAuthMode: mode,
      },
    },
    entities: [],
    argFiles: [],
  };
}

describe('Auth integration generators', () => {
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

  it('convex auth uses patch file names in patch mode when files exist', async () => {
    const existsSpy = vi.spyOn(fs, 'existsSync').mockImplementation((path: fs.PathLike) => {
      const value = String(path);
      return value === 'src/routes/__root.tsx' || value === 'src/routes/router.tsx' || value === 'vite.config.ts';
    });

    const result = await generateConvexAuth(createArgs('patch'));

    expect(result.isOk()).toBe(true);
    expect(existsSpy).toHaveBeenCalled();
    expect(successSpy).toHaveBeenCalledWith('Generated src/routes/__root.convex-auth.patch.tsx');
    expect(successSpy).toHaveBeenCalledWith('Generated src/routes/router.convex-auth.patch.tsx');
    expect(successSpy).toHaveBeenCalledWith('Generated vite.convex-auth.patch.ts');
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('Patch mode enabled: existing root/router/vite files are preserved')
    );
  });

  it('spacetime auth uses patch file names in patch mode when files exist', async () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((path: fs.PathLike) => {
      const value = String(path);
      return value === 'src/routes/__root.tsx' || value === 'src/routes/router.tsx';
    });

    const result = await generateSpacetimeAuth(createArgs('patch'));

    expect(result.isOk()).toBe(true);
    expect(successSpy).toHaveBeenCalledWith('Generated src/routes/__root.spacetime-auth.patch.tsx');
    expect(successSpy).toHaveBeenCalledWith('Generated src/routes/router.spacetime-auth.patch.tsx');
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('Patch mode enabled: existing root/router files are preserved')
    );
  });

  it('spacetime auth writes normal route files in scaffold mode', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    const result = await generateSpacetimeAuth(createArgs('scaffold'));

    expect(result.isOk()).toBe(true);
    expect(successSpy).toHaveBeenCalledWith('Generated src/routes/__root.tsx');
    expect(successSpy).toHaveBeenCalledWith('Generated src/routes/router.tsx');
  });
});
