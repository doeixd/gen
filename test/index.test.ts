import { describe, it, expect } from 'vitest';
import {
  createEntity,
  ComponentRegistry,
  dbTypes,
  validators,
  PermissionEngine,
  MutatorFactory,
} from '../src';

describe('Gen Library - Integration Tests', () => {
  describe('module exports', () => {
    it('exports core functions', () => {
      expect(typeof createEntity).toBe('function');
      expect(typeof ComponentRegistry.register).toBe('function');
      expect(typeof PermissionEngine.check).toBe('function');
      expect(typeof MutatorFactory.createInsert).toBe('function');
    });

    it('exports database types', () => {
      expect(typeof dbTypes.string).toBe('function');
      expect(typeof dbTypes.integer).toBe('function');
      expect(typeof dbTypes.boolean).toBe('function');
      expect(typeof dbTypes.uuid).toBe('function');
    });

    it('exports validators', () => {
      expect(validators.string).toBeDefined();
      expect(validators.email).toBeDefined();
      expect(validators.number).toBeDefined();
      expect(validators.boolean).toBeDefined();
    });
  });

  describe('end-to-end entity creation', () => {
    it('can create a complete entity with all features', () => {
      // Register components
      ComponentRegistry.registerBulk({
        TextField: () => null,
        EmailField: () => null,
        NumberField: () => null,
      });

      // Create entity
      const entity = createEntity({
        id: 'user',
        name: { singular: 'User', plural: 'Users' },
        db: {
          table: {
            name: 'users',
            primaryKey: ['id'],
          },
          columns: {
            id: { type: dbTypes.uuid().primaryKey() },
            email: { type: dbTypes.string(255).unique() },
            name: { type: dbTypes.string(100) },
            age: { type: dbTypes.integer() },
          },
          indexes: [
            {
              name: 'email_idx',
              columns: ['email'],
              unique: true,
            },
          ],
        },
        fields: {
          id: {
            component: ComponentRegistry.get('TextField')!,
            standardSchema: validators.uuid,
          },
          email: {
            component: ComponentRegistry.get('EmailField')!,
            standardSchema: validators.email,
          },
          name: {
            component: ComponentRegistry.get('TextField')!,
            standardSchema: validators.stringMin(1),
          },
          age: {
            component: ComponentRegistry.get('NumberField')!,
            standardSchema: validators.number,
          },
        },
        permissions: {
          role: {
            user: { read: true },
            admin: { read: true, write: true, delete: true },
          },
        },
        routes: {
          api: {
            basePath: '/api/users',
            endpoints: {
              list: { method: 'GET', path: '/' },
              get: { method: 'GET', path: '/:id' },
            },
          },
        },
      });

      // Verify entity structure
      expect(entity.id).toBe('user');
      expect(entity.name.singular).toBe('User');
      expect(entity.db.table.name).toBe('users');
      expect(Object.keys(entity.fields)).toHaveLength(4);
      expect(entity.permissions?.role?.admin?.delete).toBe(true);
      expect(entity.routes?.api?.basePath).toBe('/api/users');
    });

    it('can generate database code for entity', () => {
      const entity = createEntity({
        id: 'test',
        name: { singular: 'Test', plural: 'Tests' },
        db: {
          table: { name: 'tests', primaryKey: ['id'] },
          columns: {
            id: { type: dbTypes.uuid() },
            email: { type: dbTypes.string(255) },
          },
        },
        fields: {
          id: { component: () => null, standardSchema: validators.uuid },
          email: { component: () => null, standardSchema: validators.email },
        },
      });

      // Generate code for different targets
      const drizzleCode = entity.db.columns.email.type.toDrizzle('email');
      const prismaCode = entity.db.columns.email.type.toPrisma('email');
      const sqlCode = entity.db.columns.email.type.toSQL('email', 'postgres');
      const convexCode = entity.db.columns.email.type.toConvex('email');

      expect(drizzleCode).toBeTruthy();
      expect(prismaCode).toBeTruthy();
      expect(sqlCode).toBeTruthy();
      expect(convexCode).toBeTruthy();
    });

    it('can validate data with entity validators', () => {
      const entity = createEntity({
        id: 'test',
        name: { singular: 'Test', plural: 'Tests' },
        db: {
          table: { name: 'tests', primaryKey: ['id'] },
          columns: {
            email: { type: dbTypes.string(255) },
          },
        },
        fields: {
          email: { component: () => null, standardSchema: validators.email },
        },
      });

      // Valid email
      expect(entity.fields.email.standardSchema.parse('test@example.com')).toBe(
        'test@example.com'
      );

      // Invalid email
      expect(() => entity.fields.email.standardSchema.parse('not-an-email')).toThrow();
    });

    it('can check permissions for entity', () => {
      const entity = createEntity({
        id: 'test',
        name: { singular: 'Test', plural: 'Tests' },
        db: {
          table: { name: 'tests', primaryKey: ['id'] },
          columns: {
            id: { type: dbTypes.uuid() },
          },
        },
        fields: {
          id: { component: () => null, standardSchema: validators.uuid },
        },
        permissions: {
          role: {
            user: { read: true },
            admin: { read: true, write: true },
          },
        },
      });

      const userUser = { id: 'user-1', role: 'user' as const };
      const adminUser = { id: 'admin-1', role: 'admin' as const };

      // User can read
      expect(
        PermissionEngine.check(userUser, entity.permissions!, 'read').allowed
      ).toBe(true);

      // User cannot write
      expect(
        PermissionEngine.check(userUser, entity.permissions!, 'write').allowed
      ).toBe(false);

      // Admin can write
      expect(
        PermissionEngine.check(adminUser, entity.permissions!, 'write').allowed
      ).toBe(true);
    });
  });

  describe('library consistency', () => {
    it('maintains consistent naming across entities', () => {
      const entities = ['user', 'post', 'comment'].map((id) =>
        createEntity({
          id,
          name: { singular: id, plural: `${id}s` },
          db: {
            table: { name: `${id}s`, primaryKey: ['id'] },
            columns: { id: { type: dbTypes.uuid() } },
          },
          fields: {
            id: { component: () => null, standardSchema: validators.uuid },
          },
        })
      );

      entities.forEach((entity) => {
        expect(entity.db.table.name).toBe(`${entity.id}s`);
        expect(entity.name.plural).toBe(`${entity.id}s`);
      });
    });

    it('handles entity relationships consistently', () => {
      const userEntity = createEntity({
        id: 'user',
        name: { singular: 'User', plural: 'Users' },
        db: {
          table: { name: 'users', primaryKey: ['id'] },
          columns: { id: { type: dbTypes.uuid() } },
        },
        fields: {
          id: { component: () => null, standardSchema: validators.uuid },
        },
      });

      const postEntity = createEntity({
        id: 'post',
        name: { singular: 'Post', plural: 'Posts' },
        db: {
          table: { name: 'posts', primaryKey: ['id'] },
          columns: {
            id: { type: dbTypes.uuid() },
            userId: { type: dbTypes.uuid() },
          },
        },
        fields: {
          id: { component: () => null, standardSchema: validators.uuid },
          userId: { component: () => null, standardSchema: validators.uuid },
        },
        relationships: {
          author: {
            type: 'many-to-one',
            foreignEntity: 'user',
            foreignKey: 'userId',
          },
        },
      });

      expect(postEntity.relationships?.author?.foreignEntity).toBe(userEntity.id);
    });
  });
});
