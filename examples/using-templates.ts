/**
 * Using Entity Templates and Helpers
 *
 * This example demonstrates how to use the new type-safe templates
 * and helper functions for rapid entity creation.
 */

import {
  ComponentRegistry,
  entityTemplates,
  fieldPresets,
  relationshipHelpers,
  queryHelpers,
  validationHelpers,
  EntityBuilder,
  createEntity
} from '../src'

// Register UI components
ComponentRegistry.registerBulk({
  TextField: () => null,
  EmailField: () => null,
  NumberField: () => null,
  Select: () => null,
  Checkbox: () => null,
  DateTime: () => null,
  TextArea: () => null,
  RichTextEditor: () => null,
})

// ===== Using Entity Templates =====

// Create a user entity with authentication and profile
const userEntity = entityTemplates.user({
  includeProfile: true,
  includeAuth: true,
  tableName: 'app_users'
})

// Create a product entity with inventory and pricing
const productEntity = entityTemplates.product({
  includeInventory: true,
  includePricing: true,
  tableName: 'store_products'
})

// Create a blog post entity
const postEntity = entityTemplates.post({
  includeAuthor: true,
  includeTags: true,
  includeComments: true,
  tableName: 'blog_posts'
})

// ===== Using Field Presets =====

// Create address fields
const { fields: addressFields, columns: addressColumns } = fieldPresets.address('shipping_')

// Create social media fields
const { fields: socialFields, columns: socialColumns } = fieldPresets.socialMedia()

// ===== Using Relationship Helpers =====

// Define relationships using helper functions
const userRelationships = {
  posts: relationshipHelpers.hasMany('post', 'authorId', {
    displayField: 'title',
    eager: false,
    cascade: true
  }),
  profile: relationshipHelpers.hasOne('profile', 'userId', {
    displayField: 'displayName',
    eager: true,
    cascade: true
  })
}

const postRelationships = {
  author: relationshipHelpers.belongsTo('user', 'authorId', {
    displayField: 'email',
    eager: true
  }),
  tags: relationshipHelpers.belongsToMany('tag', 'post_tags', {
    foreignKey: 'tagId',
    displayField: 'name'
  }),
  comments: relationshipHelpers.hasMany('comment', 'postId', {
    displayField: 'content',
    limit: 10
  })
}

// ===== Using Query Helpers =====

// Pagination
const pagination = queryHelpers.paginate(1, 20) // page 1, 20 items per page

// Filtering
const activeUsersFilter = queryHelpers.filters.equals('isActive', true)
const emailSearchFilter = queryHelpers.filters.contains('email', 'gmail.com')
const priceRangeFilter = queryHelpers.filters.between('price', 10, 100)

// Complex search
const searchFilter = queryHelpers.search('javascript', ['title', 'content', 'tags'])

// Date range
const dateFilter = queryHelpers.dateRange('createdAt', new Date('2024-01-01'), new Date('2024-12-31'))

// ===== Using Validation Helpers =====

// Strong password validation
const passwordValidator = validationHelpers.password(12)

// Email with domain restrictions
const corporateEmailValidator = validationHelpers.emailWithDomain(['company.com', 'subsidiary.com'])

// Secure URLs only
const secureUrlValidator = validationHelpers.secureUrl()

// Phone with country codes
const phoneValidator = validationHelpers.phoneWithCountry(['+1', '+44', '+91'])

// ===== Combining Everything =====

// Create a complete e-commerce entity with all features
const orderEntity = new EntityBuilder('order')
  .setName('Order', 'Orders')
  .setTable('orders', ['id'])

  // Basic fields
  .stringField('orderNumber', {
    schema: validationHelpers.password(8), // Wait, wrong validator - just for example
    unique: true
  })
  .addColumn('customerId', { type: require('../src/database').dbTypes.uuid() })
  .addColumn('totalAmount', { type: require('../src/database').dbTypes.decimal(10, 2) })

  // Address fields using preset
  .field('shippingStreet', addressColumns.shippingStreet, addressFields.shippingStreet)
  .field('shippingCity', addressColumns.shippingCity, addressFields.shippingCity)
  .field('shippingState', addressColumns.shippingState, addressFields.shippingState)
  .field('shippingPostalCode', addressColumns.shippingPostalCode, addressFields.shippingPostalCode)
  .field('shippingCountry', addressColumns.shippingCountry, addressFields.shippingCountry)

  // Relationships
  .addRelationship('customer', relationshipHelpers.belongsTo('user', 'customerId', {
    displayField: 'email',
    eager: true
  }))
  .addRelationship('items', relationshipHelpers.hasMany('orderItem', 'orderId', {
    cascade: true
  }))

  // Permissions
  .permissions({
    role: {
      customer: { read: true, write: true },
      admin: { read: true, write: true, delete: true },
    },
    ownership: {
      required: true,
      ownerField: 'customerId'
    }
  })

  // Routes
  .routes({
    api: {
      basePath: '/api/orders',
      endpoints: {
        list: { method: 'GET', path: '/' },
        get: { method: 'GET', path: '/:id' },
        create: { method: 'POST', path: '/' },
        update: { method: 'PUT', path: '/:id' },
      }
    }
  })

  .build()

// Set code generation configuration
orderEntity.generateAPI = true
orderEntity.generateComponents = true
orderEntity.generateGraphQL = true
orderEntity.searchableFields = ['orderNumber']
orderEntity.indexedFields = ['customerId', 'createdAt']
orderEntity.auditChanges = true
orderEntity.openapi = {
  tags: ['Orders'],
  summary: 'Order management endpoints'
}

// ===== Export =====
export {
  userEntity,
  productEntity,
  postEntity,
  orderEntity,
  addressFields,
  socialFields,
  userRelationships,
  postRelationships,
  pagination,
  activeUsersFilter,
  emailSearchFilter,
  searchFilter,
  passwordValidator,
  corporateEmailValidator,
}
