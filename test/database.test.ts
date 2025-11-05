import { describe, it, expect } from 'vitest';
import { dbTypes } from '../src/database';

describe('Database Types', () => {
  describe('string type', () => {
    it('should create string column', () => {
      const col = dbTypes.string(255);
      expect(col.serialize('test')).toBe('test');
      expect(col.deserialize('test')).toBe('test');
    });

    it('should handle null values when nullable', () => {
      const col = dbTypes.string(255).nullable();
      expect(col.serialize(null)).toBe(null);
      expect(col.deserialize(null)).toBe(null);
    });

    it('should generate Drizzle code', () => {
      const col = dbTypes.string(255);
      const code = col.toDrizzle('name');
      expect(code).toContain('varchar');
      expect(code).toContain('255');
    });

    it('should generate Prisma code', () => {
      const col = dbTypes.string(255);
      const code = col.toPrisma('name');
      expect(code).toContain('String');
    });

    it('should generate SQL code', () => {
      const col = dbTypes.string(255);
      const code = col.toSQL('name', 'postgres');
      expect(code).toContain('VARCHAR(255)');
    });
  });

  describe('number type', () => {
    it('should create integer column', () => {
      const col = dbTypes.integer();
      expect(col.serialize(42)).toBe(42);
      expect(col.deserialize(42)).toBe(42);
    });

    it('should create float column', () => {
      const col = dbTypes.float();
      expect(col.serialize(3.14)).toBe(3.14);
      expect(col.deserialize(3.14)).toBe(3.14);
    });

    it('should create decimal column', () => {
      const col = dbTypes.decimal(10, 2);
      expect(col.serialize('99.99')).toBe('99.99');
      expect(col.deserialize('99.99')).toBe('99.99');
    });
  });

  describe('boolean type', () => {
    it('should create boolean column', () => {
      const col = dbTypes.boolean();
      expect(col.serialize(true)).toBe(true);
      expect(col.deserialize(true)).toBe(true);
      expect(col.serialize(false)).toBe(false);
      expect(col.deserialize(false)).toBe(false);
    });

    it('should generate correct SQL', () => {
      const col = dbTypes.boolean();
      const code = col.toSQL('active', 'postgres');
      expect(code).toContain('BOOLEAN');
    });
  });

  describe('date and time types', () => {
    it('should create date column', () => {
      const col = dbTypes.date();
      const date = new Date('2024-01-01');
      const serialized = col.serialize(date);
      expect(serialized).toBeInstanceOf(Date);
    });

    it('should create timestamp column', () => {
      const col = dbTypes.timestamp();
      const now = new Date();
      expect(col.serialize(now)).toBeInstanceOf(Date);
    });

    it('should handle default now()', () => {
      const col = dbTypes.timestamp().defaultNow();
      const code = col.toDrizzle('created_at');
      expect(code).toContain('default');
    });
  });

  describe('special types', () => {
    it('should create UUID column', () => {
      const col = dbTypes.uuid();
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(col.serialize(uuid)).toBe(uuid);
    });

    it('should create JSON column', () => {
      const col = dbTypes.json();
      const obj = { key: 'value', nested: { data: 123 } };
      const serialized = col.serialize(obj);
      expect(serialized).toEqual(obj);
    });

    it('should create array column', () => {
      const col = dbTypes.array(dbTypes.string(50));
      const arr = ['one', 'two', 'three'];
      expect(col.serialize(arr)).toEqual(arr);
    });

    it('should create enum column', () => {
      const col = dbTypes.enum(['active', 'inactive', 'pending']);
      expect(col.serialize('active')).toBe('active');
    });
  });

  describe('id types', () => {
    it('should create auto-increment ID', () => {
      const col = dbTypes.id();
      const code = col.toDrizzle('id');
      expect(code).toContain('serial');
    });

    it('should create UUID ID', () => {
      const col = dbTypes.id('uuid');
      const code = col.toDrizzle('id');
      expect(code).toContain('uuid');
    });

    it('should create CUID ID', () => {
      const col = dbTypes.id('cuid');
      const code = col.toSQL('id', 'postgres');
      expect(code).toBeTruthy();
    });
  });

  describe('column modifiers', () => {
    it('should mark column as nullable', () => {
      const col = dbTypes.string(255).nullable();
      expect(col.serialize(null)).toBe(null);
    });

    it('should set default value', () => {
      const col = dbTypes.string(50).default('default_value');
      const code = col.toDrizzle('name');
      expect(code).toContain('default');
    });

    it('should mark column as unique', () => {
      const col = dbTypes.string(255).unique();
      const code = col.toDrizzle('email');
      expect(code).toContain('unique');
    });

    it('should mark column as primary key', () => {
      const col = dbTypes.integer().primaryKey();
      const code = col.toDrizzle('id');
      expect(code).toContain('primaryKey');
    });
  });

  describe('code generation for different databases', () => {
    it('should generate PostgreSQL code', () => {
      const col = dbTypes.string(255);
      const code = col.toSQL('name', 'postgres');
      expect(code).toContain('VARCHAR(255)');
    });

    it('should generate MySQL code', () => {
      const col = dbTypes.string(255);
      const code = col.toSQL('name', 'mysql');
      expect(code).toContain('VARCHAR(255)');
    });

    it('should generate SQLite code', () => {
      const col = dbTypes.string(255);
      const code = col.toSQL('name', 'sqlite');
      expect(code).toBeTruthy();
    });

    it('should generate Convex code', () => {
      const col = dbTypes.string(255);
      const code = col.toConvex('name');
      expect(code).toContain('v.string()');
    });
  });
});
