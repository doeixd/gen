/**
 * Custom Configuration Example
 *
 * This file demonstrates how to create custom configuration files that can be
 * loaded via the --config option. Custom configs can override any default settings.
 */

module.exports = {
  // Override default paths
  paths: {
    schema: './my-schema.ts',
    database: './generated/custom-database',
    api: './generated/custom-api',
    frontend: './generated/custom-frontend',
    tests: './generated/custom-tests',
    docs: './generated/custom-docs'
  },

  // Custom targets
  targets: ['database', 'frontend', 'docs'],

  // Custom API settings
  api: {
    framework: 'fastify',
    includeValidation: true,
    includePermissions: true,
    includeOpenAPI: true,
    includeTypes: true,
    basePath: '/api/v2'
  },

  // Custom frontend settings
  frontend: {
    includeComponents: true,
    includeForms: true,
    framework: 'react',
    styling: 'styled-components',
    componentLibrary: 'material-ui'
  },

  // Custom component configuration
  components: {
    mappings: {
      form: {
        string: 'TextField',
        number: 'NumberField',
        boolean: 'Checkbox',
        email: 'EmailField',
        textarea: 'TextArea',
        select: 'SelectField',
      },
      display: {
        string: 'Typography',
        number: 'Typography',
        boolean: 'Chip',
        date: 'DateDisplay',
        email: 'EmailLink',
      },
      layout: {
        form: 'Form',
        field: 'FormControl',
        label: 'FormLabel',
        error: 'FormErrorMessage',
        submit: 'Button',
      },
    },
    forms: {
      validation: 'zod',
      submitHandler: 'onSubmit',
      errorHandling: 'toast',
      layout: 'vertical',
    },
    props: {
      TextField: { variant: 'outlined', fullWidth: true },
      Button: { variant: 'contained', color: 'primary' },
    },
    fieldOverrides: {
      users: {
        password: {
          formComponent: 'PasswordField',
          props: { showStrength: true }
        }
      }
    },
  },

  // Custom test settings
  tests: {
    framework: 'jest',
    includeUnitTests: true,
    includeIntegrationTests: true,
    includeE2ETests: false, // Disable E2E tests
    includePermissionTests: true,
    testDataFactory: true,
    mockExternalDeps: true
  },

  // Custom codegen settings
  codegen: {
    includeErrorMessages: true,
    useStandardSchema: true
  },

  // Selective generation
  tables: ['users', 'posts'], // Only generate for these tables
  skipTables: [],

  // File settings
  files: {
    extension: 'ts'
  },

  // Custom options
  customOptions: {
    theme: 'dark',
    branding: 'MyCompany',
    enableAnalytics: true
  }
}