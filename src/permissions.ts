/**
 * Comprehensive Permission System
 * Multi-level access control: role-based, ownership-based, organization-based,
 * attribute-based, temporal, field-level, and conditional permissions
 */

/**
 * User information for permission checks
 */
export interface User {
  id: string
  roles: string[]
  organizationId?: string
  attributes?: Record<string, any>
}

/**
 * Basic permission configuration
 */
export interface PermissionConfig {
  // Role-based permissions
  roles?: {
    read?: string[]
    write?: string[]
    create?: string[]
    update?: string[]
    delete?: string[]
    admin?: string[]
  }

  // Ownership-based permissions
  ownership?: {
    required: boolean
    ownerField: string // Field that contains owner ID (e.g., 'userId', 'createdBy')
    allowTransfer?: boolean
    transferRequiresApproval?: boolean
    transferApprovers?: string[] // Roles that can approve transfer
  }

  // Organization-based permissions
  organization?: {
    required: boolean
    orgField: string // Field that contains organization ID
    allowCrossOrg?: boolean
    crossOrgRoles?: string[] // Roles that can access cross-org
  }

  // Attribute-based access control (ABAC)
  attributes?: Array<{
    name: string
    operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'neq' | 'in' | 'nin' | 'custom'
    value: any
    customCheck?: (user: User, resource: any) => boolean
  }>

  // Time-based permissions
  temporal?: {
    validFrom?: Date
    validUntil?: Date
    schedule?: {
      daysOfWeek?: number[] // 0-6 (Sunday-Saturday)
      hoursOfDay?: [number, number] // [start, end] in 24-hour format
      timezone?: string
    }
  }

  // Field-level (cell-level) permissions
  fieldPermissions?: {
    [fieldName: string]: {
      read?: string[]
      write?: string[]
      mask?: boolean // Mask sensitive data
      maskFn?: (value: any) => any // Custom masking function
      maskChar?: string // Character to use for masking (default: '*')
    }
  }

  // Conditional permissions
  conditions?: Array<{
    when: (user: User, resource: any, context: any) => boolean
    then: Partial<PermissionConfig>
    else?: Partial<PermissionConfig>
  }>

  // Custom permission check
  custom?: (user: User, resource: any, action: string, context: any) => Promise<boolean> | boolean
}

/**
 * Entity-level permissions (extends base PermissionConfig)
 */
export interface EntityPermissions extends PermissionConfig {
  // Route-level permissions
  routes?: {
    list?: PermissionConfig
    detail?: PermissionConfig
    create?: PermissionConfig
    edit?: PermissionConfig
    delete?: PermissionConfig
    custom?: Record<string, PermissionConfig>
  }

  // Form-level permissions
  forms?: {
    create?: {
      fields: string[] // Which fields are visible
      permissions: PermissionConfig
    }
    edit?: {
      fields: string[]
      permissions: PermissionConfig
    }
    custom?: Record<string, {
      fields: string[]
      permissions: PermissionConfig
    }>
  }

  // API-level permissions
  api?: {
    endpoints: Record<string, PermissionConfig>
  }
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
  missingRoles?: string[]
  failedConditions?: string[]
}

/**
 * Route permission configuration
 */
export interface RoutePermissionConfig {
  list?: PermissionConfig
  create?: PermissionConfig
  read?: PermissionConfig
  update?: PermissionConfig
  delete?: PermissionConfig
}

/**
 * Permission Engine - Check all permission types
 */
export class PermissionEngine {
  /**
   * Check if user has permission
   */
  static async checkPermission(
    user: User,
    permission: PermissionConfig,
    action: 'read' | 'write' | 'create' | 'update' | 'delete',
    resource?: any,
    context?: any
  ): Promise<PermissionCheckResult> {
    // Check role-based permissions
    if (permission.roles) {
      const requiredRoles = permission.roles[action]
      if (requiredRoles && requiredRoles.length > 0) {
        const hasRole = requiredRoles.some(role => user.roles.includes(role))
        if (!hasRole) {
          return {
            allowed: false,
            reason: 'Insufficient role permissions',
            missingRoles: requiredRoles.filter(role => !user.roles.includes(role)),
          }
        }
      }
    }

    // Check ownership
    if (permission.ownership?.required && resource) {
      const ownerId = resource[permission.ownership.ownerField]
      if (ownerId !== user.id) {
        return {
          allowed: false,
          reason: 'User is not the owner of this resource',
        }
      }
    }

    // Check organization
    if (permission.organization?.required && resource) {
      const resourceOrgId = resource[permission.organization.orgField]
      if (resourceOrgId !== user.organizationId) {
        const canAccessCrossOrg = permission.organization.crossOrgRoles?.some(role =>
          user.roles.includes(role)
        )
        if (!canAccessCrossOrg) {
          return {
            allowed: false,
            reason: 'Resource belongs to different organization',
          }
        }
      }
    }

    // Check attributes
    if (permission.attributes && resource) {
      for (const attr of permission.attributes) {
        const userAttrValue = user.attributes?.[attr.name]
        const resourceAttrValue = resource[attr.name]

         let matches = false
         switch (attr.operator) {
           case 'equals':
             matches = userAttrValue === resourceAttrValue
             break
           case 'contains':
             matches = Array.isArray(resourceAttrValue) && resourceAttrValue.includes(userAttrValue)
             break
           case 'gt':
             matches = userAttrValue > resourceAttrValue
             break
           case 'lt':
             matches = userAttrValue < resourceAttrValue
             break
           case 'gte':
             matches = userAttrValue >= resourceAttrValue
             break
           case 'lte':
             matches = userAttrValue <= resourceAttrValue
             break
           case 'neq':
             matches = userAttrValue !== resourceAttrValue
             break
           case 'in':
             matches = Array.isArray(resourceAttrValue) && resourceAttrValue.includes(userAttrValue)
             break
           case 'nin':
             matches = Array.isArray(resourceAttrValue) && !resourceAttrValue.includes(userAttrValue)
             break
           default:
             matches = false
         }

        if (!matches) {
          return {
            allowed: false,
            reason: `Attribute check failed: ${attr.name}`,
          }
        }
      }
    }

    // Check temporal
    if (permission.temporal) {
      const now = new Date()

      if (permission.temporal.validFrom && now < permission.temporal.validFrom) {
        return {
          allowed: false,
          reason: 'Permission not yet valid',
        }
      }

      if (permission.temporal.validUntil && now > permission.temporal.validUntil) {
        return {
          allowed: false,
          reason: 'Permission expired',
        }
      }

      if (permission.temporal.schedule) {
        const dayOfWeek = now.getDay()
        const hour = now.getHours()

        if (permission.temporal.schedule.daysOfWeek &&
            !permission.temporal.schedule.daysOfWeek.includes(dayOfWeek)) {
          return {
            allowed: false,
            reason: 'Access not allowed on this day',
          }
        }

        if (permission.temporal.schedule.hoursOfDay) {
          const [startHour, endHour] = permission.temporal.schedule.hoursOfDay
          if (hour < startHour || hour >= endHour) {
            return {
              allowed: false,
              reason: 'Access not allowed at this time',
            }
          }
        }
      }
    }

    // Check custom permission function
    if (permission.custom) {
      const customResult = await permission.custom(user, resource, action, context)
      if (!customResult) {
        return {
          allowed: false,
          reason: 'Custom permission check failed',
        }
      }
    }

    // Check conditions
    if (permission.conditions) {
      for (const condition of permission.conditions) {
        if (condition.when(user, resource, context)) {
          if (condition.then) {
            return this.checkPermission(user, condition.then, action, resource, context)
          }
        } else if (condition.else) {
          return this.checkPermission(user, condition.else, action, resource, context)
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Filter fields based on field-level permissions
   */
  static async filterFields<T extends Record<string, any>>(
    user: User,
    entity: { fields: Record<string, { permissions?: PermissionConfig }> },
    data: T,
    action: 'read' | 'write'
  ): Promise<Partial<T>> {
    const filtered: any = {}

    for (const [fieldName, fieldValue] of Object.entries(data)) {
      const fieldConfig = entity.fields[fieldName]
      const fieldPermissions = fieldConfig?.permissions?.fieldPermissions?.[fieldName]

      if (fieldPermissions) {
        const requiredRoles = fieldPermissions[action]
        if (requiredRoles && requiredRoles.length > 0) {
          const hasPermission = requiredRoles.some(role => user.roles.includes(role))
          if (!hasPermission) {
            continue // Skip this field
          }
        }

        // Apply masking for read operations
        if (action === 'read' && fieldPermissions.mask) {
          if (fieldPermissions.maskFn) {
            filtered[fieldName] = fieldPermissions.maskFn(fieldValue)
          } else {
            const maskChar = fieldPermissions.maskChar || '*'
            filtered[fieldName] = typeof fieldValue === 'string'
              ? maskChar.repeat(fieldValue.length)
              : maskChar.repeat(8)
          }
          continue
        }
      }

      filtered[fieldName] = fieldValue
    }

    return filtered
  }

  /**
   * Check if user can access a route
   */
  static async canAccessRoute(
    user: User,
    routePermissions?: PermissionConfig,
    resource?: any
  ): Promise<PermissionCheckResult> {
    if (!routePermissions) {
      return { allowed: true }
    }

    return this.checkPermission(user, routePermissions, 'read', resource)
  }
}
