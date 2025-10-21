/**
 * Logging utilities
 */

import { GeneratorError } from './errors'

export interface LoggerStats {
  tablesProcessed: number
  filesGenerated: number
  errors: number
  warnings: number
}

class Logger {
  private level: 'error' | 'warn' | 'info' | 'debug' = 'info'
  private stats: LoggerStats = {
    tablesProcessed: 0,
    filesGenerated: 0,
    errors: 0,
    warnings: 0
  }
  private startTime: number = 0

  setLevel(level: 'error' | 'warn' | 'info' | 'debug') {
    this.level = level
  }

  startGeneration() {
    this.startTime = Date.now()
    this.stats = { tablesProcessed: 0, filesGenerated: 0, errors: 0, warnings: 0 }
  }

  endGeneration() {
    const duration = Date.now() - this.startTime
    console.log(`\n✅ Generation completed in ${duration}ms`)
  }

  printReport() {
    console.log('\n📊 Generation Report:')
    console.log(`   Tables processed: ${this.stats.tablesProcessed}`)
    console.log(`   Files generated: ${this.stats.filesGenerated}`)
    console.log(`   Errors: ${this.stats.errors}`)
    console.log(`   Warnings: ${this.stats.warnings}`)
  }

  incrementTables() {
    this.stats.tablesProcessed++
  }

  section(message: string) {
    console.log(`\n${message}`)
  }

  subsection(message: string) {
    console.log(`  ${message}`)
  }

  success(message: string, details?: Record<string, any>) {
    console.log(`  ✅ ${message}`)
    if (details && this.level === 'debug') {
      console.log(`     ${JSON.stringify(details, null, 2)}`)
    }
  }

  error(message: string, code?: string, details?: Record<string, any>) {
    this.stats.errors++
    console.error(`  ❌ ${message}${code ? ` (${code})` : ''}`)
    if (details && this.level === 'debug') {
      console.error(`     ${JSON.stringify(details, null, 2)}`)
    }
  }

  warn(message: string, code?: string, details?: Record<string, any>) {
    this.stats.warnings++
    console.warn(`  ⚠️  ${message}${code ? ` (${code})` : ''}`)
    if (details && this.level === 'debug') {
      console.warn(`     ${JSON.stringify(details, null, 2)}`)
    }
  }

  info(message: string, details?: Record<string, any>) {
    if (this.level === 'info' || this.level === 'debug') {
      console.log(`  ℹ️  ${message}`)
      if (details && this.level === 'debug') {
        console.log(`     ${JSON.stringify(details, null, 2)}`)
      }
    }
  }

  debug(message: string, details?: Record<string, any>) {
    if (this.level === 'debug') {
      console.log(`  🔍 ${message}`)
      if (details) {
        console.log(`     ${JSON.stringify(details, null, 2)}`)
      }
    }
  }

  trackAction(action: string, data?: Record<string, any>) {
    this.debug(`Action: ${action}`, data)
  }

  time(label: string): () => void {
    const start = Date.now()
    return () => {
      const duration = Date.now() - start
      this.debug(`Timer ${label}: ${duration}ms`)
    }
  }

  logAppError(error: GeneratorError, context?: string) {
    this.error(`${context || 'Application error'}: ${error.message}`, error.code, {
      details: error.details,
      cause: error.cause?.message
    })
  }
}

export const logger = new Logger()