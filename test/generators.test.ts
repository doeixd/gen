import { describe, it, expect, beforeEach } from 'vitest';
import { createEntity } from '../src/helpers';
import { ComponentRegistry } from '../src/components';
import { dbTypes } from '../src/database';
import { validators } from '../src/validators';

describe('Code Generators', () => {
  beforeEach(() => {
    ComponentRegistry.clear();
    ComponentRegistry.registerBulk({
      TextField: () => null,
      EmailField: () => null,
      NumberField: () => null,
    });
  });

  let mockEntity: ReturnType<typeof createEntity>;

  beforeEach(() => {
    mockEntity = createEntity({
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
          createdAt: { type: dbTypes.timestamp().defaultNow() },
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
        createdAt: {
          component: ComponentRegistry.get('TextField')!,
          standardSchema: validators.date,
        },
      },
    });
  });

  describe('Database Schema Generation', () => {
    it('should generate Drizzle schema', () => {
      const drizzleCode = mockEntity.db.columns.email.type.toDrizzle('email');

      expect(drizzleCode).toBeTruthy();
      expect(typeof drizzleCode).toBe('string');
      expect(drizzleCode).toContain('varchar');
    });

    it('should generate Prisma schema', () => {
      const prismaCode = mockEntity.db.columns.email.type.toPrisma('email');

      expect(prismaCode).toBeTruthy();
      expect(typeof prismaCode).toBe('string');
      expect(prismaCode).toContain('String');
    });

    it('should generate PostgreSQL schema', () => {
      const sqlCode = mockEntity.db.columns.email.type.toSQL('email', 'postgres');

      expect(sqlCode).toBeTruthy();
      expect(typeof sqlCode).toBe('string');
      expect(sqlCode.toUpperCase()).toContain('VARCHAR');
    });

    it('should generate MySQL schema', () => {
      const sqlCode = mockEntity.db.columns.name.type.toSQL('name', 'mysql');

      expect(sqlCode).toBeTruthy();
      expect(typeof sqlCode).toBe('string');
    });

    it('should generate SQLite schema', () => {
      const sqlCode = mockEntity.db.columns.id.type.toSQL('id', 'sqlite');

      expect(sqlCode).toBeTruthy();
      expect(typeof sqlCode).toBe('string');
    });

    it('should generate Convex schema', () => {
      const convexCode = mockEntity.db.columns.email.type.toConvex('email');

      expect(convexCode).toBeTruthy();
      expect(typeof convexCode).toBe('string');
      expect(convexCode).toContain('v.string()');
    });

    it('should handle primary key in generation', () => {
      const drizzleCode = mockEntity.db.columns.id.type.toDrizzle('id');

      expect(drizzleCode).toContain('primaryKey');
    });

    it('should handle unique constraint in generation', () => {
      const drizzleCode = mockEntity.db.columns.email.type.toDrizzle('email');

      expect(drizzleCode).toContain('unique');
    });

    it('should handle default values in generation', () => {
      const drizzleCode = mockEntity.db.columns.createdAt.type.toDrizzle('createdAt');

      expect(drizzleCode).toContain('default');
    });

    it('should generate all columns for entity', () => {
      const columns = Object.entries(mockEntity.db.columns);

      expect(columns.length).toBe(5);

      columns.forEach(([name, column]) => {
        const drizzleCode = column.type.toDrizzle(name);
        expect(drizzleCode).toBeTruthy();
      });
    });
  });

  describe('Database Type Serialization', () => {
    it('should serialize and deserialize strings', () => {
      const col = dbTypes.string(255);
      const value = 'test@example.com';

      const serialized = col.serialize(value);
      const deserialized = col.deserialize(serialized);

      expect(deserialized).toBe(value);
    });

    it('should serialize and deserialize numbers', () => {
      const col = dbTypes.integer();
      const value = 42;

      const serialized = col.serialize(value);
      const deserialized = col.deserialize(serialized);

      expect(deserialized).toBe(value);
    });

    it('should serialize and deserialize booleans', () => {
      const col = dbTypes.boolean();

      expect(col.deserialize(col.serialize(true))).toBe(true);
      expect(col.deserialize(col.serialize(false))).toBe(false);
    });

    it('should serialize and deserialize dates', () => {
      const col = dbTypes.timestamp();
      const date = new Date('2024-01-01T00:00:00Z');

      const serialized = col.serialize(date);
      const deserialized = col.deserialize(serialized);

      expect(deserialized).toBeInstanceOf(Date);
      expect(deserialized.getTime()).toBe(date.getTime());
    });

    it('should serialize and deserialize JSON', () => {
      const col = dbTypes.json();
      const obj = { key: 'value', nested: { data: 123 } };

      const serialized = col.serialize(obj);
      const deserialized = col.deserialize(serialized);

      expect(deserialized).toEqual(obj);
    });

    it('should serialize and deserialize arrays', () => {
      const col = dbTypes.array(dbTypes.string(50));
      const arr = ['one', 'two', 'three'];

      const serialized = col.serialize(arr);
      const deserialized = col.deserialize(serialized);

      expect(deserialized).toEqual(arr);
    });

    it('should handle null values', () => {
      const col = dbTypes.string(255).nullable();

      const serialized = col.serialize(null);
      const deserialized = col.deserialize(serialized);

      expect(deserialized).toBe(null);
    });
  });

  describe('API Code Generation Patterns', () => {
    it('should have route configuration', () => {
      const entityWithRoutes = createEntity({
        ...mockEntity,
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
      });

      expect(entityWithRoutes.routes?.api?.basePath).toBe('/api/users');
      expect(entityWithRoutes.routes?.api?.endpoints?.list?.method).toBe('GET');
      expect(entityWithRoutes.routes?.api?.endpoints?.create?.method).toBe('POST');
    });

    it('should support custom route paths', () => {
      const entity = createEntity({
        ...mockEntity,
        routes: {
          api: {
            basePath: '/api/v2/users',
            endpoints: {
              custom: { method: 'POST', path: '/bulk-create' },
            },
          },
        },
      });

      expect(entity.routes?.api?.endpoints?.custom?.path).toBe('/bulk-create');
    });

    it('should support route permissions', () => {
      const entity = createEntity({
        ...mockEntity,
        routes: {
          api: {
            basePath: '/api/users',
            endpoints: {
              list: {
                method: 'GET',
                path: '/',
                permissions: {
                  role: {
                    user: { read: true },
                    admin: { read: true },
                  },
                },
              },
            },
          },
        },
      });

      expect(entity.routes?.api?.endpoints?.list?.permissions).toBeDefined();
    });
  });

  describe('Frontend Code Generation Patterns', () => {
    it('should have component mappings for all fields', () => {
      Object.entries(mockEntity.fields).forEach(([name, field]) => {
        const component = field.inputComponent || field.component;
        expect(component).toBeTruthy();
        expect(typeof component).toBe('function');
      });
    });

    it('should have validators for all fields', () => {
      Object.entries(mockEntity.fields).forEach(([name, field]) => {
        expect(field.standardSchema).toBeTruthy();
      });
    });

    it('should support display components', () => {
      const entityWithDisplay = createEntity({
        id: 'user',
        name: { singular: 'User', plural: 'Users' },
        db: {
          table: { name: 'users', primaryKey: ['id'] },
          columns: {
            id: { type: dbTypes.uuid() },
            email: { type: dbTypes.string(255) },
          },
        },
        fields: {
          id: {
            component: ComponentRegistry.get('TextField')!,
            displayComponent: {
              component: ComponentRegistry.get('TextField')!,
              props: { readonly: true },
            },
            standardSchema: validators.uuid,
          },
          email: {
            component: ComponentRegistry.get('EmailField')!,
            standardSchema: validators.email,
          },
        },
      });

      expect(entityWithDisplay.fields.id.displayComponent).toBeDefined();
      expect(entityWithDisplay.fields.id.displayComponent?.props?.readonly).toBe(true);
    });

    it('should support loading and empty states', () => {
      const Loading = () => null;
      const Empty = () => null;

      const entity = createEntity({
        id: 'user',
        name: { singular: 'User', plural: 'Users' },
        db: {
          table: { name: 'users', primaryKey: ['id'] },
          columns: {
            id: { type: dbTypes.uuid() },
          },
        },
        fields: {
          id: {
            component: ComponentRegistry.get('TextField')!,
            loadingComponent: Loading,
            emptyComponent: Empty,
            standardSchema: validators.uuid,
          },
        },
      });

      expect(entity.fields.id.loadingComponent).toBe(Loading);
      expect(entity.fields.id.emptyComponent).toBe(Empty);
    });
  });

  describe('Relationship Code Generation', () => {
    it('should generate foreign key constraints', () => {
      const entity = createEntity({
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
          id: {
            component: ComponentRegistry.get('TextField')!,
            standardSchema: validators.uuid,
          },
          userId: {
            component: ComponentRegistry.get('TextField')!,
            standardSchema: validators.uuid,
          },
        },
        relationships: {
          author: {
            type: 'many-to-one',
            foreignEntity: 'user',
            foreignKey: 'userId',
            onDelete: 'CASCADE',
          },
        },
      });

      expect(entity.relationships?.author?.foreignKey).toBe('userId');
      expect(entity.relationships?.author?.onDelete).toBe('CASCADE');
    });

    it('should generate junction tables for many-to-many', () => {
      const entity = createEntity({
        id: 'post',
        name: { singular: 'Post', plural: 'Posts' },
        db: {
          table: { name: 'posts', primaryKey: ['id'] },
          columns: {
            id: { type: dbTypes.uuid() },
          },
        },
        fields: {
          id: {
            component: ComponentRegistry.get('TextField')!,
            standardSchema: validators.uuid,
          },
        },
        relationships: {
          tags: {
            type: 'many-to-many',
            foreignEntity: 'tag',
            junctionTable: 'post_tags',
            junctionColumns: {
              localKey: 'postId',
              foreignKey: 'tagId',
            },
          },
        },
      });

      expect(entity.relationships?.tags?.junctionTable).toBe('post_tags');
      expect(entity.relationships?.tags?.junctionColumns?.localKey).toBe('postId');
    });
  });

  describe('Index Generation', () => {
    it('should generate indexes', () => {
      expect(mockEntity.db.indexes).toBeDefined();
      expect(mockEntity.db.indexes?.length).toBe(1);
      expect(mockEntity.db.indexes?.[0].name).toBe('email_idx');
      expect(mockEntity.db.indexes?.[0].columns).toContain('email');
    });

    it('should support unique indexes', () => {
      expect(mockEntity.db.indexes?.[0].unique).toBe(true);
    });

    it('should support composite indexes', () => {
      const entity = createEntity({
        id: 'user',
        name: { singular: 'User', plural: 'Users' },
        db: {
          table: { name: 'users', primaryKey: ['id'] },
          columns: {
            id: { type: dbTypes.uuid() },
            firstName: { type: dbTypes.string(50) },
            lastName: { type: dbTypes.string(50) },
          },
          indexes: [
            {
              name: 'name_idx',
              columns: ['firstName', 'lastName'],
            },
          ],
        },
        fields: {
          id: {
            component: ComponentRegistry.get('TextField')!,
            standardSchema: validators.uuid,
          },
          firstName: {
            component: ComponentRegistry.get('TextField')!,
            standardSchema: validators.string,
          },
          lastName: {
            component: ComponentRegistry.get('TextField')!,
            standardSchema: validators.string,
          },
        },
      });

      const index = entity.db.indexes?.[0];
      expect(index?.columns.length).toBe(2);
      expect(index?.columns).toContain('firstName');
      expect(index?.columns).toContain('lastName');
    });
  });

  describe('Code Generation Integration', () => {
    it('should generate complete database schema for entity', () => {
      const tableName = mockEntity.db.table.name;
      const columns = Object.entries(mockEntity.db.columns);

      expect(tableName).toBe('users');
      expect(columns.length).toBeGreaterThan(0);

      // Verify all columns can be generated
      columns.forEach(([name, column]) => {
        const drizzle = column.type.toDrizzle(name);
        const prisma = column.type.toPrisma(name);
        const sql = column.type.toSQL(name, 'postgres');

        expect(drizzle).toBeTruthy();
        expect(prisma).toBeTruthy();
        expect(sql).toBeTruthy();
      });
    });

    it('should have all data needed for API generation', () => {
      expect(mockEntity.id).toBeTruthy();
      expect(mockEntity.name.singular).toBeTruthy();
      expect(mockEntity.name.plural).toBeTruthy();
      expect(mockEntity.db.table.name).toBeTruthy();
      expect(mockEntity.db.table.primaryKey).toBeTruthy();
      expect(Object.keys(mockEntity.fields).length).toBeGreaterThan(0);
    });

    it('should have all data needed for frontend generation', () => {
      Object.entries(mockEntity.fields).forEach(([name, field]) => {
        const component = field.inputComponent || field.component;
        expect(component).toBeTruthy();
        expect(field.standardSchema).toBeTruthy();
      });
    });
  });
});
