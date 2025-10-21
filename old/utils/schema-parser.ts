/**
 * Robust Schema Parser with Neverthrow Error Handling
 *
 * Handles complex nested types, proper bracket matching, and comprehensive validation
 */

import fs from 'fs';
import { Result, ok, err } from 'neverthrow';
import type { FieldMapping } from '../field-mappings.config';
import {
  GeneratorError,
  GeneratorErrorCode,
  FileSystemError,
  SchemaParseError,
  ValidationError,
  isValidIdentifier,
  isReservedKeyword,
  fromError,
} from './errors';
import { logger } from './logger';

/**
 * Parsed Convex type information
 */
export interface ParsedConvexType {
  raw: string;
  baseType: string;
  isOptional: boolean;
  isArray: boolean;
  idTable?: string;
  unionTypes?: ParsedConvexType[];
  objectFields?: Record<string, ParsedConvexType>;
  arrayItemType?: ParsedConvexType;
}

/**
 * Parsed field information
 */
export interface ParsedField {
  name: string;
  type: string;
  typeExpression: string;
  isOptional: boolean;
  isArray: boolean;
  parsedType: ParsedConvexType;
  config: FieldMapping;
}

/**
 * Parsed table information
 */
export interface ParsedTable {
  name: string;
  fields: ParsedField[];
  indexes: string[];
}

/**
 * Read schema file with error handling
 */
export function readSchemaFile(schemaPath: string): Result<string, FileSystemError> {
  try {
    if (!fs.existsSync(schemaPath)) {
      return err(
        new FileSystemError(
          GeneratorErrorCode.FILE_NOT_FOUND,
          schemaPath,
          `Schema file not found: ${schemaPath}`
        )
      );
    }

    const content = fs.readFileSync(schemaPath, 'utf-8');

    if (!content.trim()) {
      return err(
        new FileSystemError(
          GeneratorErrorCode.FILE_READ_ERROR,
          schemaPath,
          'Schema file is empty'
        )
      );
    }

    return ok(content);
  } catch (error) {
    return err(
      new FileSystemError(
        GeneratorErrorCode.FILE_READ_ERROR,
        schemaPath,
        `Failed to read schema file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Clean schema content by removing comments
 */
function cleanSchemaContent(content: string): string {
  // Remove multi-line comments
  let cleaned = content.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove single-line comments while preserving string content
  const lines = cleaned.split('\n');
  cleaned = lines
    .map(line => {
      // Find comment start, but ignore if it's inside a string
      let inString = false;
      let stringChar: string | null = null;
      let commentStart = -1;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const prevChar = i > 0 ? line[i - 1] : '';

        // Track string boundaries
        if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
            stringChar = null;
          }
        }

        // Find comment start outside strings
        if (!inString && char === '/' && i + 1 < line.length && line[i + 1] === '/') {
          commentStart = i;
          break;
        }
      }

      if (commentStart >= 0) {
        return line.substring(0, commentStart);
      }
      return line;
    })
    .join('\n');

  return cleaned;
}

/**
 * Extract balanced content between braces
 * Handles nested structures correctly
 */
function extractBalancedBraces(content: string, startIndex: number): Result<string, SchemaParseError> {
  let braceCount = 0;
  let startBrace = -1;

  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];

    if (char === '{') {
      if (braceCount === 0) {
        startBrace = i;
      }
      braceCount++;
    } else if (char === '}') {
      braceCount--;

      if (braceCount === 0) {
        return ok(content.substring(startBrace + 1, i));
      } else if (braceCount < 0) {
        return err(
          new SchemaParseError(
            GeneratorErrorCode.INVALID_SCHEMA_SYNTAX,
            undefined,
            undefined,
            'Unmatched closing brace in schema'
          )
        );
      }
    }
  }

  if (braceCount > 0) {
    return err(
      new SchemaParseError(
        GeneratorErrorCode.INVALID_SCHEMA_SYNTAX,
        undefined,
        undefined,
        'Unclosed braces in schema'
      )
    );
  }

  return err(
    new SchemaParseError(
      GeneratorErrorCode.SCHEMA_PARSE_ERROR,
      undefined,
      undefined,
      'Failed to extract balanced braces'
    )
  );
}

/**
 * Parse a Convex type expression recursively
 * Handles complex nested types correctly
 */
export function parseConvexType(typeStr: string): Result<ParsedConvexType, SchemaParseError> {
  try {
    typeStr = typeStr.trim();

    if (!typeStr) {
      return err(
        new SchemaParseError(
          GeneratorErrorCode.TYPE_PARSE_ERROR,
          undefined,
          undefined,
          'Empty type expression'
        )
      );
    }

    // Handle optional types
    const optionalMatch = typeStr.match(/^v\.optional\((.*)\)$/);
    if (optionalMatch) {
      const innerResult = parseConvexType(optionalMatch[1]);
      return innerResult.map(innerType => ({
        ...innerType,
        raw: typeStr,
        isOptional: true,
      }));
    }

    // Handle array types
    const arrayMatch = typeStr.match(/^v\.array\((.*)\)$/);
    if (arrayMatch) {
      const innerResult = parseConvexType(arrayMatch[1]);
      return innerResult.map(innerType => ({
        raw: typeStr,
        baseType: 'array',
        isArray: true,
        isOptional: false,
        arrayItemType: innerType,
      }));
    }

    // Handle ID references
    const idMatch = typeStr.match(/^v\.id\(['"](\w+)['"]\)$/);
    if (idMatch) {
      return ok({
        raw: typeStr,
        baseType: 'id',
        isOptional: false,
        isArray: false,
        idTable: idMatch[1],
      });
    }

    // Handle union types
    const unionMatch = typeStr.match(/^v\.union\((.*)\)$/);
    if (unionMatch) {
      // Split by commas at the top level only
      const types = splitByTopLevelCommas(unionMatch[1]);
      const parsedTypes: ParsedConvexType[] = [];

      for (const type of types) {
        const result = parseConvexType(type);
        if (result.isErr()) return err(result.error);
        parsedTypes.push(result.value);
      }

      return ok({
        raw: typeStr,
        baseType: 'union',
        isOptional: false,
        isArray: false,
        unionTypes: parsedTypes,
      });
    }

    // Handle object types
    const objectMatch = typeStr.match(/^v\.object\(\{(.*)\}\)$/s);
    if (objectMatch) {
      const fieldsStr = objectMatch[1];
      const fields: Record<string, ParsedConvexType> = {};

      // Parse object fields
      const fieldPairs = splitByTopLevelCommas(fieldsStr);
      for (const pair of fieldPairs) {
        const colonIndex = pair.indexOf(':');
        if (colonIndex === -1) continue;

        const fieldName = pair.substring(0, colonIndex).trim();
        const fieldType = pair.substring(colonIndex + 1).trim();

        const typeResult = parseConvexType(fieldType);
        if (typeResult.isErr()) return err(typeResult.error);

        fields[fieldName] = typeResult.value;
      }

      return ok({
        raw: typeStr,
        baseType: 'object',
        isOptional: false,
        isArray: false,
        objectFields: fields,
      });
    }

    // Handle simple types
    const simpleMatch = typeStr.match(/^v\.(\w+)\(\)$/);
    if (simpleMatch) {
      const baseType = simpleMatch[1];
      return ok({
        raw: typeStr,
        baseType,
        isOptional: false,
        isArray: false,
      });
    }

    // Unsupported or invalid type
    logger.warn(`Unknown type expression: ${typeStr}`);
    return ok({
      raw: typeStr,
      baseType: 'any',
      isOptional: false,
      isArray: false,
    });
  } catch (error) {
    return err(
      new SchemaParseError(
        GeneratorErrorCode.TYPE_PARSE_ERROR,
        undefined,
        undefined,
        `Failed to parse type: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Split string by commas at top level only (respecting nested brackets/parens)
 */
function splitByTopLevelCommas(str: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar: string | null = null;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const prevChar = i > 0 ? str[i - 1] : '';

    // Track string boundaries
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = null;
      }
    }

    if (!inString) {
      if (char === '(' || char === '{' || char === '[') {
        depth++;
      } else if (char === ')' || char === '}' || char === ']') {
        depth--;
      }
    }

    if (char === ',' && depth === 0 && !inString) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

/**
 * Validate table name
 */
function validateTableName(tableName: string): Result<void, ValidationError> {
  if (!isValidIdentifier(tableName)) {
    return err(
      new ValidationError(
        GeneratorErrorCode.INVALID_TABLE_NAME,
        tableName,
        `Invalid table name: "${tableName}". Must be a valid JavaScript identifier.`,
        ['Use only letters, numbers, $, and _', 'Must start with letter, $, or _', 'Cannot be a reserved keyword']
      )
    );
  }

  return ok(undefined);
}

/**
 * Validate field name
 */
function validateFieldName(fieldName: string, tableName: string): Result<void, ValidationError> {
  if (!isValidIdentifier(fieldName)) {
    return err(
      new ValidationError(
        GeneratorErrorCode.INVALID_FIELD_NAME,
        fieldName,
        `Invalid field name: "${fieldName}" in table "${tableName}". Must be a valid JavaScript identifier.`,
        ['Use only letters, numbers, $, and _', 'Must start with letter, $, or _', 'Cannot be a reserved keyword']
      )
    );
  }

  if (isReservedKeyword(fieldName)) {
    return err(
      new ValidationError(
        GeneratorErrorCode.RESERVED_KEYWORD,
        fieldName,
        `Field name "${fieldName}" in table "${tableName}" is a reserved JavaScript keyword.`,
        [`Rename field to "${fieldName}_field"`, `Use a different name`]
      )
    );
  }

  return ok(undefined);
}

/**
 * Parse schema content into tables
 */
export function parseSchema(
  schemaContent: string,
  resolveFieldConfig: (tableName: string, fieldName: string, fieldType: string, isOptional: boolean) => FieldMapping
): Result<Map<string, ParsedTable>, SchemaParseError> {
  try {
    const tables = new Map<string, ParsedTable>();
    const cleaned = cleanSchemaContent(schemaContent);

    // Find defineSchema block
    const schemaMatch = cleaned.match(/defineSchema\(\{([\s\S]*)\}\)/);
    if (!schemaMatch) {
      return err(
        new SchemaParseError(
          GeneratorErrorCode.SCHEMA_PARSE_ERROR,
          undefined,
          undefined,
          'Could not find defineSchema(...) in schema file'
        )
      );
    }

    const schemaBody = schemaMatch[1];

    // Find each table definition
    const tableRegex = /(\w+):\s*defineTable\s*\(/g;
    let match;

    while ((match = tableRegex.exec(schemaBody)) !== null) {
      const tableName = match[1];
      const tableStartIndex = match.index + match[0].length;

      // Validate table name
      const validationResult = validateTableName(tableName);
      if (validationResult.isErr()) {
        logger.warn(validationResult.error.format());
        continue;
      }

      // Extract table definition using balanced brace matching
      const fieldsResult = extractBalancedBraces(schemaBody, tableStartIndex - 1);
      if (fieldsResult.isErr()) {
        logger.error(`Failed to parse table ${tableName}`, fieldsResult.error.code);
        continue;
      }

      const fieldsBlock = fieldsResult.value;

      // Parse fields
      const fields: ParsedField[] = [];
      const fieldLines = fieldsBlock
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && l.length > 0);

      for (const line of fieldLines) {
        // Match field definition
        const fieldMatch = line.match(/^(\w+):\s*(v\.[^,]+?)(?:,\s*)?$/);
        if (!fieldMatch) continue;

        const fieldName = fieldMatch[1];
        const typeExpression = fieldMatch[2].trim();

        // Validate field name
        const fieldValidation = validateFieldName(fieldName, tableName);
        if (fieldValidation.isErr()) {
          logger.warn(fieldValidation.error.format());
          continue;
        }

        // Parse type
        const typeResult = parseConvexType(typeExpression);
        if (typeResult.isErr()) {
          logger.error(`Failed to parse type for ${tableName}.${fieldName}`, typeResult.error.code);
          continue;
        }

        const parsedType = typeResult.value;

        // Resolve field configuration
        const fieldConfig = resolveFieldConfig(
          tableName,
          fieldName,
          parsedType.baseType,
          parsedType.isOptional
        );

        fields.push({
          name: fieldName,
          type: parsedType.baseType,
          typeExpression: parsedType.raw,
          isOptional: parsedType.isOptional,
          isArray: parsedType.isArray,
          parsedType,
          config: fieldConfig,
        });

        logger.incrementFields();
      }

      // Extract indexes (basic parsing)
      const indexMatches = [...schemaBody.matchAll(/\.index\(['"]([^'"]+)['"]/g)];
      const indexes = indexMatches.map(m => m[1]);

      if (fields.length > 0) {
        tables.set(tableName, {
          name: tableName,
          fields,
          indexes,
        });
        logger.incrementTables();
      }
    }

    if (tables.size === 0) {
      return err(
        new SchemaParseError(
          GeneratorErrorCode.NO_TABLES_FOUND,
          undefined,
          undefined,
          'No tables found in schema'
        )
      );
    }

    return ok(tables);
  } catch (error) {
    return err(
      new SchemaParseError(
        GeneratorErrorCode.SCHEMA_PARSE_ERROR,
        undefined,
        undefined,
        `Failed to parse schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      )
    );
  }
}
