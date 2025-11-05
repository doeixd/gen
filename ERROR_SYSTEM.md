# Error System Documentation

## Overview

The Gen library includes a comprehensive, type-safe error system designed to provide consistent error handling across the entire mapping and code generation ecosystem. Unlike traditional error systems that impose specific patterns, this system is **opinion-free** and **extensible**, allowing users to integrate their own error classes while providing sensible defaults.

## Key Features

- 🔒 **100% Type-Safe** - No magic strings, full TypeScript inference
- 🔧 **Opinion-Free** - Works with throwing OR returning errors (Result types)
- 📚 **Comprehensive Catalog** - 25+ predefined errors with recovery suggestions
- 🛠️ **Extensible Registry** - Register your own error classes
- 🔄 **Seamless Integration** - Works with entities, generators, and runtime
- ⚡ **Performance Optimized** - Efficient error creation and handling
- 🎯 **Flexible Paradigms** - Supports both exception-based and functional error handling

## Quick Start

```typescript
import { errors, ErrorRegistry } from 'gen'

// Create errors using type-safe factories
const validationError = errors.validation('INVALID_EMAIL', 'Invalid email format')

// Register custom error classes
ErrorRegistry.registerBulk({
  MyAppError: class extends Error implements ErrorBase {
    code = 'MY_APP_ERROR'
    context?: Record<string, any>
    timestamp = Date.now()
  }
})

// Use registered errors
const customError = ErrorRegistry.create('MyAppError', 'Something went wrong')
```

## Core Concepts

### Error Handling Approaches

The error system supports multiple error handling paradigms - **you choose** how to handle errors:

#### 🎯 **Exception-Based (Throwing)**
```typescript
// Traditional approach - throw errors
function validateUser(user: User) {
  if (!user.email) {
    throw errors.validation('VALIDATION_MISSING_REQUIRED', 'Email is required', { field: 'email' })
  }
  return user
}

try {
  const user = validateUser(input)
} catch (error) {
  // Handle error
}
```

#### 📦 **Errors as Values (Returning)**
```typescript
// Functional approach - return Result types
import { Result, ok, err } from 'neverthrow'

function validateUser(user: User): Result<User, ErrorBase> {
  if (!user.email) {
    return err(errors.validation('VALIDATION_MISSING_REQUIRED', 'Email is required', { field: 'email' }))
  }
  return ok(user)
}

const result = validateUser(input)
if (result.isErr()) {
  // Handle error
  console.error(result.error)
} else {
  // Use valid data
  console.log(result.value)
}
```

#### 🔄 **Generator Choice**
**Generators decide the error handling style** for generated code:
- **API Generators** might prefer throwing for Express middleware
- **Frontend Generators** might prefer Result types for React hooks
- **Database Generators** might use both depending on the ORM

### Error Base Interface

All errors must implement the `ErrorBase` interface:

```typescript
interface ErrorBase {
  code?: string           // Error code identifier
  message?: string        // Human-readable message
  context?: Record<string, any>  // Additional context data
  timestamp?: Date | number      // When the error occurred
  stack?: string          // Stack trace (optional)
}
```

### Error Categories

The system organizes errors into categories for better organization:

- **`entity`** - Entity definition and validation errors
- **`database`** - Database schema and connection errors
- **`validation`** - Data validation errors
- **`permission`** - Authorization and access control errors
- **`authentication`** - Login and identity errors
- **`authorization`** - Permission and access errors
- **`network`** - Communication and connectivity errors
- **`filesystem`** - File system operation errors
- **`configuration`** - Configuration and setup errors
- **`generation`** - Code generation errors
- **`runtime`** - General runtime errors

### Error Severity Levels

- **`info`** - Informational messages
- **`warning`** - Non-critical issues
- **`error`** - Standard errors that should be handled
- **`critical`** - Severe errors requiring immediate attention

## Error Catalog

The system includes a comprehensive catalog of predefined errors. Each error includes:

- Unique error code
- Category and severity
- Default message
- Recovery suggestions
- Optional description

### Example Error Definition

```typescript
// From the catalog
{
  code: 'VALIDATION_SCHEMA_INVALID',
  category: 'validation',
  severity: 'error',
  message: 'Validation schema is invalid',
  description: 'The provided validation schema has syntax or logical errors',
  recovery: [{
    action: 'reconfigure',
    description: 'Fix the validation schema syntax or logic'
  }]
}
```

### Available Errors

#### Entity Errors
- `ENTITY_MISSING_ID` - Entity must have an ID
- `ENTITY_INVALID_NAME` - Entity name is invalid
- `ENTITY_DUPLICATE_FIELD` - Duplicate field name in entity

#### Database Errors
- `DB_INVALID_COLUMN_TYPE` - Invalid database column type
- `DB_MISSING_PRIMARY_KEY` - Table must have a primary key
- `DB_FOREIGN_KEY_VIOLATION` - Foreign key constraint violation

#### Validation Errors
- `VALIDATION_SCHEMA_INVALID` - Validation schema is invalid
- `VALIDATION_DATA_INVALID` - Data validation failed
- `VALIDATION_MISSING_REQUIRED` - Required field is missing

#### Permission Errors
- `PERMISSION_DENIED` - Permission denied
- `PERMISSION_INSUFFICIENT_ROLE` - Insufficient role permissions
- `PERMISSION_OWNERSHIP_REQUIRED` - Ownership permission required

#### Authentication/Authorization Errors
- `AUTH_INVALID_CREDENTIALS` - Invalid authentication credentials
- `AUTH_TOKEN_EXPIRED` - Authentication token has expired
- `AUTH_UNAUTHORIZED` - Unauthorized access

#### Network Errors
- `NETWORK_CONNECTION_FAILED` - Network connection failed
- `NETWORK_TIMEOUT` - Network request timed out
- `NETWORK_SERVICE_UNAVAILABLE` - Service temporarily unavailable

#### Filesystem Errors
- `FILE_NOT_FOUND` - File not found
- `FILE_PERMISSION_DENIED` - File permission denied
- `DIRECTORY_CREATE_FAILED` - Failed to create directory

#### Configuration Errors
- `CONFIG_INVALID` - Configuration is invalid
- `CONFIG_MISSING_REQUIRED` - Required configuration missing
- `CONFIG_VERSION_MISMATCH` - Configuration version mismatch

#### Generation Errors
- `GENERATION_TEMPLATE_ERROR` - Template processing failed
- `GENERATION_INVALID_TARGET` - Invalid generation target
- `GENERATION_DEPENDENCY_MISSING` - Required dependency missing

#### Runtime Errors
- `RUNTIME_UNEXPECTED_ERROR` - Unexpected runtime error
- `RUNTIME_RESOURCE_EXHAUSTED` - Resource exhausted

## Usage Guide

### Basic Error Creation

```typescript
import { errors } from 'gen'

// Create validation error
const validationError = errors.validation('INVALID_EMAIL', 'Please enter a valid email')

// Create database error
const dbError = errors.database('CONNECTION_FAILED', 'Database is temporarily unavailable')

// Create permission error
const permError = errors.permission('ACCESS_DENIED', 'You do not have permission to view this resource')

// Create custom error
const customError = errors.base('CUSTOM_ERROR', 'Something custom happened')
```

### Advanced Error Creation

```typescript
import { ErrorBuilder, errors } from 'gen'

// Using the builder pattern
const error = new ErrorBuilder()
  .withCode('VALIDATION_DATA_INVALID')
  .withMessage('Email format is incorrect')
  .withContext({ field: 'email', value: 'invalid@' })
  .withCause(new Error('Regex validation failed'))
  .build()

// Adding context to existing errors
const enhancedError = errors.withContext(validationError, {
  userId: 123,
  requestId: 'req-456',
  timestamp: Date.now()
})
```

### Error Registry

```typescript
import { ErrorRegistry } from 'gen'

// Register a single error class
ErrorRegistry.register('HttpError', class HttpError extends Error implements ErrorBase {
  code: string
  statusCode: number
  timestamp: number

  constructor(code: string, message: string, statusCode: number) {
    super(message)
    this.code = code
    this.statusCode = statusCode
    this.timestamp = Date.now()
  }
})

// Register multiple error classes
ErrorRegistry.registerBulk({
  ApiError: MyApiError,
  ServiceError: MyServiceError,
  TimeoutError: MyTimeoutError
})

// Create instances of registered errors
const httpError = ErrorRegistry.create('HttpError', 'HTTP_404', 'Not found', 404)
```

### Error Handling

```typescript
import { errorUtils, errors } from 'gen'

// Type guards
if (errorUtils.isErrorCode(error, 'VALIDATION_DATA_INVALID')) {
  // Handle validation error
}

if (errorUtils.isErrorCategory(error, 'database')) {
  // Handle database errors
}

// Error recovery
const recoverySuggestions = errorUtils.getRecoveryForError(error)
for (const recovery of recoverySuggestions) {
  console.log(`${recovery.action}: ${recovery.description}`)
}

// Format for logging
const logData = errorUtils.formatErrorForLogging(error)

// Format for API response
const apiResponse = errorUtils.formatErrorForAPI(error)

// Group errors by category
const groupedErrors = errorUtils.groupErrorsByCategory(errorList)

// Filter by severity
const criticalErrors = errorUtils.filterErrorsBySeverity(errorList, 'critical')
```

### Async Error Handling

```typescript
import { errorUtils } from 'gen'

// Wrap async functions with error boundaries
const safeAsyncFunction = errorUtils.withAsyncErrorBoundary(
  async () => {
    // Risky operation
    return await apiCall()
  },
  (error, ...args) => {
    // Fallback logic
    console.error('API call failed:', error)
    return defaultValue
  },
  'NETWORK_CONNECTION_FAILED'
)

// Convert to Result type (neverthrow)
const result = await errorUtils.toAsyncResult(
  () => riskyDatabaseOperation(),
  'DB_CONNECTION_FAILED'
)

if (result.isErr()) {
  // Handle error
  console.error(result.error)
}
```

### Retry Logic

```typescript
import { errorUtils } from 'gen'

const result = await errorUtils.withRetry(
  () => fetchDataFromAPI(),
  {
    maxAttempts: 3,
    delayMs: 1000,
    backoff: 'exponential',
    retryCondition: (error) => {
      // Only retry network errors
      return errorUtils.isErrorCategory(error, 'network')
    }
  }
)
```

### HTTP Integration

```typescript
import { errorUtils } from 'gen'

// Express error middleware
app.use(errorUtils.createErrorMiddleware({
  includeStack: process.env.NODE_ENV === 'development',
  logErrors: true,
  logger: (error) => {
    // Custom logging logic
    myLogger.error(error)
  }
}))

// Convert error to HTTP status code
const statusCode = errorUtils.getHttpStatusCode(error)
// 400 for validation errors
// 401 for auth errors
// 403 for permission errors
// 404 for not found errors
// 500 for server errors
```

## Entity Integration

Entities can specify custom error configurations:

```typescript
const userEntity = createEntity({
  id: 'user',
  name: { singular: 'User', plural: 'Users' },

  // Error configuration
  errors: {
    // Map operation types to error classes
    types: {
      ValidationError: MyCustomValidationError,
      DatabaseError: MyCustomDatabaseError
    },

    // Map specific operations to error codes
    mappings: {
      create: 'USER_CREATE_FAILED',
      update: 'USER_UPDATE_FAILED',
      delete: 'USER_DELETE_FAILED'
    }
  },

  // Rest of entity definition...
})
```

## Code Generation Integration

### Generator Error Handling Strategies

**Generators choose their preferred error handling approach** based on their target:

#### 🌐 **API Generator - Exception-Based**
```typescript
// Generated Express route with try/catch
app.post('/users', async (req, res) => {
  try {
    const user = await createUser(req.body)
    res.json(user)
  } catch (error) {
    if (errorUtils.isErrorCode(error, 'VALIDATION_DATA_INVALID')) {
      res.status(400).json(errorUtils.formatErrorForAPI(error))
    } else if (errorUtils.isErrorCategory(error, 'database')) {
      res.status(500).json(errorUtils.formatErrorForAPI(error))
    } else {
      res.status(500).json(errorUtils.formatErrorForAPI(
        errors.runtime('UNEXPECTED_ERROR', 'An unexpected error occurred')
      ))
    }
  }
})
```

#### ⚛️ **Frontend Generator - Result-Based**
```typescript
// Generated React hook with Result types
export function useCreateUser() {
  return useMutation({
    mutationFn: async (userData: CreateUserInput): Promise<Result<User, ErrorBase>> => {
      const response = await api.post('/users', userData)

      if (!response.ok) {
        return err(errors.network('NETWORK_CONNECTION_FAILED', 'API request failed'))
      }

      const result = response.data
      if (result.error) {
        return err(result.error)
      }

      return ok(result.data)
    }
  })
}

// Usage in component
function UserForm() {
  const createUser = useCreateUser()

  const handleSubmit = async (data: CreateUserInput) => {
    const result = await createUser.mutateAsync(data)

    if (result.isErr()) {
      // Handle error - show toast, set form errors, etc.
      showErrorToast(result.error.message)
    } else {
      // Success - redirect, show success message, etc.
      navigate('/users')
    }
  }
}
```

#### 💾 **Database Generator - Mixed Approach**
```typescript
// Generated database operation with both approaches
export async function findUserById(id: string): Promise<User | null> {
  try {
    const user = await db.users.findUnique({ where: { id } })
    return user
  } catch (error) {
    // Database errors might be thrown or returned based on generator config
    throw errors.database('DB_CONNECTION_FAILED', 'Database query failed', { userId: id })
  }
}

// Alternative Result-based approach
export async function findUserByIdResult(id: string): Promise<Result<User | null, ErrorBase>> {
  try {
    const user = await db.users.findUnique({ where: { id } })
    return ok(user)
  } catch (error) {
    return err(errors.database('DB_CONNECTION_FAILED', 'Database query failed', { userId: id }))
  }
}
```

### Generator Configuration

Generators can be configured for different error handling styles:

```typescript
const apiGenerator = new APIGenerator({
  errorHandling: 'exceptions', // 'exceptions' | 'results' | 'mixed'
  framework: 'express' // affects how errors are formatted
})

const frontendGenerator = new FrontendGenerator({
  errorHandling: 'results', // React hooks prefer Result types
  stateManagement: 'react-query' // affects error integration
})
```

## Best Practices

### 1. Choose Error Handling Approach

**Consider your context when choosing between throwing and returning errors:**

```typescript
// ✅ Throwing - Good for APIs and synchronous operations
function validateUser(user: User) {
  if (!user.email) {
    throw errors.validation('VALIDATION_MISSING_REQUIRED', 'Email required')
  }
}

// ✅ Returning - Good for functional programming and async operations
function validateUser(user: User): Result<User, ErrorBase> {
  if (!user.email) {
    return err(errors.validation('VALIDATION_MISSING_REQUIRED', 'Email required'))
  }
  return ok(user)
}

// ✅ Mixed - Sometimes both approaches in the same codebase
async function createUser(data: CreateUserInput): Promise<Result<User, ErrorBase>> {
  try {
    const validatedData = validateUserSync(data) // throws
    const user = await db.users.create({ data: validatedData })
    return ok(user)
  } catch (error) {
    return err(error as ErrorBase)
  }
}
```

**Guidelines:**
- **APIs/HTTP handlers**: Prefer throwing (works with middleware)
- **Business logic**: Consider Result types for better composability
- **Data fetching**: Result types work well with React Query, SWR, etc.
- **Libraries**: Throwing is more common for libraries
- **CLI tools**: Either approach works depending on preference

### 2. Use Appropriate Error Codes

```typescript
// ✅ Good - Use specific error codes
throw errors.validation('VALIDATION_MISSING_REQUIRED', 'Email is required', {
  field: 'email'
})

// ❌ Bad - Generic error codes
throw new Error('Something went wrong')
```

### 2. Provide Rich Context

```typescript
// ✅ Good - Include relevant context
throw errors.database('CONNECTION_FAILED', 'Database connection timeout', {
  host: 'localhost',
  port: 5432,
  timeout: 5000,
  attempt: 3
})

// ❌ Bad - Missing context
throw errors.database('CONNECTION_FAILED', 'Database connection timeout')
```

### 3. Handle Errors at Appropriate Levels

```typescript
// ✅ Good - Handle known errors specifically
try {
  await saveUser(userData)
} catch (error) {
  if (errorUtils.isErrorCode(error, 'VALIDATION_DATA_INVALID')) {
    // Show validation errors to user
    showValidationErrors(error.context.fields)
  } else if (errorUtils.isErrorCategory(error, 'database')) {
    // Log and show generic error
    logError(error)
    showGenericError('Please try again later')
  } else {
    // Re-throw unknown errors
    throw error
  }
}
```

### 4. Use Error Recovery

```typescript
// ✅ Good - Implement recovery suggestions
const recoveryActions = errorUtils.getRecoveryForError(error)

for (const recovery of recoveryActions) {
  if (recovery.action === 'retry' && isRetryableOperation(operation)) {
    return await retryOperation(operation)
  }
}
```

### 5. Custom Error Classes

```typescript
// ✅ Good - Extend with domain-specific functionality
class PaymentError extends Error implements ErrorBase {
  code: string
  amount: number
  currency: string
  timestamp: number

  constructor(code: string, message: string, amount: number, currency: string) {
    super(message)
    this.code = code
    this.amount = amount
    this.currency = currency
    this.timestamp = Date.now()
  }

  // Domain-specific methods
  isRefundable(): boolean {
    return this.amount > 0
  }

  getFormattedAmount(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`
  }
}

// Register and use
ErrorRegistry.register('PaymentError', PaymentError)
const paymentError = ErrorRegistry.create('PaymentError', 'INSUFFICIENT_FUNDS', 'Not enough balance', 100, 'USD')
```

## Migration Guide

### From Generic Errors

```typescript
// Before
throw new Error('Invalid user data')

// After
throw errors.validation('VALIDATION_DATA_INVALID', 'Invalid user data', {
  fields: ['email', 'password']
})
```

### From String-Based Error Codes

```typescript
// Before
throw new Error('VALIDATION_ERROR: Email is required')

// After
throw errors.validation('VALIDATION_MISSING_REQUIRED', 'Email is required', {
  field: 'email'
})
```

### From Framework-Specific Errors

```typescript
// Before (Express)
throw new HttpError(400, 'Bad Request')

// After (still works with custom registration)
ErrorRegistry.register('HttpError', HttpError)
throw ErrorRegistry.create('HttpError', 400, 'Bad Request')
```

## API Reference

### ErrorRegistry

```typescript
class ErrorRegistry {
  static register<K extends keyof AllErrorTypes>(
    name: K,
    constructor: AllErrorTypes[K],
    factory?: ErrorFactory<AllErrorTypes[K]>
  ): void

  static registerBulk(types: Partial<AllErrorTypes>): void

  static get<K extends keyof AllErrorTypes>(name: K): AllErrorTypes[K] | undefined

  static create<K extends keyof AllErrorTypes>(
    name: K,
    ...args: ConstructorParameters<AllErrorTypes[K]>
  ): InstanceType<AllErrorTypes[K]>

  static has(name: keyof AllErrorTypes): boolean

  static getAll(): string[]
}
```

### Error Factory Functions

```typescript
const errors = {
  base(code?, message?, context?, cause?): ErrorBase
  validation(code?, message?, context?, cause?): ErrorBase
  database(code?, message?, context?, cause?): ErrorBase
  permission(code?, message?, context?, cause?): ErrorBase
  notFound(code?, message?, context?, cause?): ErrorBase
  auth(code?, message?, context?, cause?): ErrorBase
  authz(code?, message?, context?, cause?): ErrorBase
  network(code?, message?, context?, cause?): ErrorBase
  config(code?, message?, context?, cause?): ErrorBase
  runtime(code?, message?, context?, cause?): ErrorBase
  generation(code?, message?, context?, cause?): ErrorBase
  template(code?, message?, context?, cause?): ErrorBase
  schema(code?, message?, context?, cause?): ErrorBase
  filesystem(code?, message?, context?, cause?): ErrorBase
  from(error, code?, context?): ErrorBase
  withContext(error, context): ErrorBase
  withCause(error, cause): ErrorBase
  create(code, message?, context?, cause?): ErrorBase
  build(): ErrorBuilder
}
```

### Error Utilities

```typescript
const errorUtils = {
  // Type guards
  isErrorBase(error): boolean
  isStructuredError(error): boolean
  isErrorCode(error, code): boolean
  isErrorCategory(error, category): boolean

  // Formatting
  formatErrorForLogging(error): Record<string, any>
  formatErrorForAPI(error): Record<string, any>

  // Error boundaries
  withErrorBoundary(fn, fallback?, errorCode?): Function
  withAsyncErrorBoundary(fn, fallback?, errorCode?): Function

  // Result conversion (for errors as values)
  toResult(fn, errorCode?): Result<T, ErrorBase>
  toAsyncResult(fn, errorCode?): Promise<Result<T, ErrorBase>>

  // Error processing
  aggregateErrors(errors): ErrorBase
  groupErrorsByCategory(errors): Record<string, ErrorBase[]>
  filterErrorsBySeverity(errors, minSeverity): ErrorBase[]

  // Retry logic
  withRetry(fn, options): Promise<T>

  // Recovery
  getRecoveryForError(error): RecoveryAction[]
  executeRecovery(error, action, context?): Promise<boolean>

  // HTTP integration
  createErrorMiddleware(options?): Function
  getHttpStatusCode(error): number

  // Error chains
  getErrorChain(error): ErrorBase[]
  deduplicateErrors(errors): ErrorBase[]
}
```

### ErrorBuilder

```typescript
class ErrorBuilder {
  withCode(code: ErrorCode): this
  withMessage(message: string): this
  withContext(context: Record<string, any>): this
  withCause(cause: Error): this
  addContext(key: string, value: any): this
  build(): ErrorBase
}
```

## Troubleshooting

### Common Issues

**1. "Error type not registered"**
```typescript
// Solution: Register the error type first
ErrorRegistry.register('MyError', MyErrorClass)
```

**2. TypeScript compilation errors**
```typescript
// Solution: Ensure ErrorBase interface is implemented
class MyError extends Error implements ErrorBase {
  code?: string
  message?: string
  context?: Record<string, any>
  timestamp?: number
}
```

**3. Recovery actions not working**
```typescript
// Solution: Check that error code exists in catalog
import { isValidErrorCode } from 'gen'
console.log(isValidErrorCode('MY_ERROR_CODE')) // Should be true
```

### Debugging

Enable detailed error logging:

```typescript
import { errorUtils } from 'gen'

// Log all errors with full context
try {
  riskyOperation()
} catch (error) {
  console.error('Detailed error:', errorUtils.formatErrorForLogging(error))
}
```

## Contributing

When adding new errors to the catalog:

1. Use consistent naming: `CATEGORY_SPECIFIC_ERROR`
2. Include recovery suggestions when possible
3. Add appropriate severity levels
4. Update this documentation

When extending the system:

1. Maintain backward compatibility
2. Follow existing type patterns
3. Add comprehensive tests
4. Update documentation

---

The error system provides a solid foundation for robust error handling while remaining flexible enough to adapt to any application's needs. Its type-safe design helps catch errors at compile time, and its extensible architecture ensures it can grow with your application. </content>
</xai:function_call">Read: Successfully created file /c:/Users/Patrick/gen/ERROR_SYSTEM.md
