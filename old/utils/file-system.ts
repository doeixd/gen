/**
 * File System Utilities with Neverthrow Error Handling
 *
 * Provides safe file system operations with comprehensive error handling
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Result, ok, err } from 'neverthrow';
import { FileSystemError, GeneratorErrorCode } from './errors';
import { logger } from './logger';

/**
 * Options for file operations
 */
export interface FileOptions {
  /**
   * Create parent directories if they don't exist
   */
  recursive?: boolean;

  /**
   * Backup existing file before writing
   */
  backup?: boolean;

  /**
   * Dry run - don't actually write files
   */
  dryRun?: boolean;

  /**
   * Overwrite existing files
   */
  overwrite?: boolean;
}

/**
 * File metadata
 */
export interface FileMetadata {
  path: string;
  size: number;
  created: Date;
  modified: Date;
  hash: string;
}

/**
 * Check if file exists
 */
export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Read file with error handling
 */
export function readFile(filePath: string): Result<string, FileSystemError> {
  try {
    if (!fs.existsSync(filePath)) {
      return err(
        new FileSystemError(
          GeneratorErrorCode.FILE_NOT_FOUND,
          filePath,
          `File not found: ${filePath}`
        )
      );
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    logger.debug(`Read file: ${filePath} (${content.length} bytes)`);
    return ok(content);
  } catch (error) {
    return err(
      new FileSystemError(
        GeneratorErrorCode.FILE_READ_ERROR,
        filePath,
        `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Write file with error handling and options
 */
export function writeFile(
  filePath: string,
  content: string,
  options: FileOptions = {}
): Result<void, FileSystemError> {
  try {
    const {
      recursive = true,
      backup = false,
      dryRun = false,
      overwrite = true,
    } = options;

    // Check if file exists
    const exists = fs.existsSync(filePath);

    if (exists && !overwrite) {
      return err(
        new FileSystemError(
          GeneratorErrorCode.FILE_WRITE_ERROR,
          filePath,
          `File already exists and overwrite is disabled: ${filePath}`
        )
      );
    }

    if (dryRun) {
      logger.info(`[DRY RUN] Would write file: ${filePath} (${content.length} bytes)`);
      return ok(undefined);
    }

    // Create parent directories
    if (recursive) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.debug(`Created directory: ${dir}`);
      }
    }

    // Backup existing file
    if (backup && exists) {
      const backupResult = backupFile(filePath);
      if (backupResult.isErr()) {
        logger.warn(`Failed to create backup: ${backupResult.error.message}`);
      } else {
        logger.debug(`Created backup: ${backupResult.value}`);
      }
    }

    // Write file
    fs.writeFileSync(filePath, content, 'utf-8');
    logger.debug(`Wrote file: ${filePath} (${content.length} bytes)`);

    if (exists) {
      logger.addFileModified(filePath);
    } else {
      logger.addFileCreated(filePath);
    }

    return ok(undefined);
  } catch (error) {
    return err(
      new FileSystemError(
        GeneratorErrorCode.FILE_WRITE_ERROR,
        filePath,
        `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Create backup of file
 */
export function backupFile(filePath: string): Result<string, FileSystemError> {
  try {
    if (!fs.existsSync(filePath)) {
      return err(
        new FileSystemError(
          GeneratorErrorCode.FILE_NOT_FOUND,
          filePath,
          `Cannot backup non-existent file: ${filePath}`
        )
      );
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const dir = path.dirname(filePath);
    const backupPath = path.join(dir, `${base}.backup-${timestamp}${ext}`);

    fs.copyFileSync(filePath, backupPath);
    return ok(backupPath);
  } catch (error) {
    return err(
      new FileSystemError(
        GeneratorErrorCode.FILE_WRITE_ERROR,
        filePath,
        `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Get file metadata
 */
export function getFileMetadata(filePath: string): Result<FileMetadata, FileSystemError> {
  try {
    if (!fs.existsSync(filePath)) {
      return err(
        new FileSystemError(
          GeneratorErrorCode.FILE_NOT_FOUND,
          filePath,
          `File not found: ${filePath}`
        )
      );
    }

    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const hash = crypto.createHash('md5').update(content).digest('hex');

    return ok({
      path: filePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      hash,
    });
  } catch (error) {
    return err(
      new FileSystemError(
        GeneratorErrorCode.FILE_READ_ERROR,
        filePath,
        `Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Ensure directory exists
 */
export function ensureDirectory(dirPath: string): Result<void, FileSystemError> {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.debug(`Created directory: ${dirPath}`);
    }
    return ok(undefined);
  } catch (error) {
    return err(
      new FileSystemError(
        GeneratorErrorCode.DIRECTORY_CREATE_ERROR,
        dirPath,
        `Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Delete file with error handling
 */
export function deleteFile(filePath: string): Result<void, FileSystemError> {
  try {
    if (!fs.existsSync(filePath)) {
      return ok(undefined); // Already deleted
    }

    fs.unlinkSync(filePath);
    logger.debug(`Deleted file: ${filePath}`);
    return ok(undefined);
  } catch (error) {
    return err(
      new FileSystemError(
        GeneratorErrorCode.FILE_WRITE_ERROR,
        filePath,
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * List files in directory with pattern
 */
export function listFiles(
  dirPath: string,
  pattern?: RegExp
): Result<string[], FileSystemError> {
  try {
    if (!fs.existsSync(dirPath)) {
      return err(
        new FileSystemError(
          GeneratorErrorCode.FILE_NOT_FOUND,
          dirPath,
          `Directory not found: ${dirPath}`
        )
      );
    }

    const files = fs.readdirSync(dirPath);
    const filtered = pattern
      ? files.filter(f => pattern.test(f))
      : files;

    const fullPaths = filtered.map(f => path.join(dirPath, f));
    return ok(fullPaths);
  } catch (error) {
    return err(
      new FileSystemError(
        GeneratorErrorCode.FILE_READ_ERROR,
        dirPath,
        `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Copy file with error handling
 */
export function copyFile(
  sourcePath: string,
  destPath: string,
  options: FileOptions = {}
): Result<void, FileSystemError> {
  try {
    if (!fs.existsSync(sourcePath)) {
      return err(
        new FileSystemError(
          GeneratorErrorCode.FILE_NOT_FOUND,
          sourcePath,
          `Source file not found: ${sourcePath}`
        )
      );
    }

    const { recursive = true, overwrite = true, dryRun = false } = options;

    if (fs.existsSync(destPath) && !overwrite) {
      return err(
        new FileSystemError(
          GeneratorErrorCode.FILE_WRITE_ERROR,
          destPath,
          `Destination file already exists: ${destPath}`
        )
      );
    }

    if (dryRun) {
      logger.info(`[DRY RUN] Would copy file: ${sourcePath} -> ${destPath}`);
      return ok(undefined);
    }

    if (recursive) {
      const dir = path.dirname(destPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    fs.copyFileSync(sourcePath, destPath);
    logger.debug(`Copied file: ${sourcePath} -> ${destPath}`);
    logger.addFileCreated(destPath);

    return ok(undefined);
  } catch (error) {
    return err(
      new FileSystemError(
        GeneratorErrorCode.FILE_WRITE_ERROR,
        destPath,
        `Failed to copy file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Compare two files
 */
export function compareFiles(
  path1: string,
  path2: string
): Result<boolean, FileSystemError> {
  const meta1Result = getFileMetadata(path1);
  if (meta1Result.isErr()) return err(meta1Result.error);

  const meta2Result = getFileMetadata(path2);
  if (meta2Result.isErr()) return err(meta2Result.error);

  return ok(meta1Result.value.hash === meta2Result.value.hash);
}

/**
 * Get relative path from one file to another
 */
export function getRelativePath(from: string, to: string): string {
  return path.relative(path.dirname(from), to);
}

/**
 * Normalize path separators for current platform
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath);
}

/**
 * Get file extension
 */
export function getExtension(filePath: string): string {
  return path.extname(filePath);
}

/**
 * Change file extension
 */
export function changeExtension(filePath: string, newExt: string): string {
  const parsed = path.parse(filePath);
  return path.join(parsed.dir, parsed.name + newExt);
}
