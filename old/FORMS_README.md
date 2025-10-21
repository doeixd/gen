# TanStack Form Generator

Automatically generate type-safe TanStack Form components from your Convex schema, with full integration to TanStack DB collections. Built with TypeScript and robust error handling for production reliability.

## Features

✨ **Schema-Driven Forms** - Forms are automatically generated from your Convex schema
📝 **Type-Safe** - Full TypeScript support with generated interfaces
🔄 **TanStack DB Integration** - Direct CRUD operations with collections
✅ **Zod Validation** - Automatic validation schemas from Convex types
🎨 **Styled Components** - Beautiful forms with Tailwind CSS
🔢 **Smart Field Types** - Automatic field selection based on data types
🛡️ **Production-Ready** - Robust error handling and transaction safety
⚡ **CLI Options** - Dry-run, selective generation, backup, and more

## Usage

```bash
npm run generate:forms
```

## CLI Options

```bash
# Preview changes without writing files
npm run generate:forms -- --dry-run

# Generate only specific tables
npm run generate:forms -- --tables products,todos

# Create backups before overwriting
npm run generate:forms -- --backup

# Detailed logging and progress
npm run generate:forms -- --verbose

# Skip existing files (incremental)
npm run generate:forms -- --incremental

# Specify form hook to use
npm run generate:forms -- --form-hook useAppForm

# Set validation mode
npm run generate:forms -- --validation-mode onBlur
```

## TypeScript Architecture

The Forms generator is built with TypeScript for maximum reliability:

- **Type-safe form generation** with generated interfaces
- **Neverthrow error handling** throughout the generation process
- **Advanced schema parsing** with complex Convex type support
- **Comprehensive logging** with structured reports and metrics
- **Safe file operations** with backup and recovery capabilities

## What Gets Generated

For each table in your Convex schema, the script generates:

### 1. Form Component (`src/components/forms/{Table}Form.tsx`)
- **TypeScript interfaces** for form data with full type safety
- **Zod validation schema** automatically generated from Convex types
- **Form component** with TanStack Form integration
- **CRUD operations** with proper TanStack DB transaction handling
- **Error handling** and loading states with user feedback
- **Real-time sync** with optimistic updates and rollback

### 2. Route File (`src/routes/forms/{table}.tsx`)
- **TanStack Router configuration** with proper route setup
- **Collection initialization** with error recovery
- **Success/error handlers** with navigation and user feedback

### 3. Collections File (`src/lib/collections.ts`)
- **Centralized collection exports** for all generated tables
- **Type-safe collection map** with full TypeScript support
- **Convex client initialization** with connection handling

## Field Type Mapping

The generator automatically maps Convex types to appropriate form fields:

| Convex Type | Form Component | Zod Validator | Default Value |
|-------------|----------------|---------------|---------------|
| `v.string()` | TextField | `z.string()` | `''` |
| `v.number()` | NumberField | `z.number()` | `0` |
| `v.boolean()` | Checkbox | `z.boolean()` | `false` |
| `v.optional(T)` | Same as T | `z.T().optional()` | `undefined` |
| `v.array(T)` | TextField | `z.array(z.any())` | `[]` |
| `v.id('table')` | TextField | `z.string()` | `''` |

## Example Generated Form

### Schema
```typescript
// convex/schema.ts
export default defineSchema({
  products: defineTable({
    id: v.string(),
    title: v.string(),
    price: v.number(),
    inStock: v.boolean(),
  }).index('by_id', ['id']),
})
```

### Generated Form Component
```tsx
// src/components/forms/ProductForm.tsx
export interface ProductFormData {
  title: string;
  price: number;
  inStock: boolean;
}

export function ProductForm({ collection, initialData, onSuccess, onError }: ProductFormProps) {
  const form = useAppForm({
    defaultValues: initialData || {
      title: '',
      price: 0,
      inStock: false,
    },
    validators: {
      onBlur: productSchema, // Auto-generated Zod schema
    },
    onSubmit: async ({ value }) => {
      try {
        const id = initialData?.id || crypto.randomUUID()
        const transaction = collection.insert({ id, ...value })

        // Wait for transaction to complete with error handling
        await transaction.isPersisted.promise

        onSuccess?.()
      } catch (error) {
        console.error('Failed to save product:', error)
        onError?.(error)
      }
    },
  })

  return (
    <form onSubmit={form.handleSubmit} className="space-y-4">
      <form.AppField name="title">
        {(field) => <field.TextField label="Title" placeholder="Enter product title" />}
      </form.AppField>

      <form.AppField name="price">
        {(field) => <field.NumberField label="Price" min={0} step={0.01} />}
      </form.AppField>

      <form.AppField name="inStock">
        {(field) => <field.Checkbox label="In Stock" />}
      </form.AppField>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={form.state.isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {form.state.isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Create'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
```

## Using Generated Forms

### Option 1: Via Routes
Navigate to `/forms/{tablename}` in your app:
- `/forms/products` - Product form
- `/forms/todos` - Todo form

### Option 2: Import Directly
```tsx
import { ProductForm } from '@/components/forms/ProductForm'
import { productsCollection } from '@/lib/collections'

function MyPage() {
  return (
    <ProductForm
      collection={productsCollection}
      onSuccess={() => console.log('Saved!')}
    />
  )
}
```

### Option 3: Edit Mode
```tsx
const existingProduct = { id: '123', title: 'Laptop', price: 999 }

<ProductForm
  collection={productsCollection}
  initialData={existingProduct}
  onSuccess={() => console.log('Updated!')}
  onCancel={() => console.log('Cancelled')}
/>
```

## Collections API

All generated collections are exported from `src/lib/collections.ts`:

```tsx
import { productsCollection, todosCollection, collections } from '@/lib/collections'

// Direct access
productsCollection.insert({ id: '123', title: 'New Product', price: 99 })

// Dynamic access
const collectionName = 'products'
collections[collectionName].insert(...)

// Get Convex client
import { convexClient } from '@/lib/collections'
```

## Customizing Generated Forms

Generated forms are meant to be a starting point. You can:

1. **Edit the generated files** - They won't be overwritten unless you run the generator again
2. **Add custom validation** - Extend the Zod schemas
3. **Custom field components** - Replace TextField/NumberField with custom components
4. **Add business logic** - Extend onSubmit handlers

## Re-generating Forms

When you change your Convex schema:

```bash
# 1. Update Convex functions
npm run generate:convex

# 2. Regenerate forms
npm run generate:forms
```

⚠️ **Warning**: Re-running the generator will overwrite existing form files. Commit your changes or back up customizations first!

## Form Components Available

The generator uses these form components from `@/components/demo.FormComponents`:

- **TextField** - Single-line text input
- **NumberField** - Number input with min/max/step
- **Checkbox** - Boolean checkbox with label
- **TextArea** - Multi-line text input
- **Select** - Dropdown selection

## Advanced: Custom Field Mapping

To customize how types map to fields, edit `scripts/generate-forms.js`:

```javascript
function convexTypeToFieldComponent(field) {
  if (field.name === 'description') return 'TextArea' // Force TextArea
  if (field.name.includes('email')) return 'EmailField' // Custom component

  // Default mapping
  switch (field.type) {
    case 'string': return 'TextField'
    case 'number': return 'NumberField'
    case 'boolean': return 'Checkbox'
    default: return 'TextField'
  }
}
```

## Robust Error Handling & Reliability

The Forms generator includes enterprise-grade error handling:

### Transaction Safety
- **Proper TanStack DB transactions** for all form submissions
- **Optimistic updates** with automatic rollback on failure
- **Loading states** with disabled submit buttons during operations
- **Error recovery** with user-friendly error messages

### Validation & User Experience
- **Real-time validation** with configurable validation modes
- **Field-level error display** with clear messaging
- **Form submission feedback** with success/error states
- **Cancel operations** with confirmation where appropriate

### File Operation Safety
- **Backup creation** before overwriting existing files
- **Dry-run mode** to preview changes without writing
- **Incremental generation** to avoid unnecessary overwrites

## Troubleshooting

### Forms not showing up
- Ensure routes are in `src/routes/forms/` directory
- Check TanStack Router is configured to discover routes
- Verify `VITE_CONVEX_URL` is set in your `.env` file
- Check browser console for TypeScript errors

### Type errors
- Run `npm run generate:convex` to regenerate Convex types
- Make sure `convex/schema.ts` is valid and matches generated forms
- Check that field types match between schema and generated forms
- Verify all required form components are registered in the form hook

### Collection not syncing
- Verify Convex client is connected and authenticated
- Check browser console for connection errors
- Ensure Convex deployment URL is correct
- Confirm collection is properly initialized in `collections.ts`

### Form validation issues
- Check Zod schema generation in the form component
- Verify field mappings configuration is correct
- Ensure custom validation rules are properly formatted
- Test with different validation modes (onBlur vs onChange)

### Transaction failures
- Check TanStack DB collection setup
- Verify proper transaction handling with `isPersisted.promise`
- Ensure error boundaries are in place for transaction failures
- Review browser network tab for Convex API errors

## Full Workflow Example

```bash
# 1. Define your schema
# Edit convex/schema.ts

# 2. Generate Convex functions with verbose logging
npm run generate:convex -- --verbose

# 3. Generate forms with backup (safety first!)
npm run generate:forms -- --backup --verbose

# 4. Or generate everything at once
npm run generate:all -- --backup --verbose

# 5. Start dev server
npm run dev

# 6. Visit your generated routes
# http://localhost:3000/products (full CRUD)
# http://localhost:3000/forms/products (standalone form)
```

## Advanced Configuration

### Custom Form Hooks

The generator supports different form hook configurations:

```bash
# Use a specific form hook
npm run generate:forms -- --form-hook useCustomForm

# Set validation timing
npm run generate:forms -- --validation-mode onChange
```

### Selective Generation

```bash
# Generate forms for specific tables only
npm run generate:forms -- --tables users,products

# Skip existing files to speed up regeneration
npm run generate:forms -- --incremental
```

### Production Safety

```bash
# Always backup before major changes
npm run generate:forms -- --backup

# Preview changes first
npm run generate:forms -- --dry-run --verbose
```

## Integration with TanStack DB

Generated forms use TanStack DB collections for:
- **Real-time sync** - Forms reflect database changes instantly
- **Optimistic updates** - UI updates before server confirms
- **Automatic rollback** - Failed mutations revert automatically
- **Type safety** - Full TypeScript support

## Next Steps

- Add array field support for `v.array()` types
- Generate list/table views alongside forms
- Add file upload for `v.string()` fields marked as images
- Generate API documentation from schemas
- Add form field conditionals and dependencies

## Contributing

To improve the generator:
1. Edit `scripts/generate-forms.js`
2. Test with various schema configurations
3. Submit improvements to the team
