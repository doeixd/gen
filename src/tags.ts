/**
 * Tagged Template Functions for Syntax Highlighting
 *
 * These tagged template functions provide syntax highlighting for different
 * types of code templates by using special comment markers that VS Code
 * extensions can recognize.
 */

import { template as baseTemplate } from './templates/utils'

/**
 * Tagged template for HTML/JSX content
 * Provides syntax highlighting for HTML and JSX
 */
export function html(strings: TemplateStringsArray, ...values: any[]): string {
  return baseTemplate(strings, ...values)
}

/**
 * Tagged template for CSS content
 * Provides syntax highlighting for CSS
 */
export function css(strings: TemplateStringsArray, ...values: any[]): string {
  return baseTemplate(strings, ...values)
}

/**
 * Tagged template for TypeScript/JavaScript content
 * Provides syntax highlighting for TS/JS code
 */
export function ts(strings: TemplateStringsArray, ...values: any[]): string {
  return baseTemplate(strings, ...values)
}

/**
 * Tagged template for SQL content
 * Provides syntax highlighting for SQL
 */
export function sql(strings: TemplateStringsArray, ...values: any[]): string {
  return baseTemplate(strings, ...values)
}

/**
 * Tagged template for GraphQL content
 * Provides syntax highlighting for GraphQL
 */
export function gql(strings: TemplateStringsArray, ...values: any[]): string {
  return baseTemplate(strings, ...values)
}

/**
 * Tagged template for JSON content
 * Provides syntax highlighting for JSON
 */
export function json(strings: TemplateStringsArray, ...values: any[]): string {
  return baseTemplate(strings, ...values)
}

/**
 * Tagged template for YAML content
 * Provides syntax highlighting for YAML
 */
export function yaml(strings: TemplateStringsArray, ...values: any[]): string {
  return baseTemplate(strings, ...values)
}

/**
 * Tagged template for Markdown content
 * Provides syntax highlighting for Markdown
 */
export function md(strings: TemplateStringsArray, ...values: any[]): string {
  return baseTemplate(strings, ...values)
}

// Re-export utility functions for convenience
export { conditional, map } from './templates/utils'

/**
 * Enhanced template function with automatic language detection
 * Uses comment hints for syntax highlighting
 */
export function code(language: string) {
  return (strings: TemplateStringsArray, ...values: any[]): string => {
    // Add language hint as a comment for syntax highlighting
    const languageHint = `/* language: ${language} */`
    const result = baseTemplate(strings, ...values)
    return `${languageHint}\n${result}`
  }
}

/**
 * Pre-configured tagged templates for common languages
 */
export const templates = {
  // Web development
  html: html,
  css: css,
  js: ts,
  ts: ts,
  jsx: html,
  tsx: html,

  // Backend
  sql: sql,
  graphql: gql,

  // Data formats
  json: json,
  yaml: yaml,
  yml: yaml,

  // Documentation
  md: md,
  markdown: md,

  // Generic with language hints
  code: code,
} as const

/**
 * Type-safe template selector
 */
export type TemplateLanguage = keyof typeof templates

/**
 * Get a typed template function for a specific language
 */
export function getTemplate(language: TemplateLanguage) {
  return templates[language]
}
