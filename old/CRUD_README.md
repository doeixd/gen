# 🚀 Comprehensive CRUD Generator

Automatically generate complete CRUD interfaces from your Convex schemas with customizable field mappings, TanStack Table virtual scrolling, and full route generation. Built with TypeScript and robust error handling for production reliability.

## Features

✨ **Full CRUD Routes** - List, Detail, Edit, Create for every table
📊 **Virtual Tables** - TanStack Table + TanStack Virtual for performant lists
🎨 **Customizable Mappings** - Override field components and validations
📝 **Type-Safe** - Full TypeScript with generated interfaces
🔄 **Real-time Sync** - TanStack DB integration for live updates
🎯 **Smart Defaults** - Intelligent field type detection with custom overrides
🛡️ **Production-Ready** - Robust error handling and transaction safety
⚡ **Performance Optimized** - Virtual scrolling handles thousands of records
🔧 **CLI Options** - Dry-run, selective generation, backup, and more

## Quick Start

```bash
# Generate everything at once (recommended)
npm run generate:all

# Or step by step
npm run generate:convex  # Convex CRUD functions
npm run generate:forms   # Form components
npm run generate:crud    # Full CRUD routes
```

## CLI Options

```bash
# Preview changes without writing files
npm run generate:crud -- --dry-run

# Generate only specific tables
npm run generate:crud -- --tables products,todos

# Create backups before overwriting
npm run generate:crud -- --backup

# Detailed logging and progress
npm run generate:crud -- --verbose

# Skip existing files (incremental)
npm run generate:crud -- --incremental

# Force overwrite without confirmation
npm run generate:crud -- --force

# Configure virtual scrolling
npm run generate:crud -- --virtual-scroll --page-size 100
```

## Generated Route Structure

For each table in your schema, the generator creates:

```
/products/
├── index.tsx          # List view with virtual table
├── create.tsx         # Create form
├── $id.tsx            # Detail view
└── $id/
    └── edit.tsx       # Edit form
```

### Route URLs

| Route | Purpose | Features |
|-------|---------|----------|
| `/products` | List all products | Virtual scrolling, sorting, search |
| `/products/create` | Create new product | Form with validation |
| `/products/:id` | View product details | Formatted fields, delete action |
| `/products/:id/edit` | Edit product | Pre-filled form, update |

## TypeScript Architecture

The CRUD generator is built with TypeScript for maximum reliability:

- **Type-safe configuration** in `scripts/field-mappings.config.ts`
- **Generated interfaces** for all table types
- **Neverthrow error handling** throughout the generation process
- **Comprehensive logging** with structured reports and metrics
- **Safe file operations** with backup and recovery capabilities

## Field Mapping Configuration

The system uses `scripts/field-mappings.config.ts` for type-safe customization.

### Type Mappings

Default mappings for Convex types in `scripts/field-mappings.config.ts`:

```typescript
export const defaultTypeMappings: Record<string, FieldConfig> = {
  string: {
    formComponent: 'TextField',
    displayComponent: 'Text',
    zodValidation: 'z.string()',
  },
  number: {
    formComponent: 'NumberField',
    displayComponent: 'Number',
    zodValidation: 'z.number()',
  },
  boolean: {
    formComponent: 'Checkbox',
    displayComponent: 'Badge',
    zodValidation: 'z.boolean()',
  },
}
```

### Field Name Patterns

Override based on field names in TypeScript:

```typescript
export const fieldNamePatterns: Record<string, Partial<FieldConfig>> = {
  email: {
    formComponent: 'TextField',
    zodValidation: 'z.string().email("Invalid email address")',
    props: { type: 'email', placeholder: 'user@example.com' },
  },
  description: {
    formComponent: 'TextArea',
    props: { rows: 4 },
  },
  price: {
    formComponent: 'NumberField',
    displayComponent: 'Currency',
    zodValidation: 'z.number().min(0, "Price must be positive")',
    props: { min: 0, step: 0.01 },
  },
}
```

### Table-Specific Overrides

Customize per table with full type safety:

```typescript
export const tableFieldOverrides: Record<string, Record<string, Partial<FieldConfig>>> = {
  products: {
    title: {
      zodValidation: 'z.string().min(3, "Too short").max(100, "Too long")',
      props: { placeholder: 'Product name', maxLength: 100 },
    },
    description: {
      formComponent: 'RichTextEditor', // Custom component
    },
  },
}
```

## Customization Examples

### Example 1: Add Email Field to Users Table

**Schema:**
```typescript
// convex/schema.ts
users: defineTable({
  id: v.string(),
  name: v.string(),
  email: v.string(),
})
```

**Auto-detected behavior:**
- Form component: TextField with type="email"
- Validation: `z.string().email()`
- Display: Clickable email link

### Example 2: Custom Product Fields

```typescript
// scripts/field-mappings.config.ts
export const tableFieldOverrides: Record<string, Record<string, Partial<FieldConfig>>> = {
  products: {
    title: {
      zodValidation: 'z.string().min(3, "Too short").max(100, "Too long")',
      props: {
        placeholder: 'Enter product name',
        maxLength: 100,
      },
    },
    description: {
      formComponent: 'TextArea',
      props: { rows: 6, placeholder: 'Detailed description...' },
    },
    price: {
      displayComponent: 'Currency',
      props: { min: 0, step: 0.01 },
    },
    inStock: {
      displayComponent: 'StockBadge', // Custom component
    },
  },
}
```

### Example 3: Exclude Fields

```typescript
// Don't show in forms
export const excludeFromForms = ['id', '_id', '_creationTime', 'createdAt', 'updatedAt']

// Don't show in list view
export const excludeFromList = ['_id', 'description', 'content', 'bio']
```

### Example 4: Table Display Config

```typescript
export const tableDisplayConfig: Record<string, TableDisplayOptions> = {
  products: {
    columns: ['title', 'price', 'inStock'], // Only these columns
    sortable: ['title', 'price'],           // Enable sorting
    searchable: ['title'],                  // Enable search
  },
}
```

## Robust Error Handling & Reliability

The CRUD generator includes enterprise-grade error handling:

### Neverthrow Integration
- **Structured errors** with error codes and context
- **Type-safe error handling** throughout the generation process
- **Recovery mechanisms** for common failure scenarios

### Transaction Safety
- **Proper TanStack DB transactions** for all mutations
- **Optimistic updates** with automatic rollback on failure
- **Confirmation dialogs** for destructive operations

### File Operation Safety
- **Backup creation** before overwriting existing files
- **Dry-run mode** to preview changes without writing
- **Incremental generation** to avoid unnecessary overwrites

## Component Architecture

### List View Features

```tsx
// Auto-generated in routes/{table}/index.tsx
- TanStack Table for data management
- TanStack Virtual for rendering performance
- Sortable columns
- View/Edit action buttons
- Create button
- Item count
- Responsive design
```

### Detail View Features

```tsx
// Auto-generated in routes/{table}/$id.tsx
- Formatted field display
- Edit button
- Delete button with confirmation
- Back navigation
- Type-safe data access
```

### Form Features

```tsx
// Auto-generated in components/forms/{Table}Form.tsx
- TanStack Form integration
- Zod validation
- Smart field components
- Error messages
- Loading states
- Create/Update modes
- Cancel button
```

## Display Components

Customize how fields appear in list and detail views:

```javascript
displayComponents: {
  Text: (value) => value,
  Number: (value) => value?.toLocaleString(),
  Currency: (value) => `$${value?.toFixed(2)}`,
  Badge: (value) => value ? '✅' : '❌',
  DateTime: (value) => new Date(value).toLocaleString(),
  Email: (value) => `<a href="mailto:${value}">${value}</a>`,
  Image: (value) => `<img src="${value}" />`,
}
```

## Route Configuration

Control what gets generated:

```javascript
routeConfig: {
  generateIndex: true,    // List view
  generateDetail: true,   // Detail view
  generateEdit: true,     // Edit form
  generateCreate: true,   // Create form
  defaultPageSize: 20,
  enableVirtualScrolling: true,
}
```

## Full Workflow

### 1. Define Schema

```typescript
// convex/schema.ts
export default defineSchema({
  products: defineTable({
    id: v.string(),
    title: v.string(),
    description: v.string(),
    price: v.number(),
    inStock: v.boolean(),
    imageUrl: v.optional(v.string()),
  }).index('by_id', ['id']),
})
```

### 2. Customize Mappings (Optional)

```javascript
// scripts/field-mappings.config.js
tableFieldOverrides: {
  products: {
    description: {
      formComponent: 'TextArea',
      props: { rows: 5 },
    },
  },
}
```

### 3. Generate

```bash
npm run generate:all
```

### 4. Use

Navigate to:
- `/products` - Browse all products
- `/products/create` - Add new product
- `/products/123` - View product details
- `/products/123/edit` - Edit product

## Advanced Customization

### Custom Form Components

1. Create custom component:

```tsx
// src/components/demo.FormComponents.tsx
export function RichTextEditor({ label }: { label: string }) {
  const field = useFieldContext<string>()
  // Custom implementation
}
```

2. Register in hook:

```tsx
// src/hooks/demo.form.ts
export const { useAppForm } = createFormHook({
  fieldComponents: {
    TextField,
    NumberField,
    RichTextEditor, // Add here
  },
})
```

3. Use in mappings:

```javascript
// scripts/field-mappings.config.js
tableFieldOverrides: {
  posts: {
    content: {
      formComponent: 'RichTextEditor',
    },
  },
}
```

### Custom Display Components

```tsx
// In table cell rendering
cell: (info) => {
  const value = info.getValue()
  if (field.config.displayComponent === 'StockBadge') {
    return value ? (
      <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
        In Stock
      </span>
    ) : (
      <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
        Out of Stock
      </span>
    )
  }
}
```

### Custom Validation Rules

```javascript
validationRules: {
  password: (field) => {
    return 'z.string().min(8, "Password must be at least 8 characters").regex(/[A-Z]/, "Must contain uppercase")'
  },
}
```

## Generated Files Overview

```
📁 scripts/
├── generate-convex-functions.ts    ✅ TypeScript CRUD generator
├── generate-forms.ts               ✅ TypeScript form generator
├── generate-crud.ts                ✅ TypeScript route generator
├── field-mappings.config.ts        ✅ Type-safe configuration
└── utils/
    ├── errors.ts                   ✅ Structured error handling
    ├── logger.ts                   ✅ Advanced logging system
    ├── schema-parser.ts            ✅ Robust schema parsing
    ├── zod-codegen.ts              ✅ Zod validator generation
    ├── file-system.ts              ✅ Safe file operations
    └── config.ts                   ✅ CLI configuration

📁 src/
├── components/
│   └── forms/
│       ├── ProductForm.tsx         ✅ Generated form component
│       └── TodoForm.tsx
├── lib/
│   └── collections.ts              ✅ TanStack DB setup
└── routes/
    ├── products/
    │   ├── index.tsx               ✅ Virtual table list view
    │   ├── create.tsx              ✅ Create form route
    │   ├── $id.tsx                 ✅ Detail view
    │   └── $id/
    │       └── edit.tsx            ✅ Edit form route
    └── todos/
        ├── index.tsx
        ├── create.tsx
        ├── $id.tsx
        └── $id/
            └── edit.tsx
```

## TypeScript Support

All generated code is fully typed:

```typescript
// Auto-generated interfaces
export interface Product {
  id: string;
  title: string;
  price: number;
  inStock: boolean;
}

// Type-safe collection
const items = Array.from(productsCollection.state.values()) // Product[]

// Type-safe params
const { id } = Route.useParams() // string
```

## Performance

- **Virtual Scrolling**: Handles thousands of rows efficiently
- **Real-time Sync**: TanStack DB optimistic updates
- **Lazy Loading**: Only visible rows are rendered
- **Memoization**: React optimization built-in

## Troubleshooting

### Forms not appearing
- Check that field mappings are configured
- Ensure `useAppForm` includes all field components
- Verify routes are in correct directory structure

### Table not showing data
- Ensure `VITE_CONVEX_URL` is set
- Check Convex client connection
- Verify collection is initialized in `collections.ts`

### Validation errors
- Check Zod schema in field mappings
- Verify required fields have proper defaults
- Review browser console for details

## Best Practices

1. **Run generators in order**: convex → forms → crud
2. **Customize before generating**: Set up field mappings first
3. **Version control**: Commit before regenerating
4. **Test incrementally**: Generate one table at a time initially
5. **Extend, don't replace**: Generated code is a starting point

## Next Steps

- Add authentication to routes
- Implement pagination for large datasets
- Add bulk actions (select multiple, delete multiple)
- Create custom themes
- Add export functionality (CSV, PDF)
- Implement search and filters

## Examples Repository

See `scripts/field-mappings.config.js` for complete examples of:
- Email validation
- Price formatting
- Image fields
- Status badges
- Date/time display
- Custom components

## Support

For issues or questions:
1. Check field mappings configuration
2. Review generated code
3. Inspect browser console
4. Verify Convex connection

---

**Happy CRUDing! 🎉**
