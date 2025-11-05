/**
 * Entity Templates and Patterns
 * Type-safe factory functions for common entity patterns
 */

import { createEntity } from './helpers'
import { dbTypes } from './database'
import { validators } from './validators'
import { ComponentRegistry } from './components'

/**
 * User entity template
 */
export function createUserEntity(options?: {
  includeProfile?: boolean
  includeAuth?: boolean
  tableName?: string
}) {
  const { includeProfile = true, includeAuth = true, tableName = 'users' } = options || {}

  return createEntity({
    id: 'user',
    name: { singular: 'User', plural: 'Users' },
    db: {
      table: { name: tableName, primaryKey: ['id'] },
      columns: {
        id: { type: dbTypes.uuid().primaryKey() },
        email: { type: dbTypes.string(255), unique: true },
        username: { type: dbTypes.string(50), unique: true },
        firstName: { type: dbTypes.string(100) },
        lastName: { type: dbTypes.string(100) },
        ...(includeAuth && {
          passwordHash: { type: dbTypes.string(255) },
          emailVerified: { type: dbTypes.boolean().default(false) },
          lastLoginAt: { type: dbTypes.timestamp() },
        }),
        ...(includeProfile && {
          avatar: { type: dbTypes.string(500) },
          bio: { type: dbTypes.string(1000) },
        }),
        createdAt: { type: dbTypes.timestamp().defaultNow() },
        updatedAt: { type: dbTypes.timestamp().defaultNow() },
      },
    },
    fields: {
      id: {
        component: ComponentRegistry.get('TextField')!,
        standardSchema: validators.uuid,
      },
      email: {
        component: ComponentRegistry.get('EmailField')!,
        standardSchema: validators.email,
        sortable: true,
        filterable: true,
      },
      username: {
        component: ComponentRegistry.get('TextField')!,
        standardSchema: validators.stringMin(3),
        sortable: true,
        filterable: true,
      },
      firstName: {
        component: ComponentRegistry.get('TextField')!,
        standardSchema: validators.stringMin(1),
        sortable: true,
      },
      lastName: {
        component: ComponentRegistry.get('TextField')!,
        standardSchema: validators.stringMin(1),
        sortable: true,
      },
      ...(includeAuth && {
        passwordHash: {
          component: ComponentRegistry.get('TextField')!,
          standardSchema: validators.stringMin(8),
          excludeFromForms: true,
          excludeFromList: true,
        },
        emailVerified: {
          component: ComponentRegistry.get('Checkbox')!,
          standardSchema: validators.boolean,
          defaultValue: false,
        },
        lastLoginAt: {
          component: ComponentRegistry.get('DateTime')!,
          standardSchema: validators.date,
          editable: false,
        },
      }),
      ...(includeProfile && {
        avatar: {
          component: ComponentRegistry.get('TextField')!,
          standardSchema: validators.optional(validators.url),
        },
        bio: {
          component: ComponentRegistry.get('TextArea')!,
          standardSchema: validators.optional(validators.string),
        },
      }),
      createdAt: {
        component: ComponentRegistry.get('DateTime')!,
        standardSchema: validators.date,
        editable: false,
      },
      updatedAt: {
        component: ComponentRegistry.get('DateTime')!,
        standardSchema: validators.date,
        editable: false,
      },
    },
    permissions: {
      role: {
        user: { read: true, write: true },
        admin: { read: true, write: true, delete: true },
      },
    },
    routes: {
      api: {
        basePath: '/api/users',
        endpoints: {
          list: { method: 'GET', path: '/' },
          get: { method: 'GET', path: '/:id' },
          create: { method: 'POST', path: '/' },
          update: { method: 'PUT', path: '/:id' },
          delete: { method: 'DELETE', path: '/:id' },
        },
      },
    },
    codegen: {
      generateAPI: true,
      generateComponents: true,
      generateGraphQL: true,
      searchableFields: ['email', 'username', 'firstName', 'lastName'],
      indexedFields: ['email', 'username'],
      auditChanges: true,
    },
  })
}

/**
 * Product entity template
 */
export function createProductEntity(options?: {
  includeInventory?: boolean
  includePricing?: boolean
  tableName?: string
}) {
  const { includeInventory = true, includePricing = true, tableName = 'products' } = options || {}

  return createEntity({
    id: 'product',
    name: { singular: 'Product', plural: 'Products' },
    db: {
      table: { name: tableName, primaryKey: ['id'] },
      columns: {
        id: { type: dbTypes.uuid().primaryKey() },
        name: { type: dbTypes.string(255) },
        description: { type: dbTypes.string(2000) },
        sku: { type: dbTypes.string(100), unique: true },
        category: { type: dbTypes.string(100) },
        ...(includePricing && {
          price: { type: dbTypes.decimal(10, 2) },
          currency: { type: dbTypes.string(3).default('USD') },
          discountPrice: { type: dbTypes.decimal(10, 2) },
        }),
        ...(includeInventory && {
          stockQuantity: { type: dbTypes.integer().default(0) },
          minStockLevel: { type: dbTypes.integer().default(0) },
          isActive: { type: dbTypes.boolean().default(true) },
        }),
        createdAt: { type: dbTypes.timestamp().defaultNow() },
        updatedAt: { type: dbTypes.timestamp().defaultNow() },
      },
    },
    fields: {
      id: {
        component: ComponentRegistry.get('TextField')!,
        standardSchema: validators.uuid,
      },
      name: {
        component: ComponentRegistry.get('TextField')!,
        standardSchema: validators.stringMin(1),
        sortable: true,
        filterable: true,
      },
      description: {
        component: ComponentRegistry.get('TextArea')!,
        standardSchema: validators.optional(validators.string),
      },
      sku: {
        component: ComponentRegistry.get('TextField')!,
        standardSchema: validators.stringMin(1),
        sortable: true,
        filterable: true,
      },
      category: {
        component: ComponentRegistry.get('Select')!,
        standardSchema: validators.string,
        filterable: true,
      },
      ...(includePricing && {
        price: {
          component: ComponentRegistry.get('NumberField')!,
          standardSchema: validators.numberMin(0),
          sortable: true,
          filterable: true,
        },
        currency: {
          component: ComponentRegistry.get('Select')!,
          standardSchema: validators.string,
          defaultValue: 'USD',
        },
        discountPrice: {
          component: ComponentRegistry.get('NumberField')!,
          standardSchema: validators.optional(validators.numberMin(0)),
        },
      }),
      ...(includeInventory && {
        stockQuantity: {
          component: ComponentRegistry.get('NumberField')!,
          standardSchema: validators.integer,
          sortable: true,
          filterable: true,
        },
        minStockLevel: {
          component: ComponentRegistry.get('NumberField')!,
          standardSchema: validators.integer,
          defaultValue: 0,
        },
        isActive: {
          component: ComponentRegistry.get('Checkbox')!,
          standardSchema: validators.boolean,
          defaultValue: true,
          filterable: true,
        },
      }),
      createdAt: {
        component: ComponentRegistry.get('DateTime')!,
        standardSchema: validators.date,
        editable: false,
      },
      updatedAt: {
        component: ComponentRegistry.get('DateTime')!,
        standardSchema: validators.date,
        editable: false,
      },
    },
    permissions: {
      role: {
        user: { read: true },
        admin: { read: true, write: true, delete: true },
        manager: { read: true, write: true },
      },
    },
    routes: {
      api: {
        basePath: '/api/products',
        endpoints: {
          list: { method: 'GET', path: '/' },
          get: { method: 'GET', path: '/:id' },
          create: { method: 'POST', path: '/' },
          update: { method: 'PUT', path: '/:id' },
          delete: { method: 'DELETE', path: '/:id' },
        },
      },
    },
    codegen: {
      generateAPI: true,
      generateComponents: true,
      searchableFields: ['name', 'description', 'sku'],
      indexedFields: ['sku', 'category'],
      auditChanges: true,
    },
  })
}

/**
 * Post/Blog entity template
 */
export function createPostEntity(options?: {
  includeAuthor?: boolean
  includeTags?: boolean
  includeComments?: boolean
  tableName?: string
}) {
  const { includeAuthor = true, includeTags = true, includeComments = true, tableName = 'posts' } = options || {}

  return createEntity({
    id: 'post',
    name: { singular: 'Post', plural: 'Posts' },
    db: {
      table: { name: tableName, primaryKey: ['id'] },
      columns: {
        id: { type: dbTypes.uuid().primaryKey() },
        title: { type: dbTypes.string(500) },
        slug: { type: dbTypes.string(500), unique: true },
        content: { type: dbTypes.text() },
        excerpt: { type: dbTypes.string(1000) },
        ...(includeAuthor && {
          authorId: { type: dbTypes.uuid() },
        }),
        status: { type: dbTypes.string(20).default('draft') },
        publishedAt: { type: dbTypes.timestamp() },
        createdAt: { type: dbTypes.timestamp().defaultNow() },
        updatedAt: { type: dbTypes.timestamp().defaultNow() },
      },
    },
    fields: {
      id: {
        component: ComponentRegistry.get('TextField')!,
        standardSchema: validators.uuid,
      },
      title: {
        component: ComponentRegistry.get('TextField')!,
        standardSchema: validators.stringMin(1),
        sortable: true,
        filterable: true,
      },
      slug: {
        component: ComponentRegistry.get('TextField')!,
        standardSchema: validators.string,
        sortable: true,
      },
      content: {
        component: ComponentRegistry.get('RichTextEditor')!,
        standardSchema: validators.stringMin(1),
      },
      excerpt: {
        component: ComponentRegistry.get('TextArea')!,
        standardSchema: validators.optional(validators.string),
      },
      ...(includeAuthor && {
        authorId: {
          component: ComponentRegistry.get('Select')!,
          standardSchema: validators.uuid,
          filterable: true,
        },
      }),
      status: {
        component: ComponentRegistry.get('Select')!,
        standardSchema: validators.enum(['draft', 'published', 'archived']),
        defaultValue: 'draft',
        filterable: true,
      },
      publishedAt: {
        component: ComponentRegistry.get('DateTime')!,
        standardSchema: validators.optional(validators.date),
      },
      createdAt: {
        component: ComponentRegistry.get('DateTime')!,
        standardSchema: validators.date,
        editable: false,
      },
      updatedAt: {
        component: ComponentRegistry.get('DateTime')!,
        standardSchema: validators.date,
        editable: false,
      },
    },
    permissions: {
      role: {
        user: { read: true },
        author: { read: true, write: true },
        admin: { read: true, write: true, delete: true },
      },
      ownership: includeAuthor ? {
        required: true,
        ownerField: 'authorId',
      } : undefined,
    },
    routes: {
      api: {
        basePath: '/api/posts',
        endpoints: {
          list: { method: 'GET', path: '/' },
          get: { method: 'GET', path: '/:id' },
          create: { method: 'POST', path: '/' },
          update: { method: 'PUT', path: '/:id' },
          delete: { method: 'DELETE', path: '/:id' },
        },
      },
    },
    codegen: {
      generateAPI: true,
      generateComponents: true,
      searchableFields: ['title', 'content', 'excerpt'],
      indexedFields: ['slug', 'status', 'authorId'],
      auditChanges: true,
    },
  })
}

/**
 * Address field preset
 */
export function createAddressFields(prefix = '') {
  const fields: any = {}

  const addressFields = {
    [`${prefix}street`]: {
      component: ComponentRegistry.get('TextField')!,
      standardSchema: validators.stringMin(1),
      label: 'Street Address',
      formOrder: 1,
    },
    [`${prefix}city`]: {
      component: ComponentRegistry.get('TextField')!,
      standardSchema: validators.stringMin(1),
      label: 'City',
      formOrder: 2,
    },
    [`${prefix}state`]: {
      component: ComponentRegistry.get('TextField')!,
      standardSchema: validators.stringMin(1),
      label: 'State/Province',
      formOrder: 3,
    },
    [`${prefix}postalCode`]: {
      component: ComponentRegistry.get('TextField')!,
      standardSchema: validators.stringMin(1),
      label: 'Postal Code',
      formOrder: 4,
    },
    [`${prefix}country`]: {
      component: ComponentRegistry.get('Select')!,
      standardSchema: validators.stringMin(1),
      label: 'Country',
      formOrder: 5,
    },
  }

  return {
    fields: addressFields,
    columns: Object.keys(addressFields).reduce((acc, key) => ({
      ...acc,
      [key]: { type: dbTypes.string(255) }
    }), {}),
    formGroup: 'address',
  }
}

/**
 * Social media fields preset
 */
export function createSocialMediaFields() {
  const socialFields = {
    twitter: {
      component: ComponentRegistry.get('TextField')!,
      standardSchema: validators.optional(validators.string),
      label: 'Twitter',
      placeholder: '@username',
    },
    linkedin: {
      component: ComponentRegistry.get('TextField')!,
      standardSchema: validators.optional(validators.url),
      label: 'LinkedIn',
      placeholder: 'https://linkedin.com/in/username',
    },
    github: {
      component: ComponentRegistry.get('TextField')!,
      standardSchema: validators.optional(validators.string),
      label: 'GitHub',
      placeholder: 'username',
    },
    website: {
      component: ComponentRegistry.get('TextField')!,
      standardSchema: validators.optional(validators.url),
      label: 'Website',
      placeholder: 'https://example.com',
    },
  }

  return {
    fields: socialFields,
    columns: Object.keys(socialFields).reduce((acc, key) => ({
      ...acc,
      [key]: { type: dbTypes.string(500) }
    }), {}),
    formGroup: 'social',
  }
}

/**
 * Relationship factory functions for common patterns
 */
export const relationshipHelpers = {
  /**
   * Belongs to relationship (many-to-one)
   */
  belongsTo: (
    foreignEntity: string,
    foreignKey: string,
    options?: {
      localKey?: string
      displayField?: string
      eager?: boolean
      cascade?: boolean
    }
  ) => ({
    type: 'many-to-one' as const,
    foreignEntity,
    foreignKey,
    localKey: options?.localKey || 'id',
    display: {
      displayField: options?.displayField || 'name',
      eager: options?.eager || false,
    },
    ...(options?.cascade && {
      db: {
        foreignKey: {
          onDelete: 'cascade' as const,
          onUpdate: 'cascade' as const,
        }
      }
    })
  }),

  /**
   * Has many relationship (one-to-many)
   */
  hasMany: (
    foreignEntity: string,
    foreignKey: string,
    options?: {
      displayField?: string
      eager?: boolean
      cascade?: boolean
      limit?: number
    }
  ) => ({
    type: 'one-to-many' as const,
    foreignEntity,
    foreignKey,
    display: {
      displayField: options?.displayField || 'name',
      eager: options?.eager || false,
      limit: options?.limit,
    },
    ...(options?.cascade && {
      db: {
        foreignKey: {
          onDelete: 'cascade' as const,
          onUpdate: 'cascade' as const,
        }
      }
    })
  }),

  /**
   * Belongs to many relationship (many-to-many)
   */
  belongsToMany: (
    foreignEntity: string,
    junctionTable: string,
    options?: {
      localKey?: string
      foreignKey?: string
      displayField?: string
      eager?: boolean
    }
  ) => ({
    type: 'many-to-many' as const,
    foreignEntity,
    junctionTable,
    junctionColumns: {
      localKey: options?.localKey || 'id',
      foreignKey: options?.foreignKey || `${foreignEntity}Id`,
    },
    display: {
      displayField: options?.displayField || 'name',
      eager: options?.eager || false,
    },
  }),

  /**
   * Has one relationship (one-to-one)
   */
  hasOne: (
    foreignEntity: string,
    foreignKey: string,
    options?: {
      displayField?: string
      eager?: boolean
      cascade?: boolean
    }
  ) => ({
    type: 'one-to-one' as const,
    foreignEntity,
    foreignKey,
    display: {
      displayField: options?.displayField || 'name',
      eager: options?.eager || false,
    },
    ...(options?.cascade && {
      db: {
        foreignKey: {
          onDelete: 'cascade' as const,
          onUpdate: 'cascade' as const,
        }
      }
    })
  }),
}

// Export templates object for easy access
export const entityTemplates = {
  user: createUserEntity,
  product: createProductEntity,
  post: createPostEntity,
}

export const fieldPresets = {
  address: createAddressFields,
  socialMedia: createSocialMediaFields,
}

/**
 * Query helper functions for common patterns
 */
export const queryHelpers = {
  /**
   * Pagination helper
   */
  paginate: (page: number = 1, pageSize: number = 20) => ({
    offset: (page - 1) * pageSize,
    limit: pageSize,
    page,
    pageSize,
  }),

  /**
   * Sorting helper
   */
  sort: (field: string, direction: 'asc' | 'desc' = 'asc') => ({
    orderBy: { [field]: direction },
  }),

  /**
   * Filtering helpers
   */
  filters: {
    equals: (field: string, value: any) => ({ [field]: { equals: value } }),
    contains: (field: string, value: string) => ({ [field]: { contains: value, mode: 'insensitive' } }),
    in: (field: string, values: any[]) => ({ [field]: { in: values } }),
    gt: (field: string, value: any) => ({ [field]: { gt: value } }),
    lt: (field: string, value: any) => ({ [field]: { lt: value } }),
    gte: (field: string, value: any) => ({ [field]: { gte: value } }),
    lte: (field: string, value: any) => ({ [field]: { lte: value } }),
    between: (field: string, min: any, max: any) => ({ [field]: { gte: min, lte: max } }),
  },

  /**
   * Search helper
   */
  search: (query: string, fields: string[]) => ({
    OR: fields.map(field => ({
      [field]: { contains: query, mode: 'insensitive' }
    }))
  }),

  /**
   * Date range helper
   */
  dateRange: (field: string, startDate?: Date, endDate?: Date) => {
    const conditions: any = {}
    if (startDate) conditions.gte = startDate
    if (endDate) conditions.lte = endDate
    return conditions.length > 0 ? { [field]: conditions } : {}
  },
}

/**
 * Validation rule builders
 */
export const validationHelpers = {
  /**
   * Password validation with strength requirements
   */
  password: (minLength: number = 8) => validators.string.refine(
    (value) => {
      if (value.length < minLength) return false
      if (!/[A-Z]/.test(value)) return false
      if (!/[a-z]/.test(value)) return false
      if (!/\d/.test(value)) return false
      return true
    },
    `Password must be at least ${minLength} characters and contain uppercase, lowercase, and number`
  ),

  /**
   * Email with domain validation
   */
  emailWithDomain: (allowedDomains?: string[]) => validators.string.refine(
    (value) => {
      const email = validators.email.parse(value)
      if (!allowedDomains) return true
      const domain = email.split('@')[1]
      return allowedDomains.includes(domain)
    },
    `Email domain not allowed`
  ),

  /**
   * URL with protocol validation
   */
  secureUrl: () => validators.string.refine(
    (value) => {
      const url = validators.url.parse(value)
      return url.startsWith('https://')
    },
    'URL must use HTTPS protocol'
  ),

  /**
   * Phone number with country code
   */
  phoneWithCountry: (countryCodes?: string[]) => validators.string.refine(
    (value) => {
      if (!countryCodes) return true
      return countryCodes.some(code => value.startsWith(code))
    },
    'Phone number must have valid country code'
  ),
}
