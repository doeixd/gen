/**
 * Comprehensive Logging System for Code Generators
 *
 * Provides structured logging with multiple levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export interface GenerationReport {
  startTime: number;
  endTime?: number;
  duration?: number;
  tablesProcessed: number;
  fieldsGenerated: number;
  filesCreated: string[];
  filesModified: string[];
  warnings: Array<{ message: string; context?: Record<string, unknown> }>;
  errors: Array<{ message: string; code?: string; context?: Record<string, unknown> }>;
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private report: GenerationReport = {
    startTime: Date.now(),
    tablesProcessed: 0,
    fieldsGenerated: 0,
    filesCreated: [],
    filesModified: [],
    warnings: [],
    errors: [],
  };

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  startGeneration(): void {
    this.report = {
      startTime: Date.now(),
      tablesProcessed: 0,
      fieldsGenerated: 0,
      filesCreated: [],
      filesModified: [],
      warnings: [],
      errors: [],
    };
  }

  endGeneration(): GenerationReport {
    this.report.endTime = Date.now();
    this.report.duration = this.report.endTime - this.report.startTime;
    return this.report;
  }

  getReport(): GenerationReport {
    return { ...this.report };
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`🐛 ${message}`, context ? context : '');
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`ℹ️  ${message}`, context ? context : '');
    }
  }

  success(message: string, context?: Record<string, unknown>): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`✓ ${message}`, context ? context : '');
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`⚠️  ${message}`, context ? context : '');
    }
    this.report.warnings.push({ message, context });
  }

  error(message: string, code?: string, context?: Record<string, unknown>): void {
    if (this.level <= LogLevel.ERROR) {
      const prefix = code ? `[${code}]` : '';
      console.error(`❌ ${prefix} ${message}`, context ? context : '');
    }
    this.report.errors.push({ message, code, context });
  }

  section(title: string): void {
    if (this.level <= LogLevel.INFO) {
      console.log('\n' + '━'.repeat(60));
      console.log(title);
      console.log('━'.repeat(60) + '\n');
    }
  }

  subsection(title: string): void {
    if (this.level <= LogLevel.INFO) {
      console.log('\n' + '─'.repeat(40));
      console.log(title);
      console.log('─'.repeat(40));
    }
  }

  incrementTables(): void {
    this.report.tablesProcessed++;
  }

  incrementFields(count: number = 1): void {
    this.report.fieldsGenerated += count;
  }

  addFileCreated(filePath: string): void {
    this.report.filesCreated.push(filePath);
  }

  addFileModified(filePath: string): void {
    this.report.filesModified.push(filePath);
  }

  printReport(): void {
    if (this.level >= LogLevel.SILENT) return;

    const report = this.getReport();
    const duration = report.duration ? `${report.duration}ms` : 'N/A';

    console.log('\n' + '━'.repeat(60));
    console.log('📊 Generation Report');
    console.log('━'.repeat(60));
    console.log(`⏱️  Duration: ${duration}`);
    console.log(`📦 Tables Processed: ${report.tablesProcessed}`);
    console.log(`📝 Fields Generated: ${report.fieldsGenerated}`);
    console.log(`📄 Files Created: ${report.filesCreated.length}`);
    console.log(`📝 Files Modified: ${report.filesModified.length}`);

    if (report.warnings.length > 0) {
      console.log(`⚠️  Warnings: ${report.warnings.length}`);
      report.warnings.forEach((w, i) => {
        console.log(`   ${i + 1}. ${w.message}`);
      });
    }

    if (report.errors.length > 0) {
      console.log(`❌ Errors: ${report.errors.length}`);
      report.errors.forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.code ? `[${e.code}]` : ''} ${e.message}`);
      });
    }

    if (report.errors.length === 0 && report.warnings.length === 0) {
      console.log('✨ Generation completed successfully!');
    }

    console.log('━'.repeat(60) + '\n');
  }
}

export const logger = new Logger();
