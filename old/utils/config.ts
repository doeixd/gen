/**
 * Generator Configuration Management
 *
 * Centralized configuration for all generators with validation
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { Result, ok, err } from 'neverthrow';
import { GeneratorError, GeneratorErrorCode } from './errors';
import { LogLevel } from './logger';

/**
 * Generation mode
 */
export enum GenerationMode {
  /**
   * Generate all tables and files
   */
  FULL = 'full',

  /**
   * Only generate files that don't exist
   */
  INCREMENTAL = 'incremental',

  /**
   * Only generate specific tables
   */
  SELECTIVE = 'selective',

  /**
   * Show what would be generated without writing files
   */
  DRY_RUN = 'dry-run',
}

/**
 * Generator type
 */
export enum GeneratorType {
  CONVEX = 'convex',
  FORMS = 'forms',
  CRUD = 'crud',
  ALL = 'all',
}

/**
 * Generator configuration
 */
export interface GeneratorConfig {
  /**
   * Generation mode
   */
  mode: GenerationMode;

  /**
   * Log level
   */
  logLevel: LogLevel;

  /**
   * Dry run - don't write files
   */
  dryRun: boolean;

  /**
   * Create backups before overwriting
   */
  createBackups: boolean;

  /**
   * Overwrite existing files
   */
  overwrite: boolean;

  /**
   * Tables to generate (for selective mode)
   */
  tables?: string[];

  /**
   * Skip specific tables
   */
  skipTables?: string[];

  /**
   * Output directories
   */
  paths: {
    root: string;
    convex: string;
    schema: string;
    forms: string;
    routes: string;
    collections: string;
  };

  /**
   * File options
   */
  files: {
    /**
     * File extension for TypeScript files
     */
    extension: 'ts' | 'tsx';

    /**
     * Add file headers
     */
    addHeaders: boolean;

    /**
     * Format code after generation
     */
    format: boolean;

    /**
     * Add eslint disable comments
     */
    disableEslint: boolean;
  };

  /**
   * Code generation options
   */
  codegen: {
    /**
     * Include error messages in validators
     */
    includeErrorMessages: boolean;

    /**
     * Use StandardSchema when available
     */
    useStandardSchema: boolean;

    /**
     * Add JSDoc comments
     */
    addJsDocs: boolean;

    /**
     * Add inline comments
     */
    addComments: boolean;
  };

  /**
   * Feature flags
   */
  features: {
    /**
     * Generate loading states
     */
    generateLoadingStates: boolean;

    /**
     * Generate error boundaries
     */
    generateErrorBoundaries: boolean;

    /**
     * Generate optimistic updates
     */
    generateOptimisticUpdates: boolean;

    /**
     * Generate form validation
     */
    generateValidation: boolean;

    /**
     * Generate tests
     */
    generateTests: boolean;
  };
}

/**
 * Default configuration
 */
const DEFAULT_ROOT = process.cwd();

export const DEFAULT_CONFIG: GeneratorConfig = {
  mode: GenerationMode.FULL,
  logLevel: LogLevel.INFO,
  dryRun: false,
  createBackups: false,
  overwrite: true,
  paths: {
    root: DEFAULT_ROOT,
    convex: path.join(DEFAULT_ROOT, 'convex'),
    schema: path.join(DEFAULT_ROOT, 'convex', 'schema.ts'),
    forms: path.join(DEFAULT_ROOT, 'src', 'components', 'forms'),
    routes: path.join(DEFAULT_ROOT, 'src', 'routes'),
    collections: path.join(DEFAULT_ROOT, 'src', 'lib', 'collections.ts'),
  },
  files: {
    extension: 'tsx',
    addHeaders: true,
    format: false,
    disableEslint: false,
  },
  codegen: {
    includeErrorMessages: true,
    useStandardSchema: false,
    addJsDocs: true,
    addComments: true,
  },
  features: {
    generateLoadingStates: true,
    generateErrorBoundaries: true,
    generateOptimisticUpdates: true,
    generateValidation: true,
    generateTests: false,
  },
};

/**
 * Parse CLI arguments into config
 */
export function parseCliArgs(args: string[]): Partial<GeneratorConfig> {
  const config: Partial<GeneratorConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--dry-run':
      case '-d':
        config.dryRun = true;
        config.mode = GenerationMode.DRY_RUN;
        break;

      case '--incremental':
      case '-i':
        config.mode = GenerationMode.INCREMENTAL;
        break;

      case '--table':
      case '-t':
        if (!config.tables) config.tables = [];
        if (i + 1 < args.length) {
          config.tables.push(args[++i]);
        }
        config.mode = GenerationMode.SELECTIVE;
        break;

      case '--skip':
      case '-s':
        if (!config.skipTables) config.skipTables = [];
        if (i + 1 < args.length) {
          config.skipTables.push(args[++i]);
        }
        break;

      case '--backup':
      case '-b':
        config.createBackups = true;
        break;

      case '--no-overwrite':
        config.overwrite = false;
        break;

      case '--verbose':
      case '-v':
        config.logLevel = LogLevel.DEBUG;
        break;

      case '--quiet':
      case '-q':
        config.logLevel = LogLevel.WARN;
        break;

      case '--silent':
        config.logLevel = LogLevel.SILENT;
        break;

      case '--no-validation':
        if (!config.features) config.features = { ...DEFAULT_CONFIG.features };
        config.features.generateValidation = false;
        break;

      case '--with-tests':
        if (!config.features) config.features = { ...DEFAULT_CONFIG.features };
        config.features.generateTests = true;
        break;

      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return config;
}

/**
 * Merge configurations
 */
export function mergeConfig(
  base: GeneratorConfig,
  override: Partial<GeneratorConfig>
): GeneratorConfig {
  return {
    ...base,
    ...override,
    paths: { ...base.paths, ...override.paths },
    files: { ...base.files, ...override.files },
    codegen: { ...base.codegen, ...override.codegen },
    features: { ...base.features, ...override.features },
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: GeneratorConfig): Result<void, GeneratorError> {
  // Validate paths exist
  if (!config.paths.schema) {
    return err(
      new GeneratorError(
        GeneratorErrorCode.INVALID_CONFIG,
        'Schema path is required'
      )
    );
  }

  // Validate mode
  if (!Object.values(GenerationMode).includes(config.mode)) {
    return err(
      new GeneratorError(
        GeneratorErrorCode.INVALID_CONFIG,
        `Invalid generation mode: ${config.mode}`
      )
    );
  }

  // Validate selective mode has tables
  if (config.mode === GenerationMode.SELECTIVE && (!config.tables || config.tables.length === 0)) {
    return err(
      new GeneratorError(
        GeneratorErrorCode.INVALID_CONFIG,
        'Selective mode requires at least one table to be specified'
      )
    );
  }

  return ok(undefined);
}

/**
 * Get current file directory (for ES modules)
 */
export function getCurrentDir(importMetaUrl: string): string {
  return path.dirname(fileURLToPath(importMetaUrl));
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
🚀 Code Generator CLI

Usage: npm run generate:<generator> [options]

Generators:
  generate:convex    Generate Convex CRUD functions
  generate:forms     Generate TanStack Form components
  generate:crud      Generate full CRUD routes
  generate:all       Generate everything

Options:
  -d, --dry-run           Show what would be generated without writing files
  -i, --incremental       Only generate files that don't exist
  -t, --table <name>      Generate only specified table (can be repeated)
  -s, --skip <name>       Skip specified table (can be repeated)
  -b, --backup            Create backups before overwriting files
  --no-overwrite          Don't overwrite existing files
  -v, --verbose           Enable verbose logging
  -q, --quiet             Only show warnings and errors
  --silent                No output except errors
  --no-validation         Don't generate validation code
  --with-tests            Generate test files
  -h, --help              Show this help message

Examples:
  npm run generate:crud -- --dry-run
  npm run generate:forms -- --table products --table todos
  npm run generate:all -- --incremental --backup
  npm run generate:crud -- --skip _migrations --verbose

Environment Variables:
  LOG_LEVEL=debug        Set log level (debug, info, warn, error, silent)
  DRY_RUN=true           Enable dry run mode
  `);
}

/**
 * Generate file header comment
 */
export function generateFileHeader(config: GeneratorConfig, description?: string): string {
  if (!config.files.addHeaders) return '';

  const timestamp = new Date().toISOString();

  return `/**
 * Auto-generated file - DO NOT EDIT DIRECTLY
 * Generated: ${timestamp}
 * ${description ? `\n * ${description}\n *` : ''}
 * To regenerate, run: npm run generate
 */

`;
}

/**
 * Add eslint disable comment
 */
export function addEslintDisable(config: GeneratorConfig): string {
  if (!config.files.disableEslint) return '';
  return '/* eslint-disable */\n';
}
