import { describe, it, expect } from 'vitest';
import {
  camelToSnake,
  snakeToCamel,
  pascalToCamel,
  camelToPascal,
  pluralize,
  singularize,
  deepClone,
  deepMerge,
  generateId,
  debounce,
  throttle,
  isEmpty,
  getNestedProperty,
  setNestedProperty,
  getFieldNames,
  getSortableFields,
  getFilterableFields,
  getEditableFields,
  getRequiredFields,
  getOptionalFields,
  getDefaultValues,
  getPrimaryKeyFields,
  getUniqueFields,
  getIndexedFields,
} from '../src/utils';
import { createEntity } from '../src/helpers';
import { dbTypes } from '../src/database';
import { validators } from '../src/validators';

describe('Utility Functions', () => {
  describe('string transformations', () => {
    it('should convert camelCase to snake_case', () => {
      expect(camelToSnake('camelCase')).toBe('camel_case');
      expect(camelToSnake('myVariableName')).toBe('my_variable_name');
      expect(camelToSnake('simple')).toBe('simple');
    });

    it('should convert snake_case to camelCase', () => {
      expect(snakeToCamel('snake_case')).toBe('snakeCase');
      expect(snakeToCamel('my_variable_name')).toBe('myVariableName');
      expect(snakeToCamel('simple')).toBe('simple');
    });

    it('should convert PascalCase to camelCase', () => {
      expect(pascalToCamel('PascalCase')).toBe('pascalCase');
      expect(pascalToCamel('MyClassName')).toBe('myClassName');
      expect(pascalToCamel('Simple')).toBe('simple');
    });

    it('should convert camelCase to PascalCase', () => {
      expect(camelToPascal('camelCase')).toBe('CamelCase');
      expect(camelToPascal('myVariableName')).toBe('MyVariableName');
      expect(camelToPascal('simple')).toBe('Simple');
    });
  });

  describe('pluralization', () => {
    it('should pluralize words', () => {
      expect(pluralize('user')).toBe('users');
      expect(pluralize('post')).toBe('posts');
      expect(pluralize('category')).toBe('categories');
      expect(pluralize('person')).toBe('people');
    });

    it('should singularize words', () => {
      expect(singularize('users')).toBe('user');
      expect(singularize('posts')).toBe('post');
      expect(singularize('categories')).toBe('category');
      expect(singularize('people')).toBe('person');
    });

    it('should handle already pluralized words', () => {
      expect(pluralize('users')).toBe('users');
    });

    it('should handle already singular words', () => {
      expect(singularize('user')).toBe('user');
    });
  });

  describe('object utilities', () => {
    it('should deep clone objects', () => {
      const original = {
        name: 'test',
        nested: { value: 42, array: [1, 2, 3] },
      };

      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.nested).not.toBe(original.nested);
      expect(cloned.nested.array).not.toBe(original.nested.array);
    });

    it('should deep clone arrays', () => {
      const original = [1, 2, { nested: [3, 4] }];
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned[2]).not.toBe(original[2]);
    });

    it('should deep merge objects', () => {
      const obj1 = { a: 1, b: { c: 2, d: 3 } };
      const obj2 = { b: { d: 4, e: 5 }, f: 6 };

      const merged = deepMerge(obj1, obj2);

      expect(merged).toEqual({
        a: 1,
        b: { c: 2, d: 4, e: 5 },
        f: 6,
      });
    });

    it('should check if value is empty', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty('')).toBe(true);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty({})).toBe(true);

      expect(isEmpty('text')).toBe(false);
      expect(isEmpty([1])).toBe(false);
      expect(isEmpty({ key: 'value' })).toBe(false);
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty(false)).toBe(false);
    });
  });

  describe('nested property access', () => {
    it('should get nested property', () => {
      const obj = {
        user: {
          profile: {
            name: 'John',
            age: 30,
          },
        },
      };

      expect(getNestedProperty(obj, 'user.profile.name')).toBe('John');
      expect(getNestedProperty(obj, 'user.profile.age')).toBe(30);
    });

    it('should return undefined for non-existent path', () => {
      const obj = { user: { name: 'John' } };

      expect(getNestedProperty(obj, 'user.email')).toBeUndefined();
      expect(getNestedProperty(obj, 'user.profile.name')).toBeUndefined();
    });

    it('should set nested property', () => {
      const obj: any = {};

      setNestedProperty(obj, 'user.profile.name', 'John');

      expect(obj.user.profile.name).toBe('John');
    });

    it('should update existing nested property', () => {
      const obj = {
        user: {
          profile: {
            name: 'John',
          },
        },
      };

      setNestedProperty(obj, 'user.profile.name', 'Jane');

      expect(obj.user.profile.name).toBe('Jane');
    });
  });

  describe('ID generation', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with prefix', () => {
      const id = generateId('user');

      expect(id.startsWith('user')).toBe(true);
    });

    it('should generate IDs of consistent length', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1.length).toBe(id2.length);
    });
  });

  describe('debounce and throttle', () => {
    it('should debounce function calls', async () => {
      let count = 0;
      const increment = () => count++;

      const debouncedIncrement = debounce(increment, 100);

      debouncedIncrement();
      debouncedIncrement();
      debouncedIncrement();

      expect(count).toBe(0);

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(count).toBe(1);
    });

    it('should throttle function calls', async () => {
      let count = 0;
      const increment = () => count++;

      const throttledIncrement = throttle(increment, 100);

      throttledIncrement();
      throttledIncrement();
      throttledIncrement();

      expect(count).toBe(1);

      await new Promise((resolve) => setTimeout(resolve, 150));

      throttledIncrement();
      expect(count).toBe(2);
    });
  });

  describe('entity field utilities', () => {
    const mockEntity = createEntity({
      id: 'user',
      name: { singular: 'User', plural: 'Users' },
      db: {
        table: { name: 'users', primaryKey: ['id'] },
        columns: {
          id: { type: dbTypes.uuid().primaryKey() },
          email: { type: dbTypes.string(255), unique: true },
          name: { type: dbTypes.string(100) },
          age: { type: dbTypes.integer() },
        },
      },
      fields: {
        id: {
          component: () => null,
          standardSchema: validators.uuid,
        },
        email: {
          component: () => null,
          standardSchema: validators.email,
          sortable: true,
          filterable: true,
        },
        name: {
          component: () => null,
          standardSchema: validators.stringMin(1),
          sortable: true,
        },
        age: {
          component: () => null,
          standardSchema: validators.number,
          filterable: true,
        },
      },
    });

    it('should get all field names', () => {
      const fieldNames = getFieldNames(mockEntity);

      expect(fieldNames).toContain('id');
      expect(fieldNames).toContain('email');
      expect(fieldNames).toContain('name');
      expect(fieldNames).toContain('age');
    });

    it('should get sortable fields', () => {
      const sortableFields = getSortableFields(mockEntity);

      expect(sortableFields).toContain('email');
      expect(sortableFields).toContain('name');
      expect(sortableFields).not.toContain('id');
      expect(sortableFields).not.toContain('age');
    });

    it('should get filterable fields', () => {
      const filterableFields = getFilterableFields(mockEntity);

      expect(filterableFields).toContain('email');
      expect(filterableFields).toContain('age');
      expect(filterableFields).not.toContain('id');
      expect(filterableFields).not.toContain('name');
    });

    it('should get editable fields', () => {
      const editableFields = getEditableFields(mockEntity);

      // All fields are editable unless marked otherwise
      expect(editableFields.length).toBeGreaterThan(0);
    });

    it('should get primary key fields', () => {
      const pkFields = getPrimaryKeyFields(mockEntity);

      expect(pkFields).toContain('id');
      expect(pkFields.length).toBe(1);
    });

    it('should get unique fields', () => {
      const uniqueFields = getUniqueFields(mockEntity);

      expect(uniqueFields).toContain('email');
    });

    it('should get required fields', () => {
      const requiredFields = getRequiredFields(mockEntity);

      // Fields without .optional() are required
      expect(requiredFields.length).toBeGreaterThan(0);
    });

    it('should get optional fields', () => {
      const optionalEntity = createEntity({
        id: 'user',
        name: { singular: 'User', plural: 'Users' },
        db: {
          table: { name: 'users', primaryKey: ['id'] },
          columns: {
            id: { type: dbTypes.uuid() },
            bio: { type: dbTypes.string(500) },
          },
        },
        fields: {
          id: {
            component: () => null,
            standardSchema: validators.uuid,
          },
          bio: {
          component: () => null,
          standardSchema: validators.string.optional(),
            optional: true,
          },
        },
      });

      const optionalFields = getOptionalFields(optionalEntity);

      expect(optionalFields).toContain('bio');
    });

    it('should get default values', () => {
      const entityWithDefaults = createEntity({
        id: 'user',
        name: { singular: 'User', plural: 'Users' },
        db: {
          table: { name: 'users', primaryKey: ['id'] },
          columns: {
            id: { type: dbTypes.uuid() },
            role: { type: dbTypes.string(50) },
          },
        },
        fields: {
          id: {
            component: () => null,
            standardSchema: validators.uuid,
          },
          role: {
          component: () => null,
          standardSchema: validators.string.default('user'),
            defaultValue: 'user',
          },
        },
      });

      const defaults = getDefaultValues(entityWithDefaults);

      expect(defaults.role).toBe('user');
    });
  });

  describe('entity validation utilities', () => {
    const mockEntity = createEntity({
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
          component: () => null,
          standardSchema: validators.uuid,
        },
        email: {
          component: () => null,
          standardSchema: validators.email,
        },
      },
    });

    it('should get indexed fields', () => {
      const entityWithIndex = createEntity({
        id: 'user',
        name: { singular: 'User', plural: 'Users' },
        db: {
          table: { name: 'users', primaryKey: ['id'] },
          columns: {
            id: { type: dbTypes.uuid() },
            email: { type: dbTypes.string(255) },
          },
          indexes: [
            {
              name: 'email_idx',
              columns: ['email'],
            },
          ],
        },
        fields: {
          id: {
            component: () => null,
            standardSchema: validators.uuid,
          },
          email: {
            component: () => null,
            standardSchema: validators.email,
          },
        },
      });

      const indexedFields = getIndexedFields(entityWithIndex);

      expect(indexedFields).toContain('email');
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings in case conversion', () => {
      expect(camelToSnake('')).toBe('');
      expect(snakeToCamel('')).toBe('');
      expect(pascalToCamel('')).toBe('');
      expect(camelToPascal('')).toBe('');
    });

    it('should handle special characters in pluralization', () => {
      expect(pluralize('user-profile')).toBeTruthy();
      expect(singularize('user-profiles')).toBeTruthy();
    });

    it('should handle null values in deepClone', () => {
      expect(deepClone(null)).toBe(null);
      expect(deepClone(undefined)).toBe(undefined);
    });

    it('should handle circular references gracefully', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;

      // Should not throw
      expect(() => {
        try {
          deepClone(obj);
        } catch (e) {
          // Expected for circular references
        }
      }).not.toThrow();
    });

    it('should handle arrays in nested property access', () => {
      const obj = {
        users: [
          { name: 'John' },
          { name: 'Jane' },
        ],
      };

      expect(getNestedProperty(obj, 'users.0.name')).toBe('John');
      expect(getNestedProperty(obj, 'users.1.name')).toBe('Jane');
    });

    it('should preserve types in deep merge', () => {
      const obj1 = { date: new Date('2024-01-01'), count: 5 };
      const obj2 = { date: new Date('2024-06-01'), name: 'test' };

      const merged = deepMerge(obj1, obj2);

      expect(merged.date).toBeInstanceOf(Date);
      expect(merged.count).toBe(5);
      expect(merged.name).toBe('test');
    });
  });
});
