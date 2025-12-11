/**
 * Test entity for TanStack Form generation
 */

import { createEntity } from './src/helpers'
import { dbTypes } from './src/database'
import { validators } from './src/validators'

// Create a test User entity
export const userEntity = createEntity({
  id: 'user',
  name: { singular: 'User', plural: 'Users' },
  description: 'User account entity',
  db: {
    table: {
      name: 'users',
      primaryKey: ['id'],
    },
    columns: {
      id: { type: dbTypes.uuid() },
      email: { type: dbTypes.string(255) },
      name: { type: dbTypes.string(100) },
      age: { type: dbTypes.integer() },
      bio: { type: dbTypes.text() },
      isActive: { type: dbTypes.boolean() },
      createdAt: { type: dbTypes.timestamp() },
    },
  },
  fields: {
    id: {
      jsType: 'string',
      standardSchema: validators.uuid,
      editable: false,
    },
    email: {
      jsType: 'string',
      standardSchema: validators.email,
      inputComponent: 'TextField' as any,
      optional: false,
    },
    name: {
      jsType: 'string',
      standardSchema: validators.string,
      inputComponent: 'TextField' as any,
      optional: false,
    },
    age: {
      jsType: 'number',
      standardSchema: validators.number,
      inputComponent: 'NumberField' as any,
      optional: true,
    },
    bio: {
      jsType: 'string',
      standardSchema: validators.string,
      inputComponent: 'TextArea' as any,
      optional: true,
    },
    isActive: {
      jsType: 'boolean',
      standardSchema: validators.boolean,
      inputComponent: 'Checkbox' as any,
      optional: false,
      defaultValue: true,
    },
    createdAt: {
      jsType: 'string',
      editable: false,
    },
  },
})
