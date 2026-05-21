import { RolePresets } from './roles.js';
import { PermissionString } from './catalog.js';
import { PermissionKey } from './permission-key.js';

export class PolicyModel {
  static expandRoles(roles: string[]): Set<PermissionString> {
    const permissions = new Set<PermissionString>();
    for (const role of roles) {
      const rolePermissions = RolePresets[role];
      if (rolePermissions) {
        rolePermissions.forEach(p => permissions.add(p));
      }
    }
    return permissions;
  }

  static hasPermission(roles: string[], permission: string): boolean {
    if (!PermissionKey.isValid(permission)) {
      return false; // Invalid format denies by default
    }
    
    const grantedPermissions = this.expandRoles(roles);
    return grantedPermissions.has(permission as PermissionString); // Default deny if not in set
  }

  static hasAnyPermission(roles: string[], permissions: string[]): boolean {
    return permissions.some(p => this.hasPermission(roles, p));
  }

  static hasAllPermissions(roles: string[], permissions: string[]): boolean {
    return permissions.every(p => this.hasPermission(roles, p));
  }
}
