/**
 * Template utilities for code generation using tagged template functions
 */

/**
 * Tagged template function that processes template literals with proper indentation and line joining
 */
export function template(strings: TemplateStringsArray, ...values: any[]): string {
  let result = '';

  for (let i = 0; i < strings.length; i++) {
    // Add the string part
    result += strings[i];

    // Add the interpolated value if it exists
    if (i < values.length) {
      const value = values[i];

      // If it's an array, join with newlines (for conditional template parts)
      if (Array.isArray(value)) {
        result += value.filter(Boolean).join('\n');
      } else {
        result += String(value);
      }
    }
  }

  // Clean up excessive newlines and normalize indentation
  return result
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive empty lines
    .trim();
}

/**
 * Helper for conditional template inclusion
 */
export function conditional(condition: boolean, content: string): string {
  return condition ? content : '';
}

/**
 * Helper for mapping arrays to template content
 */
export function map<T>(items: T[], mapper: (item: T, index: number) => string): string {
  return items.map(mapper).join('\n');
}
