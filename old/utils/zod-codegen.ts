/**
 * Robust Zod Code Generation with Neverthrow Error Handling
 *
 * Converts Zod validators to source code strings
 * Supports StandardSchema interface for future extensibility
 */

import { Result, ok, err } from 'neverthrow';
import { z } from 'zod';
import type { ParsedField } from './schema-parser';
import { GeneratorErrorCode, ZodError, fromError } from './errors';
import { logger } from './logger';

/**
 * Configuration for Zod code generation
 */
export interface ZodCodegenOptions {
  /**
   * Whether to include error messages in validators
   */
  includeErrorMessages?: boolean;

  /**
   * Custom type mappings for unsupported types
   */
  customTypeMappings?: Record<string, string>;

  /**
   * Whether to use StandardSchema when available
   */
  useStandardSchema?: boolean;
}

/**
 * Context for code generation
 */
interface CodegenContext {
  field: ParsedField;
  options: ZodCodegenOptions;
  visited: Set<string>; // Prevent infinite recursion
}

/**
 * Convert Zod validator to source code string with error handling
 */
export function zodToCode(
  field: ParsedField,
  options: ZodCodegenOptions = {}
): Result<string, ZodError> {
  const context: CodegenContext = {
    field,
    options: {
      includeErrorMessages: true,
      useStandardSchema: false,
      ...options,
    },
    visited: new Set(),
  };

  return zodTypeToCodeInternal(field.config.zodValidator, context);
}

/**
 * Internal recursive implementation
 */
function zodTypeToCodeInternal(
  validator: z.ZodType<any> | undefined,
  context: CodegenContext
): Result<string, ZodError> {
  try {
    if (!validator) {
      logger.warn(`No validator found for field ${context.field.name}, defaulting to z.any()`);
      return ok('z.any()');
    }

    // Prevent infinite recursion for circular references
    const typeKey = validator.constructor.name;
    if (context.visited.has(typeKey)) {
      logger.warn(`Circular reference detected for type ${typeKey}`);
      return ok('z.any()');
    }
    context.visited.add(typeKey);

    // Use StandardSchema interface if available and enabled
    if (context.options.useStandardSchema && '~standard' in validator) {
      logger.debug('Using StandardSchema interface');
      // Future: implement StandardSchema extraction
    }

    // Get type from Zod v4 internal structure
    // Note: This accesses private APIs and may break with Zod updates
    const def = (validator as any)._def || (validator as any).def;
    if (!def) {
      return err(
        new ZodError(
          GeneratorErrorCode.ZOD_EXTRACT_ERROR,
          validator.constructor.name,
          'Could not access validator definition'
        )
      );
    }

    const type = def.type || def.typeName;

    switch (type) {
      case 'string':
        return handleZodString(validator, context);

      case 'number':
        return handleZodNumber(validator, context);

      case 'boolean':
        return ok('z.boolean()');

      case 'date':
        return ok('z.date()');

      case 'bigint':
        return ok('z.bigint()');

      case 'symbol':
        return ok('z.symbol()');

      case 'undefined':
        return ok('z.undefined()');

      case 'null':
        return ok('z.null()');

      case 'void':
        return ok('z.void()');

      case 'any':
        return ok('z.any()');

      case 'unknown':
        return ok('z.unknown()');

      case 'never':
        return ok('z.never()');

      case 'array':
        return handleZodArray(validator, context);

      case 'object':
        return handleZodObject(validator, context);

      case 'union':
        return handleZodUnion(validator, context);

      case 'discriminated_union':
        return handleZodDiscriminatedUnion(validator, context);

      case 'intersection':
        return handleZodIntersection(validator, context);

      case 'tuple':
        return handleZodTuple(validator, context);

      case 'record':
        return handleZodRecord(validator, context);

      case 'map':
        return handleZodMap(validator, context);

      case 'set':
        return handleZodSet(validator, context);

      case 'function':
        return ok('z.function()');

      case 'lazy':
        return ok('z.lazy(() => z.any())');

      case 'literal':
        return handleZodLiteral(validator, context);

      case 'enum':
        return handleZodEnum(validator, context);

      case 'native_enum':
        return handleZodNativeEnum(validator, context);

      case 'promise':
        return handleZodPromise(validator, context);

      case 'branded':
        return handleZodBranded(validator, context);

      case 'pipeline':
        return handleZodPipeline(validator, context);

      case 'readonly':
        return handleZodReadonly(validator, context);

      case 'optional':
        return handleZodOptional(validator, context);

      case 'nullable':
        return handleZodNullable(validator, context);

      case 'default':
        return handleZodDefault(validator, context);

      case 'catch':
        return handleZodCatch(validator, context);

      default:
        // Check custom mappings
        if (context.options.customTypeMappings?.[type]) {
          return ok(context.options.customTypeMappings[type]);
        }

        logger.warn(`Unsupported Zod type: ${type}, falling back to z.any()`);
        return ok('z.any()');
    }
  } catch (error) {
    return err(
      new ZodError(
        GeneratorErrorCode.ZOD_CODEGEN_ERROR,
        validator?.constructor?.name || 'unknown',
        `Failed to generate Zod code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Handle ZodString type
 */
function handleZodString(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  let code = 'z.string()';
  const def = (validator as any)._def || (validator as any).def;
  const checks = def.checks || [];

  for (const check of checks) {
    const checkDef = check._zod?.def || check;

    switch (checkDef.check) {
      case 'min_length':
        code += `.min(${checkDef.minimum || checkDef.value}${checkDef.message ? `, "${escapeString(checkDef.message)}"` : ''})`;
        break;
      case 'max_length':
        code += `.max(${checkDef.maximum || checkDef.value}${checkDef.message ? `, "${escapeString(checkDef.message)}"` : ''})`;
        break;
      case 'length':
        code += `.length(${checkDef.value}${checkDef.message ? `, "${escapeString(checkDef.message)}"` : ''})`;
        break;
      case 'email':
        code += '.email()';
        break;
      case 'url':
        code += '.url()';
        break;
      case 'emoji':
        code += '.emoji()';
        break;
      case 'uuid':
        code += '.uuid()';
        break;
      case 'cuid':
        code += '.cuid()';
        break;
      case 'cuid2':
        code += '.cuid2()';
        break;
      case 'ulid':
        code += '.ulid()';
        break;
      case 'regex':
        if (checkDef.regex) {
          code += `.regex(${checkDef.regex.toString()}${checkDef.message ? `, "${escapeString(checkDef.message)}"` : ''})`;
        }
        break;
      case 'includes':
        code += `.includes("${escapeString(checkDef.value)}")`;
        break;
      case 'startsWith':
        code += `.startsWith("${escapeString(checkDef.value)}")`;
        break;
      case 'endsWith':
        code += `.endsWith("${escapeString(checkDef.value)}")`;
        break;
      case 'datetime':
        code += '.datetime()';
        break;
      case 'ip':
        code += '.ip()';
        break;
      default:
        logger.debug(`Unknown string check: ${checkDef.check}`);
    }
  }

  return ok(code);
}

/**
 * Handle ZodNumber type
 */
function handleZodNumber(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  let code = 'z.number()';
  const def = (validator as any)._def || (validator as any).def;
  const checks = def.checks || [];

  for (const check of checks) {
    const checkDef = check._zod?.def || check;

    switch (checkDef.check) {
      case 'min':
        code += `.min(${checkDef.minimum || checkDef.value}${checkDef.message ? `, "${escapeString(checkDef.message)}"` : ''})`;
        break;
      case 'max':
        code += `.max(${checkDef.maximum || checkDef.value}${checkDef.message ? `, "${escapeString(checkDef.message)}"` : ''})`;
        break;
      case 'greater_than':
        if (checkDef.value === 0 && checkDef.inclusive) {
          code += '.nonnegative()';
        } else if (checkDef.value === 0 && !checkDef.inclusive) {
          code += '.positive()';
        } else {
          code += checkDef.inclusive ? `.gte(${checkDef.value})` : `.gt(${checkDef.value})`;
        }
        break;
      case 'less_than':
        code += checkDef.inclusive ? `.lte(${checkDef.value})` : `.lt(${checkDef.value})`;
        break;
      case 'int':
        code += '.int()';
        break;
      case 'multipleOf':
        code += `.multipleOf(${checkDef.value}${checkDef.message ? `, "${escapeString(checkDef.message)}"` : ''})`;
        break;
      case 'finite':
        code += '.finite()';
        break;
      case 'safe':
        code += '.safe()';
        break;
      default:
        logger.debug(`Unknown number check: ${checkDef.check}`);
    }
  }

  return ok(code);
}

/**
 * Handle ZodArray type
 */
function handleZodArray(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  const def = (validator as any)._def || (validator as any).def;
  const innerType = def.items || def.type;

  if (!innerType) {
    return ok('z.array(z.any())');
  }

  const innerResult = zodTypeToCodeInternal(innerType, context);
  if (innerResult.isErr()) return err(innerResult.error);

  let code = `z.array(${innerResult.value})`;

  // Handle array length constraints
  if (def.minLength !== undefined) {
    code += `.min(${def.minLength.value})`;
  }
  if (def.maxLength !== undefined) {
    code += `.max(${def.maxLength.value})`;
  }
  if (def.exactLength !== undefined) {
    code += `.length(${def.exactLength.value})`;
  }

  return ok(code);
}

/**
 * Handle ZodObject type (simplified - won't generate full object schemas)
 */
function handleZodObject(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  // For object types, we can't easily serialize the full schema
  // Just return z.object({}) as a placeholder
  logger.warn('Object type detected - generating placeholder z.object({})');
  return ok('z.object({})');
}

/**
 * Handle ZodUnion type
 */
function handleZodUnion(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  const def = (validator as any)._def || (validator as any).def;
  const options = def.options || [];

  if (options.length === 0) {
    return ok('z.any()');
  }

  const optionCodes: string[] = [];
  for (const option of options) {
    const result = zodTypeToCodeInternal(option, context);
    if (result.isErr()) return err(result.error);
    optionCodes.push(result.value);
  }

  return ok(`z.union([${optionCodes.join(', ')}])`);
}

/**
 * Handle ZodDiscriminatedUnion type
 */
function handleZodDiscriminatedUnion(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  logger.warn('Discriminated union detected - generating placeholder z.any()');
  return ok('z.any()');
}

/**
 * Handle ZodIntersection type
 */
function handleZodIntersection(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  const def = (validator as any)._def || (validator as any).def;
  const left = def.left;
  const right = def.right;

  if (!left || !right) {
    return ok('z.any()');
  }

  const leftResult = zodTypeToCodeInternal(left, context);
  if (leftResult.isErr()) return err(leftResult.error);

  const rightResult = zodTypeToCodeInternal(right, context);
  if (rightResult.isErr()) return err(rightResult.error);

  return ok(`${leftResult.value}.and(${rightResult.value})`);
}

/**
 * Handle ZodTuple type
 */
function handleZodTuple(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  const def = (validator as any)._def || (validator as any).def;
  const items = def.items || [];

  const itemCodes: string[] = [];
  for (const item of items) {
    const result = zodTypeToCodeInternal(item, context);
    if (result.isErr()) return err(result.error);
    itemCodes.push(result.value);
  }

  return ok(`z.tuple([${itemCodes.join(', ')}])`);
}

/**
 * Handle ZodRecord type
 */
function handleZodRecord(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  const def = (validator as any)._def || (validator as any).def;
  const valueType = def.valueType;

  if (!valueType) {
    return ok('z.record(z.any())');
  }

  const valueResult = zodTypeToCodeInternal(valueType, context);
  if (valueResult.isErr()) return err(valueResult.error);

  return ok(`z.record(${valueResult.value})`);
}

/**
 * Handle ZodMap type
 */
function handleZodMap(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  return ok('z.map(z.any(), z.any())');
}

/**
 * Handle ZodSet type
 */
function handleZodSet(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  const def = (validator as any)._def || (validator as any).def;
  const valueType = def.valueType;

  if (!valueType) {
    return ok('z.set(z.any())');
  }

  const valueResult = zodTypeToCodeInternal(valueType, context);
  if (valueResult.isErr()) return err(valueResult.error);

  return ok(`z.set(${valueResult.value})`);
}

/**
 * Handle ZodLiteral type
 */
function handleZodLiteral(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  const def = (validator as any)._def || (validator as any).def;
  const value = def.value;

  if (typeof value === 'string') {
    return ok(`z.literal("${escapeString(value)}")`);
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    return ok(`z.literal(${value})`);
  }

  return ok('z.any()');
}

/**
 * Handle ZodEnum type
 */
function handleZodEnum(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  const def = (validator as any)._def || (validator as any).def;
  const values = def.values || [];

  if (values.length === 0) {
    return ok('z.any()');
  }

  const quotedValues = values.map((v: string) => `"${escapeString(v)}"`);
  return ok(`z.enum([${quotedValues.join(', ')}])`);
}

/**
 * Handle ZodNativeEnum type
 */
function handleZodNativeEnum(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  logger.warn('Native enum detected - cannot serialize enum object, using z.any()');
  return ok('z.any()');
}

/**
 * Handle ZodPromise type
 */
function handleZodPromise(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  const def = (validator as any)._def || (validator as any).def;
  const innerType = def.type;

  if (!innerType) {
    return ok('z.promise(z.any())');
  }

  const innerResult = zodTypeToCodeInternal(innerType, context);
  if (innerResult.isErr()) return err(innerResult.error);

  return ok(`z.promise(${innerResult.value})`);
}

/**
 * Handle ZodBranded type
 */
function handleZodBranded(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  const def = (validator as any)._def || (validator as any).def;
  const innerType = def.type;

  if (!innerType) {
    return ok('z.any()');
  }

  const innerResult = zodTypeToCodeInternal(innerType, context);
  if (innerResult.isErr()) return err(innerResult.error);

  // Can't serialize brand info, just return inner type
  return ok(innerResult.value);
}

/**
 * Handle ZodPipeline type
 */
function handleZodPipeline(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  const def = (validator as any)._def || (validator as any).def;
  const inType = def.in;
  const outType = def.out;

  if (!inType || !outType) {
    return ok('z.any()');
  }

  const inResult = zodTypeToCodeInternal(inType, context);
  if (inResult.isErr()) return err(inResult.error);

  const outResult = zodTypeToCodeInternal(outType, context);
  if (outResult.isErr()) return err(outResult.error);

  return ok(`${inResult.value}.pipe(${outResult.value})`);
}

/**
 * Handle ZodReadonly type
 */
function handleZodReadonly(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  const def = (validator as any)._def || (validator as any).def;
  const innerType = def.innerType;

  if (!innerType) {
    return ok('z.any()');
  }

  const innerResult = zodTypeToCodeInternal(innerType, context);
  if (innerResult.isErr()) return err(innerResult.error);

  return ok(`${innerResult.value}.readonly()`);
}

/**
 * Handle ZodOptional type
 */
function handleZodOptional(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  const def = (validator as any)._def || (validator as any).def;
  const innerType = def.innerType;

  if (!innerType) {
    return ok('z.any().optional()');
  }

  const innerResult = zodTypeToCodeInternal(innerType, context);
  if (innerResult.isErr()) return err(innerResult.error);

  return ok(`${innerResult.value}.optional()`);
}

/**
 * Handle ZodNullable type
 */
function handleZodNullable(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  const def = (validator as any)._def || (validator as any).def;
  const innerType = def.innerType;

  if (!innerType) {
    return ok('z.any().nullable()');
  }

  const innerResult = zodTypeToCodeInternal(innerType, context);
  if (innerResult.isErr()) return err(innerResult.error);

  return ok(`${innerResult.value}.nullable()`);
}

/**
 * Handle ZodDefault type
 */
function handleZodDefault(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  const def = (validator as any)._def || (validator as any).def;
  const innerType = def.innerType;
  const defaultValue = def.defaultValue;

  if (!innerType) {
    return ok('z.any()');
  }

  const innerResult = zodTypeToCodeInternal(innerType, context);
  if (innerResult.isErr()) return err(innerResult.error);

  // Serialize default value
  let defaultStr = 'undefined';
  if (typeof defaultValue === 'function') {
    defaultStr = '() => /* default value */';
  } else if (typeof defaultValue === 'string') {
    defaultStr = `"${escapeString(defaultValue)}"`;
  } else if (typeof defaultValue === 'number' || typeof defaultValue === 'boolean') {
    defaultStr = String(defaultValue);
  } else if (defaultValue === null) {
    defaultStr = 'null';
  }

  return ok(`${innerResult.value}.default(${defaultStr})`);
}

/**
 * Handle ZodCatch type
 */
function handleZodCatch(validator: z.ZodType<any>, context: CodegenContext): Result<string, ZodError> {
  const def = (validator as any)._def || (validator as any).def;
  const innerType = def.innerType;

  if (!innerType) {
    return ok('z.any()');
  }

  const innerResult = zodTypeToCodeInternal(innerType, context);
  if (innerResult.isErr()) return err(innerResult.error);

  return ok(`${innerResult.value}.catch(/* catch value */)`);
}

/**
 * Escape string for code generation
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

