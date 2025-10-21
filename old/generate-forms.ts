#!/usr/bin/env node

/**
 * Robust Type-Safe TanStack Form Generator
 *
 * Production-ready with comprehensive error handling, logging, and validation
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { Result, ok, err } from 'neverthrow';
import pluralize from 'pluralize';
import {
  resolveFieldConfig,
  excludeFromForms,
  type FieldMapping,
} from './field-mappings.config.ts';
import {
  readSchemaFile,
  parseSchema,
  type ParsedTable,
  type ParsedField,
} from './utils/schema-parser';
import { zodToCode } from './utils/zod-codegen';
import {
  writeFile,
  ensureDirectory,
  type FileOptions,
} from './utils/file-system';
import {
  DEFAULT_CONFIG,
  parseCliArgs,
  mergeConfig,
  validateConfig,
  generateFileHeader,
  addEslintDisable,
  type GeneratorConfig,
} from './utils/config';
import { logger } from './utils/logger';
import { GeneratorError, GeneratorErrorCode, fromError } from './utils/errors';
import {
  permissionUtils,
  tableDisplayConfig,
  type PermissionConfig,
} from './field-mappings.config';

/**
 * Get generator configuration
 */
function getConfig(): Result<GeneratorConfig, GeneratorError> {
  try {
    const cliArgs = parseCliArgs(process.argv.slice(2));
    const config = mergeConfig(DEFAULT_CONFIG, cliArgs);

    const validationResult = validateConfig(config);
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    return ok(config);
  } catch (error) {
    return err(
      new GeneratorError(
        GeneratorErrorCode.INVALID_CONFIG,
        `Failed to parse configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Generate Zod schema code from field configuration
 */
function generateZodSchemaCode(field: ParsedField, config: GeneratorConfig): Result<string, GeneratorError> {
  return zodToCode(field, {
    includeErrorMessages: config.codegen.includeErrorMessages,
    useStandardSchema: config.codegen.useStandardSchema,
  });
}

/**
 * Utility functions for code generation
 */
const capitalize = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);

const generateLabel = (fieldName: string): string =>
  fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();

/**
 * Generate TypeScript type from field
 */
function generateTypeScriptType(field: ParsedField): string {
  let tsType: string;
  switch (field.type) {
    case 'string':
    case 'id':
      tsType = 'string';
      break;
    case 'number':
      tsType = 'number';
      break;
    case 'boolean':
      tsType = 'boolean';
      break;
    case 'array':
      tsType = 'any[]';
      break;
    default:
      tsType = 'any';
  }
  return tsType;
}

/**
 * Generate form component with error handling
 */
function generateFormComponent(
  tableName: string,
  fields: ParsedField[],
  config: GeneratorConfig
): Result<string, GeneratorError> {
  try {
    const componentName = capitalize(pluralize.singular(tableName));
    const tableConfig = tableDisplayConfig[tableName];
    const allFormFields = fields.filter(f => !excludeFromForms.includes(f.name));

    // Note: In a real implementation, we'd get user roles dynamically
    // For now, we'll assume admin role for form generation
    const mockUserRoles = ['admin'];
    const isCreateForm = true; // This would be passed as a parameter
    const action = isCreateForm ? 'create' : 'write';

    const formFields = permissionUtils.getVisibleFields(allFormFields, mockUserRoles, action);

    logger.debug(`Generating form component for ${tableName} with ${formFields.length} fields`);

    // Generate Zod schema using actual validators
    const zodFields: string[] = [];
    for (const field of formFields) {
      const zodCodeResult = generateZodSchemaCode(field, config);
      if (zodCodeResult.isErr()) {
        logger.warn(`Failed to generate Zod code for ${field.name}: ${zodCodeResult.error.message}`);
        zodFields.push(`  ${field.name}: z.any(),`);
      } else {
        zodFields.push(`  ${field.name}: ${zodCodeResult.value},`);
      }
    }

    // Generate default values
    const defaultValues = formFields
      .map(field => {
        const defaultVal = field.config.defaultValue !== undefined
          ? JSON.stringify(field.config.defaultValue)
          : (field.isOptional ? 'undefined' : "''");
        return `    ${field.name}: ${defaultVal},`;
      })
      .join('\n');

    // Generate form fields JSX
    const formFieldsJSX: string[] = [];
    for (const field of formFields) {
      const component = field.config.formComponent;
      if (!component) continue;

      const label = generateLabel(field.name);
      const props = field.config.props || {};
      const propsStr = Object.entries(props)
        .map(([key, val]) => `${key}={${JSON.stringify(val)}}`)
        .join(' ');

      // Add permission check for field visibility
      const fieldPermissions = field.config?.permissions;
      const permissionCheck = fieldPermissions ?
        `// Check field permissions dynamically
        const canEdit${capitalize(field.name)} = permissionUtils.canAccessField(userRoles, ${JSON.stringify(fieldPermissions)}, '${action}', isOwner);
        if (!canEdit${capitalize(field.name)}) return null;` : '';

      formFieldsJSX.push(`          {(() => {
            ${permissionCheck}
            return (
              <form.Field
                name="${field.name}"
                children={(field) => (
                  <${component} label="${label}" ${propsStr} />
                )}
              />
            );
          })()}`);
    }

    // Generate TypeScript interface
    const tsInterface = formFields
      .map(field => {
        const tsType = generateTypeScriptType(field);
        const optional = field.isOptional ? '?' : '';
        return `  ${field.name}${optional}: ${tsType};`;
      })
      .join('\n');

    // Build the complete component
    const header = generateFileHeader(config, `Form component for ${tableName} table`);
    const eslintDisable = addEslintDisable(config);

    const component = `${header}${eslintDisable}import { z } from 'zod'
import { useState } from 'react'
import type { Collection } from '@tanstack/db'
import { fromPromise } from 'neverthrow'

import { useAppForm } from '@/hooks/demo.form'
import {
  TextField,
  NumberField,
  Checkbox,
  Select,
  TextArea,
} from '@/components/demo.FormComponents'
import { Errors, type AppResult } from '@/lib/errors'
import { Match, Option } from 'effect'
import { toast } from '@/lib/toast'
import { logger } from '@/lib/logger'
import { permissionUtils } from '../../../scripts/field-mappings.config'

/**
 * Form data interface for ${componentName}
 */
export interface ${componentName}FormData {
${tsInterface}
}

/**
 * Full ${componentName} interface with id
 */
export interface ${componentName} extends ${componentName}FormData {
  id: string;
}

/**
 * Props for ${componentName}Form component
 */
export interface ${componentName}FormProps {
  collection: Collection<${componentName}>;
  initialData?: ${componentName};
  onSuccess?: () => void;
  onCancel?: () => void;
  userRoles?: string[];
  isOwner?: boolean;
}

/**
 * Zod validation schema for ${componentName}
 */
const ${componentName.toLowerCase()}Schema = z.object({
${zodFields.join('\n')}
})

/**
 * ${componentName} Form Component
 *
 * Auto-generated form for ${tableName} table with TanStack Form + TanStack DB integration
 */
export function ${componentName}Form({
  collection,
  initialData,
  onSuccess,
  onCancel,
  userRoles = ['user'],
  isOwner = false,
}: ${componentName}FormProps) {
  const [submitError, setSubmitError] = useState<Option.Option<string>>(Option.none())
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useAppForm({
    defaultValues: initialData
      ? {
${formFields.map(f => `          ${f.name}: initialData.${f.name},`).join('\n')}
        }
      : {
${defaultValues}
        },
    validators: {
      onBlur: ${componentName.toLowerCase()}Schema,
    },
    onSubmit: async ({ value }) => {
      logger.trackAction(initialData ? 'update_${componentName.toLowerCase()}' : 'create_${componentName.toLowerCase()}', {
        id: initialData?.id,
      })

      setIsSubmitting(true)
      setSubmitError(Option.none())

      const endTimer = logger.time(initialData ? 'update_${componentName.toLowerCase()}' : 'create_${componentName.toLowerCase()}')

      const id = initialData?.id || crypto.randomUUID()
      const result = await fromPromise(
        collection.insert({ id, ...value } as ${componentName}).isPersisted.promise,
        (error) => {
          // Map validation errors from Zod
          if (error instanceof z.ZodError) {
            return Errors.validation(
              'form',
              error.errors.map(e => ({
                path: e.path.map(String),
                message: e.message,
                code: e.code,
              })),
              'Form validation failed'
            )
          }

          return Errors.database(
            initialData ? 'update' : 'insert',
            \`Failed to \${initialData ? 'update' : 'create'} ${componentName.toLowerCase()}\`,
            { id, originalError: error }
          )
        }
      )

      endTimer()

      result.match(
        () => {
          setIsSubmitting(false)
          logger.info(\`${componentName} \${initialData ? 'updated' : 'created'} successfully\`, { id })
          toast.success(
            initialData ? '${componentName} updated' : '${componentName} created',
            initialData ? 'Your changes have been saved' : '${componentName} has been created successfully'
          )
          onSuccess?.()
        },
        (error) => {
          setIsSubmitting(false)
          logger.logAppError(error, \`Failed to \${initialData ? 'update' : 'create'} ${componentName.toLowerCase()}\`)
          toast.fromError(error, initialData ? 'Update failed' : 'Create failed')
          const errorMessage = Match.value(error).pipe(
            Match.when({ _tag: 'ValidationError' }, (e) => {
              const firstIssue = e.issues[0]
              return \`\${firstIssue.path.join('.')}: \${firstIssue.message}\`
            }),
            Match.when({ _tag: 'DatabaseError' }, (e) => \`Database error: \${e.message}\`),
            Match.when({ _tag: 'UnauthorizedError' }, () => 'You are not authorized to perform this action'),
            Match.when({ _tag: 'ForbiddenError' }, () => 'You do not have permission to perform this action'),
            Match.when({ _tag: 'ConflictError' }, (e) => e.conflictingField
              ? \`A ${componentName.toLowerCase()} with this \${e.conflictingField} already exists\`
              : e.message),
            Match.orElse((e) => e.message)
          )
          setSubmitError(Option.some(errorMessage))
        }
      )
    },
  })

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4 text-white"
      style={{
        backgroundImage:
          'radial-gradient(50% 50% at 5% 40%, #add8e6 0%, #0000ff 70%, #00008b 100%)',
      }}
    >
      <div className="w-full max-w-2xl p-8 rounded-xl backdrop-blur-md bg-black/50 shadow-xl border-8 border-black/10">
        <h2 className="text-3xl font-bold mb-6">
          {initialData ? 'Edit' : 'Create'} ${componentName}
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-6"
          aria-label={\`\${initialData ? 'Edit' : 'Create'} ${componentName} form\`}
        >
${formFieldsJSX.join('\n\n')}

          {Option.isSome(submitError) && (
            <div
              className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              <p className="font-semibold">Error</p>
              <p className="text-sm">{submitError.value}</p>
            </div>
          )}

          <div className="flex justify-end gap-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
            )}
            <form.Subscribe
              selector={(state) => [state.canSubmit]}
              children={([canSubmit]) => (
                <button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={initialData ? \`Update \${componentName}\` : \`Create \${componentName}\`}
                  aria-busy={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : (initialData ? 'Update' : 'Create')}
                </button>
              )}
            />
          </div>
        </form>
      </div>
    </div>
  )
}
`;

    // Replace template placeholders with actual values
    const finalComponent = component
      .replace(/\$\{componentName\}/g, componentName)
      .replace(/\$\{componentName\.toLowerCase\(\)\}/g, componentName.toLowerCase());

    return ok(finalComponent);
  } catch (error) {
    return err(
      new GeneratorError(
        GeneratorErrorCode.CODE_GENERATION_ERROR,
        `Failed to generate form component for ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { tableName },
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Generate route file with error handling
 */
function generateRouteFile(tableName: string, config: GeneratorConfig): Result<string, GeneratorError> {
  try {
    const componentName = capitalize(pluralize.singular(tableName));

    const header = generateFileHeader(config, `Route for ${tableName} form`);
    const eslintDisable = addEslintDisable(config);

    const routeFile = `${header}${eslintDisable}import { createFileRoute } from '@tanstack/react-router'
import { ConvexClient } from 'convex/browser'

import { createConvexCollectionCreator } from '@/utils/convex-tanstackdb'
import { ${componentName}Form } from '@/components/forms/${componentName}Form'
import { useUser } from '@/hooks/useUser'
import { useWorkOSPermissions } from '@/hooks/useWorkOSPermissions'

export const Route = createFileRoute('/forms/${tableName}')({
  component: ${componentName}FormPage,
})

// Initialize Convex client and collection
const client = new ConvexClient(import.meta.env.VITE_CONVEX_URL || '')
const createCollection = createConvexCollectionCreator(client)

const ${tableName}Collection = createCollection('${tableName}', {
  getKey: (item: ${componentName}) => item.id,
})

function ${componentName}FormPage() {
  const user = useUser()
  const { roles: userRoles, isOwner } = useWorkOSPermissions()

  return (
    <${componentName}Form
      collection={${tableName}Collection}
      userRoles={userRoles}
      isOwner={isOwner}
      onSuccess={() => {
        alert('${componentName} saved successfully!')
        // Optionally navigate away or refresh
      }}
    />
  )
}
`;

    return ok(routeFile);
  } catch (error) {
    return err(
      new GeneratorError(
        GeneratorErrorCode.CODE_GENERATION_ERROR,
        `Failed to generate route file for ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { tableName },
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Generate forms for all tables
 */
async function generateForms(
  tables: Map<string, ParsedTable>,
  config: GeneratorConfig
): Promise<Result<void, GeneratorError>> {
  try {
    logger.section('Generating Form Components');

    // Ensure output directories exist
    const formsDirResult = ensureDirectory(config.paths.forms);
    if (formsDirResult.isErr()) return err(formsDirResult.error);

    const routesDirResult = ensureDirectory(path.join(config.paths.routes, 'forms'));
    if (routesDirResult.isErr()) return err(routesDirResult.error);

    // Filter tables based on configuration
    let tablesToProcess = Array.from(tables.entries());

    if (config.mode === 'selective' && config.tables) {
      tablesToProcess = tablesToProcess.filter(([tableName]) =>
        config.tables!.includes(tableName)
      );
    }

    if (config.skipTables) {
      tablesToProcess = tablesToProcess.filter(([tableName]) =>
        !config.skipTables!.includes(tableName)
      );
    }

    logger.info(`Processing ${tablesToProcess.length} table(s)`);

    for (const [tableName, tableData] of tablesToProcess) {
      logger.subsection(`Processing ${tableName}`);

      const componentName = capitalize(pluralize.singular(tableName));
      const formPath = path.join(config.paths.forms, `${componentName}Form.${config.files.extension}`);
      const routePath = path.join(config.paths.routes, 'forms', `${tableName}.${config.files.extension}`);

      // Generate form component
      const formResult = generateFormComponent(tableName, tableData.fields, config);
      if (formResult.isErr()) {
        logger.error(`Failed to generate form for ${tableName}`, formResult.error.code, {
          tableName,
          error: formResult.error.message
        });
        continue;
      }

      // Write form component
      const formOptions: FileOptions = {
        overwrite: config.overwrite,
        backup: config.createBackups,
        dryRun: config.dryRun,
      };

      const writeFormResult = writeFile(formPath, formResult.value, formOptions);
      if (writeFormResult.isErr()) {
        logger.error(`Failed to write form file for ${tableName}`, writeFormResult.error.code, {
          filePath: formPath,
          error: writeFormResult.error.message
        });
        continue;
      }

      logger.success(`Generated ${componentName}Form.${config.files.extension}`);

      // Generate route file
      const routeResult = generateRouteFile(tableName, config);
      if (routeResult.isErr()) {
        logger.error(`Failed to generate route for ${tableName}`, routeResult.error.code, {
          tableName,
          error: routeResult.error.message
        });
        continue;
      }

      // Write route file
      const writeRouteResult = writeFile(routePath, routeResult.value, formOptions);
      if (writeRouteResult.isErr()) {
        logger.error(`Failed to write route file for ${tableName}`, writeRouteResult.error.code, {
          filePath: routePath,
          error: writeRouteResult.error.message
        });
        continue;
      }

      logger.success(`Generated routes/forms/${tableName}.${config.files.extension}`);
      logger.incrementTables();
    }

    return ok(undefined);
  } catch (error) {
    return err(fromError(error, GeneratorErrorCode.CODE_GENERATION_ERROR));
  }
}

/**
 * Main function with comprehensive error handling
 */
async function main(): Promise<void> {
  try {
    logger.startGeneration();
    logger.section('🎨 Robust Type-Safe TanStack Form Generator');

    // Get configuration
    const configResult = getConfig();
    if (configResult.isErr()) {
      logger.error('Configuration error', configResult.error.code, {
        error: configResult.error.message
      });
      process.exit(1);
    }

    const config = configResult.value;
    logger.setLevel(config.logLevel);

    if (config.dryRun) {
      logger.info('🔍 DRY RUN MODE - No files will be written');
    }

    // Read and parse schema
    logger.subsection('Reading Schema');
    const schemaContentResult = readSchemaFile(config.paths.schema);
    if (schemaContentResult.isErr()) {
      logger.error('Failed to read schema file', schemaContentResult.error.code, {
        filePath: config.paths.schema,
        error: schemaContentResult.error.message
      });
      process.exit(1);
    }

    const tablesResult = parseSchema(
      schemaContentResult.value,
      (tableName, fieldName, fieldType, isOptional) =>
        resolveFieldConfig(tableName, fieldName, fieldType, isOptional)
    );

    if (tablesResult.isErr()) {
      logger.error('Failed to parse schema', tablesResult.error.code, {
        error: tablesResult.error.message
      });
      process.exit(1);
    }

    const tables = tablesResult.value;
    logger.success(`Parsed ${tables.size} table(s) from schema`);

    // Generate forms
    const generateResult = await generateForms(tables, config);
    if (generateResult.isErr()) {
      logger.error('Form generation failed', generateResult.error.code, {
        error: generateResult.error.message
      });
      process.exit(1);
    }

    // Print report
    logger.endGeneration();
    logger.printReport();

    // Print usage information
    if (!config.dryRun && tables.size > 0) {
      console.log('\n📚 Usage:\n');
      console.log('Import and use the generated forms:');
      console.log('```tsx');
      for (const tableName of tables.keys()) {
        const componentName = capitalize(pluralize.singular(tableName));
        console.log(`import { ${componentName}Form } from '@/components/forms/${componentName}Form'`);
      }
      console.log('```\n');

      console.log('Or visit the routes directly:');
      for (const tableName of tables.keys()) {
        console.log(`  - /forms/${tableName}`);
      }
      console.log('');
    }

  } catch (error) {
    const genError = fromError(error);
    logger.error('Unexpected error in main function', genError.code, {
      error: genError.message
    });
    process.exit(1);
  }
}

// Run the generator
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
