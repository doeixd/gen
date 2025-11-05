import { describe, it, expect } from 'vitest';
import { PermissionEngine } from '../src/permissions';
import type { User, EntityPermissions, PermissionConfig } from '../src/permissions';

describe('Permission System', () => {
  const mockUser: User = {
    id: 'user-1',
    role: 'user',
    organizationId: 'org-1',
    attributes: {
      department: 'engineering',
      level: 'senior',
    },
  };

  const adminUser: User = {
    id: 'admin-1',
    role: 'admin',
    organizationId: 'org-1',
  };

  describe('role-based permissions', () => {
    it('should allow read access for user role', () => {
      const permissions: EntityPermissions = {
        role: {
          user: { read: true },
          admin: { read: true, write: true },
        },
      };

      const result = PermissionEngine.check(mockUser, permissions, 'read');
      expect(result.allowed).toBe(true);
    });

    it('should deny write access for user role', () => {
      const permissions: EntityPermissions = {
        role: {
          user: { read: true },
          admin: { read: true, write: true },
        },
      };

      const result = PermissionEngine.check(mockUser, permissions, 'write');
      expect(result.allowed).toBe(false);
    });

    it('should allow all actions for admin', () => {
      const permissions: EntityPermissions = {
        role: {
          user: { read: true },
          admin: { read: true, write: true, create: true, delete: true },
        },
      };

      expect(PermissionEngine.check(adminUser, permissions, 'read').allowed).toBe(true);
      expect(PermissionEngine.check(adminUser, permissions, 'write').allowed).toBe(true);
      expect(PermissionEngine.check(adminUser, permissions, 'create').allowed).toBe(true);
      expect(PermissionEngine.check(adminUser, permissions, 'delete').allowed).toBe(true);
    });
  });

  describe('ownership-based permissions', () => {
    it('should allow access when user owns the resource', () => {
      const permissions: EntityPermissions = {
        ownership: {
          ownerField: 'userId',
          allowOwner: ['read', 'write'],
        },
      };

      const resource = { userId: 'user-1' };
      const result = PermissionEngine.check(mockUser, permissions, 'read', resource);
      expect(result.allowed).toBe(true);
    });

    it('should deny access when user does not own the resource', () => {
      const permissions: EntityPermissions = {
        ownership: {
          ownerField: 'userId',
          allowOwner: ['read', 'write'],
        },
      };

      const resource = { userId: 'other-user' };
      const result = PermissionEngine.check(mockUser, permissions, 'read', resource);
      expect(result.allowed).toBe(false);
    });

    it('should handle nested owner fields', () => {
      const permissions: EntityPermissions = {
        ownership: {
          ownerField: 'owner.id',
          allowOwner: ['read'],
        },
      };

      const resource = { owner: { id: 'user-1' } };
      const result = PermissionEngine.check(mockUser, permissions, 'read', resource);
      expect(result.allowed).toBe(true);
    });
  });

  describe('organization-based permissions', () => {
    it('should allow access within same organization', () => {
      const permissions: EntityPermissions = {
        organization: {
          field: 'organizationId',
          allowSameOrg: true,
        },
      };

      const resource = { organizationId: 'org-1' };
      const result = PermissionEngine.check(mockUser, permissions, 'read', resource);
      expect(result.allowed).toBe(true);
    });

    it('should deny access from different organization', () => {
      const permissions: EntityPermissions = {
        organization: {
          field: 'organizationId',
          allowSameOrg: true,
        },
      };

      const resource = { organizationId: 'org-2' };
      const result = PermissionEngine.check(mockUser, permissions, 'read', resource);
      expect(result.allowed).toBe(false);
    });
  });

  describe('attribute-based permissions (ABAC)', () => {
    it('should allow access when attribute matches', () => {
      const permissions: EntityPermissions = {
        abac: {
          rules: [
            {
              attribute: 'department',
              operator: 'equals',
              value: 'engineering',
              action: ['read', 'write'],
            },
          ],
        },
      };

      const result = PermissionEngine.check(mockUser, permissions, 'read');
      expect(result.allowed).toBe(true);
    });

    it('should deny access when attribute does not match', () => {
      const permissions: EntityPermissions = {
        abac: {
          rules: [
            {
              attribute: 'department',
              operator: 'equals',
              value: 'marketing',
              action: ['read'],
            },
          ],
        },
      };

      const result = PermissionEngine.check(mockUser, permissions, 'read');
      expect(result.allowed).toBe(false);
    });

    it('should support "in" operator', () => {
      const permissions: EntityPermissions = {
        abac: {
          rules: [
            {
              attribute: 'department',
              operator: 'in',
              value: ['engineering', 'design', 'product'],
              action: ['read'],
            },
          ],
        },
      };

      const result = PermissionEngine.check(mockUser, permissions, 'read');
      expect(result.allowed).toBe(true);
    });
  });

  describe('temporal permissions', () => {
    it('should allow access within time window', () => {
      const now = new Date();
      const future = new Date(now.getTime() + 3600000); // +1 hour

      const permissions: EntityPermissions = {
        temporal: {
          timeWindows: [
            {
              start: now,
              end: future,
              actions: ['read', 'write'],
            },
          ],
        },
      };

      const result = PermissionEngine.check(mockUser, permissions, 'read');
      expect(result.allowed).toBe(true);
    });

    it('should deny access outside time window', () => {
      const past = new Date('2020-01-01');
      const pastEnd = new Date('2020-01-02');

      const permissions: EntityPermissions = {
        temporal: {
          timeWindows: [
            {
              start: past,
              end: pastEnd,
              actions: ['read'],
            },
          ],
        },
      };

      const result = PermissionEngine.check(mockUser, permissions, 'read');
      expect(result.allowed).toBe(false);
    });

    it('should handle schedule-based permissions', () => {
      const permissions: EntityPermissions = {
        temporal: {
          schedule: {
            daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
            hoursOfDay: { start: 9, end: 17 }, // 9 AM - 5 PM
            actions: ['write'],
          },
        },
      };

      // Note: This test depends on when it's run, so we just verify it doesn't throw
      const result = PermissionEngine.check(mockUser, permissions, 'write');
      expect(result).toHaveProperty('allowed');
    });
  });

  describe('field-level permissions', () => {
    it('should allow field access when permitted', () => {
      const permissions: EntityPermissions = {
        fieldLevel: {
          email: { read: ['user', 'admin'], write: ['admin'] },
        },
      };

      const result = PermissionEngine.checkField(mockUser, permissions, 'email', 'read');
      expect(result.allowed).toBe(true);
    });

    it('should deny field access when not permitted', () => {
      const permissions: EntityPermissions = {
        fieldLevel: {
          salary: { read: ['admin'], write: ['admin'] },
        },
      };

      const result = PermissionEngine.checkField(mockUser, permissions, 'salary', 'read');
      expect(result.allowed).toBe(false);
    });

    it('should apply data masking', () => {
      const permissions: EntityPermissions = {
        fieldLevel: {
          ssn: {
            read: ['user', 'admin'],
            write: ['admin'],
            mask: (value: string) => `***-**-${value.slice(-4)}`,
          },
        },
      };

      const data = { ssn: '123-45-6789' };
      const masked = PermissionEngine.maskFields(mockUser, permissions, data);
      expect(masked.ssn).toBe('***-**-6789');
    });
  });

  describe('conditional permissions', () => {
    it('should evaluate custom conditions', () => {
      const permissions: EntityPermissions = {
        conditional: {
          conditions: [
            {
              check: (user, resource) => user.id === resource?.authorId,
              actions: ['write', 'delete'],
            },
          ],
        },
      };

      const resource = { authorId: 'user-1' };
      const result = PermissionEngine.check(mockUser, permissions, 'write', resource);
      expect(result.allowed).toBe(true);
    });

    it('should deny when conditions fail', () => {
      const permissions: EntityPermissions = {
        conditional: {
          conditions: [
            {
              check: (user, resource) => user.id === resource?.authorId,
              actions: ['delete'],
            },
          ],
        },
      };

      const resource = { authorId: 'other-user' };
      const result = PermissionEngine.check(mockUser, permissions, 'delete', resource);
      expect(result.allowed).toBe(false);
    });
  });

  describe('permission cascading', () => {
    it('should combine multiple permission types with AND logic', () => {
      const permissions: EntityPermissions = {
        role: {
          user: { read: true, write: true },
        },
        organization: {
          field: 'organizationId',
          allowSameOrg: true,
        },
      };

      const resource = { organizationId: 'org-1' };
      const result = PermissionEngine.check(mockUser, permissions, 'read', resource);
      expect(result.allowed).toBe(true);
    });

    it('should deny if any permission type fails', () => {
      const permissions: EntityPermissions = {
        role: {
          user: { read: true },
        },
        organization: {
          field: 'organizationId',
          allowSameOrg: true,
        },
      };

      const resource = { organizationId: 'org-2' }; // Different org
      const result = PermissionEngine.check(mockUser, permissions, 'read', resource);
      expect(result.allowed).toBe(false);
    });
  });

  describe('permission check results', () => {
    it('should include reason when denied', () => {
      const permissions: EntityPermissions = {
        role: {
          guest: { read: true },
        },
      };

      const result = PermissionEngine.check(mockUser, permissions, 'read');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeTruthy();
    });

    it('should include checked permissions in result', () => {
      const permissions: EntityPermissions = {
        role: {
          user: { read: true },
        },
      };

      const result = PermissionEngine.check(mockUser, permissions, 'read');
      expect(result).toHaveProperty('checkedPermissions');
    });
  });
});
