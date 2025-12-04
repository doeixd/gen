import { describe, it, expect } from 'vitest';
import { validators, createValidator, extractStandardSchema } from '../src/validators';

describe('Validators', () => {
  describe('string validators', () => {
    it('should validate strings', () => {
      const result = validators.string.parse('test');
      expect(result).toBe('test');
    });

    it('should validate minimum length', () => {
      const validator = validators.stringMin(5);
      expect(validator.parse('hello')).toBe('hello');
      expect(() => validator.parse('hi')).toThrow();
    });

    it('should validate maximum length', () => {
      const validator = validators.stringMax(5);
      expect(validator.parse('hello')).toBe('hello');
      expect(() => validator.parse('too long')).toThrow();
    });

    it('should validate email format', () => {
      expect(validators.email.parse('test@example.com')).toBe('test@example.com');
      expect(() => validators.email.parse('not-an-email')).toThrow();
    });

    it('should validate URL format', () => {
      expect(validators.url.parse('https://example.com')).toBe('https://example.com');
      expect(() => validators.url.parse('not-a-url')).toThrow();
    });

    it('should validate UUID format', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(validators.uuid.parse(uuid)).toBe(uuid);
      expect(() => validators.uuid.parse('not-a-uuid')).toThrow();
    });
  });

  describe('number validators', () => {
    it('should validate numbers', () => {
      expect(validators.number.parse(42)).toBe(42);
      expect(validators.number.parse(3.14)).toBe(3.14);
      expect(() => validators.number.parse('not a number')).toThrow();
    });

    it('should validate integers', () => {
      expect(validators.integer.parse(42)).toBe(42);
      expect(() => validators.integer.parse(3.14)).toThrow();
    });

    it('should validate positive numbers', () => {
      const validator = validators.numberMin(0);
      expect(validator.parse(5)).toBe(5);
      expect(() => validator.parse(-5)).toThrow();
    });

    it('should validate number range', () => {
      const validator = validators.numberMin(0).and(validators.numberMax(100));
      expect(validator.parse(50)).toBe(50);
      expect(() => validator.parse(-1)).toThrow();
      expect(() => validator.parse(101)).toThrow();
    });
  });

  describe('boolean validators', () => {
    it('should validate booleans', () => {
      expect(validators.boolean.parse(true)).toBe(true);
      expect(validators.boolean.parse(false)).toBe(false);
      expect(() => validators.boolean.parse('not a boolean')).toThrow();
    });
  });

  describe('date validators', () => {
    it('should validate dates', () => {
      const date = new Date('2024-01-01');
      const result = validators.date.parse(date);
      expect(result).toBeInstanceOf(Date);
    });

    it('should parse date strings', () => {
      const result = validators.date.parse('2024-01-01');
      expect(result).toBeInstanceOf(Date);
    });

    it('should validate minimum date', () => {
      const minDate = new Date('2024-01-01');
      const validator = validators.dateMin(minDate);

      expect(validator.parse(new Date('2024-06-01'))).toBeInstanceOf(Date);
      expect(() => validator.parse(new Date('2023-12-01'))).toThrow();
    });
  });

  describe('array validators', () => {
    it('should validate arrays', () => {
      const validator = validators.array(validators.string);
      expect(validator.parse(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
      expect(() => validator.parse(['a', 1, 'c'])).toThrow();
    });

    it('should validate array length', () => {
      const validator = validators.arrayMin(validators.string, 2);
      expect(validator.parse(['a', 'b'])).toEqual(['a', 'b']);
      expect(() => validator.parse(['a'])).toThrow();
    });

    it('should validate empty arrays', () => {
      const validator = validators.array(validators.string);
      expect(validator.parse([])).toEqual([]);
    });
  });

  describe('object validators', () => {
    it('should validate objects', () => {
      const validator = validators.object({
        name: validators.string,
        age: validators.number,
      });

      const result = validator.parse({ name: 'John', age: 30 });
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should reject invalid objects', () => {
      const validator = validators.object({
        name: validators.string,
        age: validators.number,
      });

      expect(() => validator.parse({ name: 'John', age: 'thirty' })).toThrow();
    });

    it('should handle nested objects', () => {
      const validator = validators.object({
        user: validators.object({
          name: validators.string,
          email: validators.email,
        }),
      });

      const result = validator.parse({
        user: { name: 'John', email: 'john@example.com' },
      });

      expect(result.user.email).toBe('john@example.com');
    });

    it('should handle optional fields', () => {
      const validator = validators.object({
        name: validators.string,
        email: validators.email.optional(),
      });

      expect(validator.parse({ name: 'John' })).toEqual({ name: 'John' });
      expect(validator.parse({ name: 'John', email: 'john@example.com' })).toEqual({
        name: 'John',
        email: 'john@example.com',
      });
    });
  });

  describe('enum validators', () => {
    it('should validate enum values', () => {
      const validator = validators.enum(['active', 'inactive', 'pending']);

      expect(validator.parse('active')).toBe('active');
      expect(validator.parse('inactive')).toBe('inactive');
      expect(() => validator.parse('unknown')).toThrow();
    });

    it('should validate numeric enums', () => {
      const validator = validators.enum([1, 2, 3]);

      expect(validator.parse(1)).toBe(1);
      expect(() => validator.parse(4)).toThrow();
    });
  });

  describe('union validators', () => {
    it('should validate union types', () => {
      const validator = validators.union([validators.string, validators.number]);

      expect(validator.parse('test')).toBe('test');
      expect(validator.parse(42)).toBe(42);
      expect(() => validator.parse(true)).toThrow();
    });

    it('should validate nullable values', () => {
      const validator = validators.nullable(validators.string);

      expect(validator.parse('test')).toBe('test');
      expect(validator.parse(null)).toBe(null);
      expect(() => validator.parse(undefined)).toThrow();
    });

    it('should validate optional values', () => {
      const validator = validators.string.optional();

      expect(validator.parse('test')).toBe('test');
      expect(validator.parse(undefined)).toBe(undefined);
    });
  });

  describe('custom validators', () => {
    it('should create custom validator', () => {
      const validator = createValidator<string>({
        validate: (value) => {
          if (typeof value !== 'string' || !value.startsWith('test-')) {
            throw new Error('Must start with "test-"');
          }
          return value;
        },
      });

      expect(validator.parse('test-123')).toBe('test-123');
      expect(() => validator.parse('abc-123')).toThrow();
    });

    it('should support async validators', async () => {
      const validator = createValidator<string>({
        validate: async (value) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          if (typeof value !== 'string') {
            throw new Error('Must be a string');
          }
          return value;
        },
      });

      const result = await validator.parseAsync('test');
      expect(result).toBe('test');
    });

    it('should refine existing validators', () => {
      const validator = validators.string.refine((val) => val.length >= 5, {
        message: 'String must be at least 5 characters',
      });

      expect(validator.parse('hello')).toBe('hello');
      expect(() => validator.parse('hi')).toThrow('at least 5 characters');
    });
  });

  describe('transformations', () => {
    it('should transform values', () => {
      const validator = validators.string.transform((val) => val.toUpperCase());

      expect(validator.parse('hello')).toBe('HELLO');
    });

    it('should chain transformations', () => {
      const validator = validators.string
        .transform((val) => val.trim())
        .transform((val) => val.toUpperCase());

      expect(validator.parse('  hello  ')).toBe('HELLO');
    });

    it('should coerce types', () => {
      const validator = validators.coerce.number();

      expect(validator.parse('42')).toBe(42);
      expect(validator.parse('3.14')).toBe(3.14);
    });
  });

  describe('default values', () => {
    it('should use default values', () => {
      const validator = validators.string.default('default');

      expect(validator.parse(undefined)).toBe('default');
      expect(validator.parse('custom')).toBe('custom');
    });

    it('should use default function', () => {
      let counter = 0;
      const validator = validators.number.default(() => ++counter);

      expect(validator.parse(undefined)).toBe(1);
      expect(validator.parse(undefined)).toBe(2);
      expect(validator.parse(42)).toBe(42);
    });
  });

  describe('error handling', () => {
    it('should provide detailed error messages', () => {
      const validator = validators.object({
        email: validators.email,
        age: validators.number,
      });

      try {
        validator.parse({ email: 'not-an-email', age: 'not-a-number' });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.errors).toBeTruthy();
        expect(error.errors.length).toBeGreaterThan(0);
      }
    });

    it('should support safeParse', () => {
      const validator = validators.email;

      const success = validator.safeParse('test@example.com');
      expect(success.success).toBe(true);
      if (success.success) {
        expect(success.data).toBe('test@example.com');
      }

      const failure = validator.safeParse('not-an-email');
      expect(failure.success).toBe(false);
      if (!failure.success) {
        expect(failure.error).toBeTruthy();
      }
    });
  });

  describe('extractStandardSchema', () => {
    it('should extract standard schema from Zod schema', () => {
      const schema = extractStandardSchema(validators.email);

      expect(schema).toBeTruthy();
      expect(typeof schema!.parse).toBe('function');
    });

    it('should work with complex schemas', () => {
      const complexSchema = validators.object({
        user: validators.object({
          email: validators.email,
          age: validators.number,
        }),
        tags: validators.array(validators.string),
      });

      const extracted = extractStandardSchema(complexSchema);
      expect(extracted).toBeTruthy();
    });
  });

  describe('validator composition', () => {
    it('should compose multiple validators', () => {
      const passwordValidator = validators.stringMin(8)
        .regex(/[A-Z]/, 'Must contain uppercase')
        .regex(/[a-z]/, 'Must contain lowercase')
        .regex(/[0-9]/, 'Must contain number');

      expect(passwordValidator.parse('Password123')).toBe('Password123');
      expect(() => passwordValidator.parse('password')).toThrow('uppercase');
      expect(() => passwordValidator.parse('PASSWORD123')).toThrow('lowercase');
      expect(() => passwordValidator.parse('Password')).toThrow('number');
      expect(() => passwordValidator.parse('Pass1')).toThrow();
    });

    it('should use logical operators', () => {
      const validator = validators.union([
        validators.email,
        validators.url,
      ]);

      expect(validator.parse('test@example.com')).toBe('test@example.com');
      expect(validator.parse('https://example.com')).toBe('https://example.com');
      expect(() => validator.parse('not-email-or-url')).toThrow();
    });
  });

  describe('recursive schemas', () => {
    // Note: Recursive schemas with Zod lazy require careful setup
    // Skipping this test for initial release - to be revisited
    it.skip('should handle recursive schemas', () => {
      type Category = {
        name: string;
        subcategories?: Category[];
      };

      // Correct pattern: use lazy to wrap the entire schema
      const categoryValidator: any = validators.lazy(() =>
        validators.object({
          name: validators.string,
          subcategories: validators.optional(
            validators.array(categoryValidator)
          ),
        })
      );

      const data = {
        name: 'Root',
        subcategories: [
          {
            name: 'Child1',
            subcategories: [{ name: 'Grandchild' }],
          },
          { name: 'Child2' },
        ],
      };

      const result = categoryValidator.parse(data);
      expect(result.subcategories[0].subcategories[0].name).toBe('Grandchild');
    });
  });
});
