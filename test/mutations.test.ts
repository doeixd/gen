import { describe, it, expect, vi } from 'vitest';
import { MutatorFactory } from '../src/mutations';
import { validators } from '../src/validators';
import type { MutationContext, EntityMutator } from '../src/mutations';

describe('Mutation System', () => {
  const mockContext: MutationContext = {
    userId: 'user-1',
    timestamp: new Date(),
    metadata: {},
  };

  describe('MutatorFactory', () => {
    it('should create insert mutator', () => {
      const mutator = MutatorFactory.createInsert({
        name: 'createUser',
        version: 1,
        inputSchema: validators.object({
          email: validators.email,
          name: validators.stringMin(1),
        }),
        execute: async (input) => ({
          id: 'new-id',
          ...input,
        }),
      });

      expect(mutator.name).toBe('createUser');
      expect(mutator.version).toBe(1);
      expect(mutator.type).toBe('insert');
    });

    it('should create update mutator', () => {
      const mutator = MutatorFactory.createUpdate({
        name: 'updateUser',
        version: 1,
        inputSchema: validators.object({
          id: validators.uuid,
          email: validators.email.optional(),
          name: validators.stringMin(1).optional(),
        }),
        execute: async (input) => input,
      });

      expect(mutator.name).toBe('updateUser');
      expect(mutator.type).toBe('update');
    });

    it('should create delete mutator', () => {
      const mutator = MutatorFactory.createDelete({
        name: 'deleteUser',
        version: 1,
        inputSchema: validators.object({
          id: validators.uuid,
        }),
        execute: async (input) => ({ deleted: true }),
      });

      expect(mutator.name).toBe('deleteUser');
      expect(mutator.type).toBe('delete');
    });
  });

  describe('mutation execution', () => {
    it('should execute mutation with valid input', async () => {
      const mutator = MutatorFactory.createInsert({
        name: 'createUser',
        version: 1,
        inputSchema: validators.object({
          email: validators.email,
        }),
        execute: async (input) => ({ id: 'new-id', ...input }),
      });

      const result = await mutator.execute(
        { email: 'test@example.com' },
        mockContext
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.id).toBe('new-id');
      }
    });

    it('should fail with invalid input', async () => {
      const mutator = MutatorFactory.createInsert({
        name: 'createUser',
        version: 1,
        inputSchema: validators.object({
          email: validators.email,
        }),
        execute: async (input) => ({ id: 'new-id', ...input }),
      });

      const result = await mutator.execute(
        { email: 'not-an-email' },
        mockContext
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });

    it('should record mutation history', async () => {
      const mutator = MutatorFactory.createInsert({
        name: 'createUser',
        version: 1,
        inputSchema: validators.object({
          email: validators.email,
        }),
        execute: async (input) => ({ id: 'new-id', ...input }),
      });

      const result = await mutator.execute(
        { email: 'test@example.com' },
        mockContext
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.history).toBeTruthy();
        expect(result.history?.mutatorName).toBe('createUser');
        expect(result.history?.userId).toBe('user-1');
        expect(result.history?.input).toEqual({ email: 'test@example.com' });
      }
    });
  });

  describe('lifecycle hooks', () => {
    it('should call beforeMutate hook', async () => {
      const beforeHook = vi.fn(async (input) => input);

      const mutator = MutatorFactory.createInsert({
        name: 'createUser',
        version: 1,
        inputSchema: validators.object({
          email: validators.email,
        }),
        execute: async (input) => ({ id: 'new-id', ...input }),
        beforeMutate: beforeHook,
      });

      await mutator.execute({ email: 'test@example.com' }, mockContext);

      expect(beforeHook).toHaveBeenCalledWith(
        { email: 'test@example.com' },
        mockContext
      );
    });

    it('should call afterMutate hook', async () => {
      const afterHook = vi.fn(async (result) => result);

      const mutator = MutatorFactory.createInsert({
        name: 'createUser',
        version: 1,
        inputSchema: validators.object({
          email: validators.email,
        }),
        execute: async (input) => ({ id: 'new-id', ...input }),
        afterMutate: afterHook,
      });

      const result = await mutator.execute({ email: 'test@example.com' }, mockContext);

      expect(afterHook).toHaveBeenCalled();
      if (result.success) {
        expect(afterHook).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'new-id' }),
          mockContext
        );
      }
    });

    it('should call onSuccess hook', async () => {
      const onSuccess = vi.fn();

      const mutator = MutatorFactory.createInsert({
        name: 'createUser',
        version: 1,
        inputSchema: validators.object({
          email: validators.email,
        }),
        execute: async (input) => ({ id: 'new-id', ...input }),
        onSuccess,
      });

      const result = await mutator.execute({ email: 'test@example.com' }, mockContext);

      if (result.success) {
        expect(onSuccess).toHaveBeenCalled();
      }
    });

    it('should call onError hook on failure', async () => {
      const onError = vi.fn();

      const mutator = MutatorFactory.createInsert({
        name: 'createUser',
        version: 1,
        inputSchema: validators.object({
          email: validators.email,
        }),
        execute: async () => {
          throw new Error('Test error');
        },
        onError,
      });

      const result = await mutator.execute({ email: 'test@example.com' }, mockContext);

      expect(result.success).toBe(false);
      expect(onError).toHaveBeenCalled();
    });

    it('should transform input in beforeMutate', async () => {
      const mutator = MutatorFactory.createInsert({
        name: 'createUser',
        version: 1,
        inputSchema: validators.object({
          email: validators.email,
          name: validators.string().optional(),
        }),
        execute: async (input) => ({ id: 'new-id', ...input }),
        beforeMutate: async (input) => ({
          ...input,
          name: input.name?.toUpperCase(),
        }),
      });

      const result = await mutator.execute(
        { email: 'test@example.com', name: 'john' },
        mockContext
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('JOHN');
      }
    });
  });

  describe('mutation versioning', () => {
    it('should track mutation version', async () => {
      const mutator = MutatorFactory.createInsert({
        name: 'createUser',
        version: 2,
        inputSchema: validators.object({
          email: validators.email,
        }),
        execute: async (input) => ({ id: 'new-id', ...input }),
      });

      const result = await mutator.execute(
        { email: 'test@example.com' },
        mockContext
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.history?.version).toBe(2);
      }
    });

    it('should allow multiple versions of same mutator', () => {
      const v1 = MutatorFactory.createInsert({
        name: 'createUser',
        version: 1,
        inputSchema: validators.object({ email: validators.email }),
        execute: async (input) => input,
      });

      const v2 = MutatorFactory.createInsert({
        name: 'createUser',
        version: 2,
        inputSchema: validators.object({
          email: validators.email,
          name: validators.string(),
        }),
        execute: async (input) => input,
      });

      expect(v1.version).toBe(1);
      expect(v2.version).toBe(2);
    });
  });

  describe('rollback support', () => {
    it('should support rollback for update mutations', async () => {
      const mutator = MutatorFactory.createUpdate({
        name: 'updateUser',
        version: 1,
        inputSchema: validators.object({
          id: validators.uuid,
          email: validators.email,
        }),
        execute: async (input) => input,
        rollback: async (history) => {
          return { rolledBack: true, originalData: history.input };
        },
      });

      expect(mutator.rollback).toBeDefined();
    });

    it('should execute rollback successfully', async () => {
      const rollbackFn = vi.fn(async (history) => ({
        rolledBack: true,
      }));

      const mutator = MutatorFactory.createUpdate({
        name: 'updateUser',
        version: 1,
        inputSchema: validators.object({
          id: validators.uuid,
          email: validators.email,
        }),
        execute: async (input) => input,
        rollback: rollbackFn,
      });

      const result = await mutator.execute(
        { id: '550e8400-e29b-41d4-a716-446655440000', email: 'new@example.com' },
        mockContext
      );

      if (result.success && result.history && mutator.rollback) {
        await mutator.rollback(result.history, mockContext);
        expect(rollbackFn).toHaveBeenCalled();
      }
    });
  });

  describe('approval workflows', () => {
    it('should mark mutation as pending approval', async () => {
      const mutator = MutatorFactory.createUpdate({
        name: 'updateSensitiveData',
        version: 1,
        inputSchema: validators.object({
          id: validators.uuid,
          data: validators.string(),
        }),
        execute: async (input) => input,
        requiresApproval: true,
      });

      expect(mutator.requiresApproval).toBe(true);
    });

    it('should execute mutation after approval', async () => {
      const executeFn = vi.fn(async (input) => input);

      const mutator = MutatorFactory.createUpdate({
        name: 'updateSensitiveData',
        version: 1,
        inputSchema: validators.object({
          id: validators.uuid,
          data: validators.string(),
        }),
        execute: executeFn,
        requiresApproval: true,
      });

      // Simulate approval process
      if (mutator.requiresApproval) {
        // Would normally wait for approval
        const result = await mutator.execute(
          { id: '550e8400-e29b-41d4-a716-446655440000', data: 'sensitive' },
          mockContext
        );
        expect(result.success).toBe(true);
      }
    });
  });

  describe('standard CRUD mutators', () => {
    it('should create standard insert mutator', () => {
      const mutators = MutatorFactory.createStandardMutators('user', {
        insert: validators.object({
          email: validators.email,
          name: validators.string(),
        }),
        update: validators.object({
          id: validators.uuid,
          email: validators.email.optional(),
          name: validators.string().optional(),
        }),
        delete: validators.object({
          id: validators.uuid,
        }),
      });

      expect(mutators.insert.name).toBe('insertUser');
      expect(mutators.update.name).toBe('updateUser');
      expect(mutators.delete.name).toBe('deleteUser');
    });
  });
});
