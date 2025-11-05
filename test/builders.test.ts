import { describe, it, expect, beforeEach } from 'vitest';
import { FieldBuilder, DbColumnBuilder, EntityBuilder, RelationshipBuilder, builders } from '../src/builders';
import { ComponentRegistry } from '../src/components';
import { dbTypes } from '../src/database';
import { validators } from '../src/validators';

describe('Builders', () => {
  beforeEach(() => {
    ComponentRegistry.clear();
    ComponentRegistry.registerBulk({
      TextField: () => null,
      NumberField: () => null,
      EmailField: () => null,
    });
  });

  describe('FieldBuilder', () => {
    it('should build a basic field', () => {
      const field = new FieldBuilder()
        .setComponent(ComponentRegistry.get('TextField')!)
        .setSchema(validators.string)
        .build();

      expect(field.component).toBeTruthy();
      expect(field.standardSchema).toBe(validators.string);
    });

    it('should set display component', () => {
      const TextField = ComponentRegistry.get('TextField')!;
      const field = new FieldBuilder()
        .setComponent(TextField)
        .setDisplayComponent(TextField, { readonly: true })
        .setSchema(validators.string)
        .build();

      expect(field.displayComponent).toBeDefined();
      expect(field.displayComponent?.props?.readonly).toBe(true);
    });

    it('should set loading and empty components', () => {
      const Loading = () => null;
      const Empty = () => null;
      const TextField = ComponentRegistry.get('TextField')!;

      const field = new FieldBuilder()
        .setComponent(TextField)
        .setLoadingComponent(Loading)
        .setEmptyComponent(Empty)
        .setSchema(validators.string)
        .build();

      expect(field.loadingComponent).toBe(Loading);
      expect(field.emptyComponent).toBe(Empty);
    });

    it('should set field as sortable and filterable', () => {
      const field = new FieldBuilder()
        .setComponent(ComponentRegistry.get('TextField')!)
        .setSchema(validators.string)
        .setSortable(true)
        .setFilterable(true)
        .build();

      expect(field.sortable).toBe(true);
      expect(field.filterable).toBe(true);
    });

    it('should exclude from forms and lists', () => {
      const field = new FieldBuilder()
        .setComponent(ComponentRegistry.get('TextField')!)
        .setSchema(validators.string)
        .excludeFromForms()
        .excludeFromList()
        .build();

      expect(field.excludeFromForms).toBe(true);
      expect(field.excludeFromList).toBe(true);
    });

    it('should set field metadata', () => {
      const field = new FieldBuilder()
        .setComponent(ComponentRegistry.get('TextField')!)
        .setSchema(validators.string)
        .setLabel('Email Address')
        .setDescription('User email address')
        .setPlaceholder('Enter email')
        .build();

      expect(field.label).toBe('Email Address');
      expect(field.description).toBe('User email address');
      expect(field.placeholder).toBe('Enter email');
    });

    it('should chain multiple operations', () => {
      const TextField = ComponentRegistry.get('TextField')!;
      const field = new FieldBuilder()
        .setComponent(TextField)
        .setSchema(validators.email)
        .setLabel('Email')
        .setPlaceholder('user@example.com')
        .setSortable(true)
        .setFilterable(true)
        .build();

      expect(field.component).toBe(TextField);
      expect(field.label).toBe('Email');
      expect(field.sortable).toBe(true);
    });
  });

  describe('DbColumnBuilder', () => {
    it('should build a basic column', () => {
      const column = new DbColumnBuilder()
        .setType(dbTypes.string(255))
        .build();

      expect(column.type).toBeTruthy();
    });

    it('should set column as nullable', () => {
      const column = new DbColumnBuilder()
        .setType(dbTypes.string(255))
        .setNullable(true)
        .build();

      expect(column.type).toBeTruthy();
    });

    it('should set default value', () => {
      const column = new DbColumnBuilder()
        .setType(dbTypes.string(50))
        .setDefault('default_value')
        .build();

      expect(column.type).toBeTruthy();
    });

    it('should set column as unique and primary key', () => {
      const column = new DbColumnBuilder()
        .setType(dbTypes.integer())
        .setUnique(true)
        .setPrimaryKey(true)
        .build();

      expect(column.type).toBeTruthy();
    });

    it('should add column to index', () => {
      const column = new DbColumnBuilder()
        .setType(dbTypes.string(255))
        .addToIndex('email_idx')
        .build();

      expect(column.type).toBeTruthy();
    });
  });

  describe('EntityBuilder', () => {
    it('should build a basic entity', () => {
      const entity = new EntityBuilder('user')
        .setName('User', 'Users')
        .setTable('users', ['id'])
        .addField('id', {
          component: ComponentRegistry.get('TextField')!,
          standardSchema: validators.uuid,
        })
        .addColumn('id', { type: dbTypes.uuid() })
        .build();

      expect(entity.id).toBe('user');
      expect(entity.name.singular).toBe('User');
      expect(entity.db.table.name).toBe('users');
    });

    it('should add multiple fields', () => {
      const entity = new EntityBuilder('user')
        .setName('User', 'Users')
        .setTable('users', ['id'])
        .addField('id', {
          component: ComponentRegistry.get('TextField')!,
          standardSchema: validators.uuid,
        })
        .addField('email', {
          component: ComponentRegistry.get('EmailField')!,
          standardSchema: validators.email,
        })
        .addField('age', {
          component: ComponentRegistry.get('NumberField')!,
          standardSchema: validators.number,
        })
        .addColumn('id', { type: dbTypes.uuid() })
        .addColumn('email', { type: dbTypes.string(255) })
        .addColumn('age', { type: dbTypes.integer() })
        .build();

      expect(Object.keys(entity.fields)).toHaveLength(3);
      expect(Object.keys(entity.db.columns)).toHaveLength(3);
    });

    it('should add indexes', () => {
      const entity = new EntityBuilder('user')
        .setName('User', 'Users')
        .setTable('users', ['id'])
        .addColumn('id', { type: dbTypes.uuid() })
        .addColumn('email', { type: dbTypes.string(255) })
        .addIndex('email_idx', ['email'], { unique: true })
        .build();

      expect(entity.db.indexes).toBeDefined();
      expect(entity.db.indexes?.length).toBe(1);
      expect(entity.db.indexes?.[0].name).toBe('email_idx');
    });

    it('should add constraints', () => {
      const entity = new EntityBuilder('user')
        .setName('User', 'Users')
        .setTable('users', ['id'])
        .addColumn('id', { type: dbTypes.uuid() })
        .addColumn('email', { type: dbTypes.string(255) })
        .addConstraint({
          type: 'unique',
          columns: ['email'],
          name: 'unique_email',
        })
        .build();

      expect(entity.db.constraints).toBeDefined();
      expect(entity.db.constraints?.length).toBe(1);
    });

    it('should set permissions', () => {
      const entity = new EntityBuilder('user')
        .setName('User', 'Users')
        .setTable('users', ['id'])
        .addColumn('id', { type: dbTypes.uuid() })
        .setPermissions({
          role: {
            user: { read: true },
            admin: { read: true, write: true },
          },
        })
        .build();

      expect(entity.permissions).toBeDefined();
      expect(entity.permissions?.role?.admin?.write).toBe(true);
    });

    it('should add relationships', () => {
      const entity = new EntityBuilder('post')
        .setName('Post', 'Posts')
        .setTable('posts', ['id'])
        .addColumn('id', { type: dbTypes.uuid() })
        .addColumn('userId', { type: dbTypes.uuid() })
        .addRelationship('author', {
          type: 'many-to-one',
          foreignEntity: 'user',
          foreignKey: 'userId',
        })
        .build();

      expect(entity.relationships).toBeDefined();
      expect(entity.relationships!.author).toBeDefined();
      expect(entity.relationships!.author.relationType).toBe('many-to-one');
    });

    it('should set routes', () => {
      const entity = new EntityBuilder('user')
        .setName('User', 'Users')
        .setTable('users', ['id'])
        .addColumn('id', { type: dbTypes.uuid() })
        .setRoutes({
          api: {
            basePath: '/api/users',
            endpoints: {
              list: { method: 'GET', path: '/' },
            },
          },
        })
        .build();

      expect(entity.routes?.api?.basePath).toBe('/api/users');
    });

    it('should add lifecycle hooks', () => {
      const beforeCreate = () => {};
      const afterCreate = () => {};

      const entity = new EntityBuilder('user')
        .setName('User', 'Users')
        .setTable('users', ['id'])
        .addColumn('id', { type: dbTypes.uuid() })
        .addLifecycleHook('beforeCreate', beforeCreate)
        .addLifecycleHook('afterCreate', afterCreate)
        .build();

      expect(entity.lifecycle?.beforeCreate).toBe(beforeCreate);
      expect(entity.lifecycle?.afterCreate).toBe(afterCreate);
    });
  });

  describe('RelationshipBuilder', () => {
    it('should build one-to-one relationship', () => {
      const rel = RelationshipBuilder.create('userProfile')
        .setType('one-to-one')
        .setLocalEntity('user')
        .setForeignEntity('profile')
        .setForeignKey('userId')
        .setLocalKey('id')
        .build();

      expect(rel.relationType).toBe('one-to-one');
      expect(rel.foreignEntity).toBe('profile');
    });

    it('should build one-to-many relationship', () => {
      const rel = RelationshipBuilder.create('userPosts')
        .setType('one-to-many')
        .setLocalEntity('user')
        .setForeignEntity('post')
        .setForeignKey('userId')
        .build();

      expect(rel.relationType).toBe('one-to-many');
    });

    it('should build many-to-many relationship', () => {
      const rel = RelationshipBuilder.create('postTags')
        .setType('many-to-many')
        .setLocalEntity('post')
        .setForeignEntity('tag')
        .setJunctionTable('post_tags')
        .build();

      expect(rel.relationType).toBe('many-to-many');
      expect(rel.db.junctionTable?.name).toBe('post_tags');
    });

    it('should set cascade options', () => {
      const rel = RelationshipBuilder.create('postComments')
        .setType('one-to-many')
        .setLocalEntity('post')
        .setForeignEntity('comment')
        .setForeignKey('postId')
        .setCascade('cascade', 'cascade')
        .build();

      expect(rel.db.foreignKey.onDelete).toBe('cascade');
      expect(rel.db.foreignKey.onUpdate).toBe('cascade');
    });

    it('should set relationship as eager loaded', () => {
      const rel = RelationshipBuilder.create('postAuthor')
        .setType('many-to-one')
        .setLocalEntity('post')
        .setForeignEntity('user')
        .setForeignKey('userId')
        .setEagerLoad(true)
        .build();

      expect(rel.display.eager).toBe(true);
    });
  });

  describe('builders utility', () => {
    it('should provide field builder', () => {
      const field = builders
        .field()
        .setComponent(ComponentRegistry.get('TextField')!)
        .setSchema(validators.string)
        .build();

      expect(field.component).toBeTruthy();
    });

    it('should provide column builder', () => {
      const column = builders
        .column()
        .setType(dbTypes.string(255))
        .build();

      expect(column.type).toBeTruthy();
    });

    it('should provide entity builder', () => {
      const entity = builders
        .entity('user')
        .setName('User', 'Users')
        .setTable('users', ['id'])
        .addColumn('id', { type: dbTypes.uuid() })
        .build();

      expect(entity.id).toBe('user');
    });

    it('should provide relationship builder', () => {
      const rel = builders
        .relationship('userProfile')
        .setType('one-to-one')
        .setLocalEntity('user')
        .setForeignEntity('profile')
        .setForeignKey('userId')
        .build();

      expect(rel.relationType).toBe('one-to-one');
    });
  });

  describe('complex builder scenarios', () => {
    it('should build complete entity with all features', () => {
      const TextField = ComponentRegistry.get('TextField')!;
      const EmailField = ComponentRegistry.get('EmailField')!;

      const entity = new EntityBuilder('user')
        .setName('User', 'Users')
        .setTable('users', ['id'])
        .addField('id', {
          component: TextField,
          standardSchema: validators.uuid,
        })
        .addField('email', {
          component: EmailField,
          standardSchema: validators.email,
        })
        .addColumn('id', { type: dbTypes.uuid().primaryKey() })
        .addColumn('email', { type: dbTypes.string(255).unique() })
        .addIndex('email_idx', ['email'], { unique: true })
        .setPermissions({
          role: {
            user: { read: true },
            admin: { read: true, write: true, delete: true },
          },
        })
        .addRelationship('posts', {
          type: 'one-to-many',
          foreignEntity: 'post',
          foreignKey: 'userId',
        })
        .setRoutes({
          api: {
            basePath: '/api/users',
            endpoints: {
              list: { method: 'GET', path: '/' },
              get: { method: 'GET', path: '/:id' },
            },
          },
        })
        .build();

      expect(entity.id).toBe('user');
      expect(entity.db.table.name).toBe('users');
      expect(entity.db.indexes?.length).toBe(1);
      expect(entity.permissions?.role?.admin?.delete).toBe(true);
      expect(entity.relationships?.posts?.type).toBe('one-to-many');
      expect(entity.routes?.api?.basePath).toBe('/api/users');
    });

    it('should build entity with multiple relationships', () => {
      const entity = new EntityBuilder('post')
        .setName('Post', 'Posts')
        .setTable('posts', ['id'])
        .addColumn('id', { type: dbTypes.uuid() })
        .addColumn('userId', { type: dbTypes.uuid() })
        .addRelationship('author', {
          type: 'many-to-one',
          foreignEntity: 'user',
          foreignKey: 'userId',
        })
        .addRelationship('comments', {
          type: 'one-to-many',
          foreignEntity: 'comment',
          foreignKey: 'postId',
        })
        .addRelationship('tags', {
          type: 'many-to-many',
          foreignEntity: 'tag',
          junctionTable: 'post_tags',
        })
        .build();

      expect(Object.keys(entity.relationships || {})).toHaveLength(3);
      expect(entity.relationships?.author?.type).toBe('many-to-one');
      expect(entity.relationships?.comments?.type).toBe('one-to-many');
      expect(entity.relationships?.tags?.type).toBe('many-to-many');
    });
  });
});
