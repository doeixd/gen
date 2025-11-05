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
  role?: string // Single role for simple cases
  roles?: string[] // Multiple roles
  organizationId?: string
  attributes?: Record<string, any>
}

// Helper to get user roles array
function getUserRoles(user: User): string[] {
  if (user.roles) return user.roles
  if (user.role) return [user.role]
  return []
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
 * Entity-level permissions
 */
export interface EntityPermissions {
  // Role-based permissions (simple format for tests)
  role?: Record<string, {
    read?: boolean
    write?: boolean
    create?: boolean
    update?: boolean
    delete?: boolean
    admin?: boolean
  }>

  // Ownership permissions (simplified for tests)
  ownership?: {
    ownerField: string
    allowOwner?: string[]
  }

  // Organization permissions (simplified for tests)
  organization?: {
    field: string
    allowSameOrg?: boolean
  }

  // ABAC permissions
  abac?: {
    rules: Array<{
      attribute: string
      operator: 'equals' | 'in' | 'contains' | 'gt' | 'lt'
      value: any
      action: string[]
    }>
  }

  // Temporal permissions (extended)
  temporal?: {
    validFrom?: Date
    validUntil?: Date
    timeWindows?: Array<{
      start: Date | string
      end: Date | string
      actions: string[]
    }>
    schedule?: {
      daysOfWeek?: number[]
      hoursOfDay?: { start: number; end: number }
      actions?: string[]
      timezone?: string
    }
  }

  // Field-level permissions
  fieldLevel?: Record<string, {
    read?: string[]
    write?: string[]
    mask?: ((value: any) => any) | boolean
  }>

  // Conditional permissions
  conditional?: {
    conditions: Array<{
      check: (user: User, resource?: any) => boolean
      actions: string[]
    }>
  }

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
      fields: string[]
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

  // Include base PermissionConfig fields (for backwards compatibility)
  roles?: PermissionConfig['roles']
  attributes?: PermissionConfig['attributes']
  fieldPermissions?: PermissionConfig['fieldPermissions']
  conditions?: PermissionConfig['conditions']
  custom?: PermissionConfig['custom']
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
  missingRoles?: string[]
  failedConditions?: string[]
  checkedPermissions?: string[] // Which permission types were checked
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
        const userRoles = getUserRoles(user)
        const hasRole = requiredRoles.some(role => userRoles.includes(role))
        if (!hasRole) {
          return {
            allowed: false,
            reason: 'Insufficient role permissions',
            missingRoles: requiredRoles.filter(role => !userRoles.includes(role)),
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
        const userRoles = getUserRoles(user)
        const canAccessCrossOrg = permission.organization.crossOrgRoles?.some(role =>
          userRoles.includes(role)
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
          const userRoles = getUserRoles(user)
          const hasPermission = requiredRoles.some(role => userRoles.includes(role))
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

  /**
   * Synchronous permission check - wraps async checkPermission
   * For test compatibility and simple cases
   */
  static check(
    user: User,
    permissions: EntityPermissions,
    action: 'read' | 'write' | 'create' | 'update' | 'delete' | string,
    resource?: any
  ): PermissionCheckResult {
    const checkedPermissions: string[] = []

    // Handle role-based permissions
    if ((permissions as any).role) {
      checkedPermissions.push('role')
      const rolePerms = (permissions as any).role
      const userRole = user.role || (user.roles && user.roles[0])

      if (!userRole || !rolePerms[userRole]) {
        return {
          allowed: false,
          reason: `No permissions defined for role: ${userRole}`,
          checkedPermissions
        }
      }

      const hasPermission = rolePerms[userRole][action] === true
      if (!hasPermission) {
        return {
          allowed: false,
          reason: `Role ${userRole} does not have ${action} permission`,
          checkedPermissions
        }
      }
    }

    // Handle ownership-based permissions
    if (permissions.ownership && resource) {
      checkedPermissions.push('ownership')
      const ownerField = permissions.ownership.ownerField
      const ownerId = ownerField.includes('.')
        ? ownerField.split('.').reduce((obj, key) => obj?.[key], resource)
        : resource[ownerField]

      const allowedActions = permissions.ownership.allowOwner || []
      if (ownerId !== user.id || !allowedActions.includes(action)) {
        return {
          allowed: false,
          reason: 'User does not own this resource',
          checkedPermissions
        }
      }
    }

    // Handle organization-based permissions
    if (permissions.organization && resource) {
      checkedPermissions.push('organization')
      const orgField = permissions.organization.field
      const resourceOrgId = resource[orgField]

      if (permissions.organization.allowSameOrg && resourceOrgId !== user.organizationId) {
        return {
          allowed: false,
          reason: 'Resource belongs to different organization',
          checkedPermissions
        }
      }
    }

    // Handle ABAC
    if (permissions.abac && permissions.abac.rules) {
      checkedPermissions.push('abac')
      for (const rule of permissions.abac.rules) {
        if (!rule.action.includes(action)) continue

        const userValue = user.attributes?.[rule.attribute]
        let matches = false

        switch (rule.operator) {
          case 'equals':
            matches = userValue === rule.value
            break
          case 'in':
            matches = Array.isArray(rule.value) && rule.value.includes(userValue)
            break
          default:
            matches = false
        }

        if (!matches) {
          return {
            allowed: false,
            reason: `Attribute ${rule.attribute} does not match`,
            checkedPermissions
          }
        }
      }
    }

    // Handle temporal permissions
    if (permissions.temporal) {
      checkedPermissions.push('temporal')
      const now = new Date()

      if (permissions.temporal.timeWindows) {
        const inWindow = permissions.temporal.timeWindows.some(window => {
          const start = window.start instanceof Date ? window.start : new Date(window.start)
          const end = window.end instanceof Date ? window.end : new Date(window.end)
          return now >= start && now <= end && window.actions.includes(action)
        })
        if (!inWindow) {
          return {
            allowed: false,
            reason: 'Outside of allowed time window',
            checkedPermissions
          }
        }
      }

      if (permissions.temporal.schedule) {
        const schedule = permissions.temporal.schedule
        const dayOfWeek = now.getDay()
        const hour = now.getHours()

        if (schedule.daysOfWeek && !schedule.daysOfWeek.includes(dayOfWeek)) {
          return {
            allowed: false,
            reason: 'Not allowed on this day of week',
            checkedPermissions
          }
        }

        if (schedule.hoursOfDay) {
          const { start, end } = schedule.hoursOfDay
          if (hour < start || hour >= end) {
            return {
              allowed: false,
              reason: 'Not allowed at this time',
              checkedPermissions
            }
          }
        }

        if (schedule.actions && !schedule.actions.includes(action)) {
          return {
            allowed: false,
            reason: 'Action not allowed in schedule',
            checkedPermissions
          }
        }
      }
    }

    // Handle conditional permissions
    if (permissions.conditional) {
      checkedPermissions.push('conditional')
      for (const condition of permissions.conditional.conditions) {
        if (condition.check(user, resource) && condition.actions.includes(action)) {
          return { allowed: true, checkedPermissions }
        }
      }
      return {
        allowed: false,
        reason: 'No conditional permission matched',
        checkedPermissions
      }
    }

    // All checks passed
    return { allowed: true, checkedPermissions }
  }

  /**
   * Check field-level permissions
   */
  static checkField(
    user: User,
    permissions: EntityPermissions,
    field: string,
    action: 'read' | 'write'
  ): PermissionCheckResult {
    if (!permissions.fieldLevel) {
      return { allowed: true }
    }

    const fieldPerms = permissions.fieldLevel[field]
    if (!fieldPerms) {
      return { allowed: true }
    }

    const requiredRoles = fieldPerms[action]
    if (!requiredRoles) {
      return { allowed: true }
    }

    const userRole = user.role || (user.roles && user.roles[0])
    if (!userRole) {
      return { allowed: false, reason: 'User has no role' }
    }

    const hasPermission = requiredRoles.includes(userRole)
    return {
      allowed: hasPermission,
      reason: hasPermission ? undefined : `Role ${userRole} cannot ${action} field ${field}`,
    }
  }

  /**
   * Apply field-level masking to data
   */
  static maskFields(
    user: User,
    permissions: EntityPermissions,
    data: any
  ): any {
    if (!permissions.fieldLevel) {
      return data
    }

    const masked = { ...data }

    for (const [field, fieldPerms] of Object.entries(permissions.fieldLevel)) {
      if (fieldPerms.mask && data[field] !== undefined) {
        const value = data[field]
        masked[field] = typeof fieldPerms.mask === 'function'
          ? fieldPerms.mask(value)
          : value
      }
    }

    return masked
  }
}
