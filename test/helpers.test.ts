import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEntity,
  createRelationship,
  resolveFieldConfig,
  createFieldMapping,
  addTableOverride,
  addFieldPattern,
  defaultTypeMappings,
  fieldNamePatterns,
  tableFieldOverrides,
  excludeFromForms,
  excludeFromList,
} from '../src/helpers';
import { ComponentRegistry } from '../src/components';
import { dbTypes } from '../src/database';
import { validators } from '../src/validators';

describe('Helpers', () => {
  beforeEach(() => {
    ComponentRegistry.clear();
    // Register mock components
    ComponentRegistry.registerBulk({
      TextField: () => null,
      NumberField: () => null,
      EmailField: () => null,
      DateField: () => null,
      BooleanField: () => null,
    });
  });

  describe('createEntity', () => {
    it('should create a basic entity', () => {
      const entity = createEntity({
        id: 'user',
        name: { singular: 'User', plural: 'Users' },
        db: {
          table: { name: 'users', primaryKey: ['id'] },
          columns: {
            id: { type: dbTypes.id() },
            email: { type: dbTypes.string(255) },
          },
        },
        fields: {
          id: { standardSchema: validators.uuid },
          email: { standardSchema: validators.email },
        },
      });

      expect(entity.id).toBe('user');
      expect(entity.name.singular).toBe('User');
      expect(entity.name.plural).toBe('Users');
      expect(entity.db.table.name).toBe('users');
    });

    it('should create entity with permissions', () => {
      const entity = createEntity({
        id: 'user',
        name: { singular: 'User', plural: 'Users' },
        db: {
          table: { name: 'users', primaryKey: ['id'] },
          columns: {
            id: { type: dbTypes.id() },
          },
        },
        fields: {
          id: { standardSchema: validators.uuid },
        },
        permissions: {
          role: {
            user: { read: true },
            admin: { read: true, write: true },
          },
        },
      });

      expect(entity.permissions).toBeDefined();
      expect(entity.permissions?.role?.user?.read).toBe(true);
    });

    it('should create entity with routes', () => {
      const entity = createEntity({
        id: 'user',
        name: { singular: 'User', plural: 'Users' },
        db: {
          table: { name: 'users', primaryKey: ['id'] },
          columns: {
            id: { type: dbTypes.id() },
          },
        },
        fields: {
          id: { standardSchema: validators.uuid },
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

      expect(entity.routes?.api?.basePath).toBe('/api/users');
      expect(entity.routes?.api?.endpoints?.list?.method).toBe('GET');
    });

    it('should create entity with relationships', () => {
      const entity = createEntity({
        id: 'post',
        name: { singular: 'Post', plural: 'Posts' },
        db: {
          table: { name: 'posts', primaryKey: ['id'] },
          columns: {
            id: { type: dbTypes.id() },
            userId: { type: dbTypes.uuid() },
          },
        },
        fields: {
          id: { standardSchema: validators.uuid },
          userId: { standardSchema: validators.uuid },
        },
        relationships: {
          author: {
            type: 'many-to-one',
            foreignEntity: 'user',
            foreignKey: 'userId',
          },
        },
      });

      expect(entity.relationships?.author?.type).toBe('many-to-one');
      expect(entity.relationships?.author?.foreignEntity).toBe('user');
    });

    it('should create entity with lifecycle hooks', () => {
      const beforeCreate = () => {};
      const afterCreate = () => {};

      const entity = createEntity({
        id: 'user',
        name: { singular: 'User', plural: 'Users' },
        db: {
          table: { name: 'users', primaryKey: ['id'] },
          columns: {
            id: { type: dbTypes.id() },
          },
        },
        fields: {
          id: { standardSchema: validators.uuid },
        },
        lifecycle: {
          beforeCreate,
          afterCreate,
        },
      });

      expect(entity.lifecycle?.beforeCreate).toBe(beforeCreate);
      expect(entity.lifecycle?.afterCreate).toBe(afterCreate);
    });
  });

  describe('createRelationship', () => {
    it('should create one-to-one relationship', () => {
      const rel = createRelationship({
        type: 'one-to-one',
        foreignEntity: 'profile',
        foreignKey: 'userId',
        localKey: 'id',
      });

      expect(rel.type).toBe('one-to-one');
      expect(rel.foreignEntity).toBe('profile');
      expect(rel.foreignKey).toBe('userId');
    });

    it('should create one-to-many relationship', () => {
      const rel = createRelationship({
        type: 'one-to-many',
        foreignEntity: 'post',
        foreignKey: 'userId',
        localKey: 'id',
      });

      expect(rel.type).toBe('one-to-many');
      expect(rel.foreignEntity).toBe('post');
    });

    it('should create many-to-many relationship', () => {
      const rel = createRelationship({
        type: 'many-to-many',
        foreignEntity: 'tag',
        junctionTable: 'post_tags',
        junctionColumns: {
          localKey: 'postId',
          foreignKey: 'tagId',
        },
      });

      expect(rel.type).toBe('many-to-many');
      expect(rel.junctionTable).toBe('post_tags');
      expect(rel.junctionColumns?.localKey).toBe('postId');
    });

    it('should create relationship with cascade options', () => {
      const rel = createRelationship({
        type: 'one-to-many',
        foreignEntity: 'comment',
        foreignKey: 'postId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      expect(rel.onDelete).toBe('CASCADE');
      expect(rel.onUpdate).toBe('CASCADE');
    });
  });

  describe('createFieldMapping', () => {
    it('should create field mapping with component', () => {
      const TextField = ComponentRegistry.get('TextField')!;
      const mapping = createFieldMapping({
        component: TextField,
        standardSchema: validators.string,
      });

      expect(mapping.component).toBe(TextField);
      expect(mapping.standardSchema).toBe(validators.string);
    });

    it('should create field mapping with display component', () => {
      const TextField = ComponentRegistry.get('TextField')!;
      const mapping = createFieldMapping({
        component: TextField,
        displayComponent: {
          component: TextField,
          props: { readonly: true },
        },
        standardSchema: validators.string,
      });

      expect(mapping.displayComponent).toBeDefined();
    });

    it('should create field mapping with loading component', () => {
      const Skeleton = () => null;
      const TextField = ComponentRegistry.get('TextField')!;

      const mapping = createFieldMapping({
        component: TextField,
        loadingComponent: Skeleton,
        standardSchema: validators.string,
      });

      expect(mapping.loadingComponent).toBe(Skeleton);
    });
  });

  describe('resolveFieldConfig', () => {
    it('should resolve field config from type mapping', () => {
      const config = resolveFieldConfig('user', 'name', 'string', {
        string: () => null,
      });

      expect(config).toBeDefined();
      expect(config.component).toBeTruthy();
    });

    it('should resolve field config from field name pattern', () => {
      const EmailField = ComponentRegistry.get('EmailField')!;
      const config = resolveFieldConfig('user', 'email', 'string', {
        string: () => null,
      });

      expect(config).toBeDefined();
      // Should match email pattern
      expect(config.standardSchema).toBeTruthy();
    });

    it('should apply table-specific overrides', () => {
      const CustomComponent = () => null;

      addTableOverride('user', 'email', {
        component: CustomComponent,
      });

      const config = resolveFieldConfig('user', 'email', 'string', {
        string: () => null,
      });

      expect(config.component).toBe(CustomComponent);
    });

    it('should prioritize overrides over patterns', () => {
      const CustomComponent = () => null;

      addTableOverride('user', 'email', {
        component: CustomComponent,
        standardSchema: validators.string,
      });

      const config = resolveFieldConfig('user', 'email', 'string', {
        string: () => null,
      });

      expect(config.component).toBe(CustomComponent);
      expect(config.standardSchema).toBe(validators.string);
    });
  });

  describe('field patterns', () => {
    it('should recognize email fields', () => {
      const config = resolveFieldConfig('user', 'email', 'string', {
        string: () => null,
      });

      expect(config.standardSchema).toBeTruthy();
      // Email fields should use email validator
    });

    it('should recognize date fields', () => {
      const config = resolveFieldConfig('user', 'createdAt', 'date', {
        date: () => null,
      });

      expect(config.component).toBeTruthy();
    });

    it('should recognize boolean fields', () => {
      const config = resolveFieldConfig('user', 'isActive', 'boolean', {
        boolean: () => null,
      });

      expect(config.component).toBeTruthy();
    });

    it('should recognize numeric fields', () => {
      const config = resolveFieldConfig('product', 'price', 'number', {
        number: () => null,
      });

      expect(config.component).toBeTruthy();
    });
  });

  describe('addFieldPattern', () => {
    it('should add new field pattern', () => {
      const CustomComponent = () => null;

      addFieldPattern('phone', {
        component: CustomComponent,
        standardSchema: validators.string.regex(/^\d{10}$/),
      });

      const config = resolveFieldConfig('user', 'phone', 'string', {
        string: () => null,
      });

      expect(config.component).toBe(CustomComponent);
    });

    it('should override existing pattern', () => {
      const NewEmailComponent = () => null;

      addFieldPattern('email', {
        component: NewEmailComponent,
      });

      const config = resolveFieldConfig('user', 'email', 'string', {
        string: () => null,
      });

      expect(config.component).toBe(NewEmailComponent);
    });
  });

  describe('excludeFromForms', () => {
    it('should mark fields to exclude from forms', () => {
      excludeFromForms('user', ['id', 'createdAt', 'updatedAt']);

      const idConfig = resolveFieldConfig('user', 'id', 'string', {
        string: () => null,
      });

      expect(idConfig.excludeFromForms).toBe(true);
    });

    it('should not affect other tables', () => {
      excludeFromForms('user', ['id']);

      const config = resolveFieldConfig('post', 'id', 'string', {
        string: () => null,
      });

      expect(config.excludeFromForms).toBeUndefined();
    });
  });

  describe('excludeFromList', () => {
    it('should mark fields to exclude from list views', () => {
      excludeFromList('user', ['password', 'secret']);

      const config = resolveFieldConfig('user', 'password', 'string', {
        string: () => null,
      });

      expect(config.excludeFromList).toBe(true);
    });

    it('should preserve form inclusion', () => {
      excludeFromList('user', ['bio']);

      const config = resolveFieldConfig('user', 'bio', 'string', {
        string: () => null,
      });

      expect(config.excludeFromList).toBe(true);
      expect(config.excludeFromForms).toBeUndefined();
    });
  });

  describe('defaultTypeMappings', () => {
    it('should have mappings for common types', () => {
      expect(defaultTypeMappings.string).toBeDefined();
      expect(defaultTypeMappings.number).toBeDefined();
      expect(defaultTypeMappings.boolean).toBeDefined();
      expect(defaultTypeMappings.date).toBeDefined();
    });

    it('should map to registered components', () => {
      const TextField = ComponentRegistry.get('TextField');
      expect(TextField).toBeTruthy();
    });
  });

  describe('integration tests', () => {
    it('should create complete entity with all features', () => {
      const entity = createEntity({
        id: 'user',
        name: { singular: 'User', plural: 'Users' },
        db: {
          table: {
            name: 'users',
            primaryKey: ['id'],
          },
          columns: {
            id: { type: dbTypes.uuid() },
            email: { type: dbTypes.string(255) },
            name: { type: dbTypes.string(100) },
            isActive: { type: dbTypes.boolean() },
            createdAt: { type: dbTypes.timestamp().defaultNow() },
          },
        },
        fields: {
          id: { standardSchema: validators.uuid },
          email: { standardSchema: validators.email },
          name: { standardSchema: validators.stringMin(1) },
          isActive: { standardSchema: validators.boolean },
          createdAt: { standardSchema: validators.date },
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
              create: { method: 'POST', path: '/' },
              update: { method: 'PUT', path: '/:id' },
              delete: { method: 'DELETE', path: '/:id' },
            },
          },
        },
      });

      expect(entity.id).toBe('user');
      expect(entity.db.table.name).toBe('users');
      expect(entity.permissions?.role?.admin?.delete).toBe(true);
      expect(entity.routes?.api?.endpoints?.list?.method).toBe('GET');
    });

    it('should resolve field configs for entire entity', () => {
      const fields = ['id', 'email', 'name', 'age', 'isActive'];
      const configs = fields.map((field) =>
        resolveFieldConfig('user', field, 'string', {
          string: () => null,
        })
      );

      expect(configs.length).toBe(fields.length);
      configs.forEach((config) => {
        expect(config.component).toBeTruthy();
      });
    });
  });
});
