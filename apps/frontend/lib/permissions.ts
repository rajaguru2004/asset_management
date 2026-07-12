/**
 * Client-side mirror of the backend RBAC matrix
 * (apps/backend/src/common/rbac/role-permissions.ts).
 *
 * Used ONLY for UI gating (hiding nav items / buttons the user can't use).
 * The server is always the source of truth — every mutation is re-checked by
 * PermissionsGuard, so a tampered client can never actually escalate.
 */

export enum Resource {
  DEPARTMENTS = 'DEPARTMENTS',
  ASSET_CATEGORIES = 'ASSET_CATEGORIES',
  EMPLOYEE_DIRECTORY = 'EMPLOYEE_DIRECTORY',
  DASHBOARD = 'DASHBOARD',
}

export enum Action {
  VIEW = 'VIEW',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export const ROLE = {
  ADMIN: 1,
  ASSET_MANAGER: 2,
  DEPT_HEAD: 3,
  EMPLOYEE: 4,
} as const;

export const ROLE_NAMES: Record<number, string> = {
  [ROLE.ADMIN]: 'Admin',
  [ROLE.ASSET_MANAGER]: 'Asset Manager',
  [ROLE.DEPT_HEAD]: 'Department Head',
  [ROLE.EMPLOYEE]: 'Employee',
};

/** Roles an Admin can assign from the Employee Directory. */
export const ASSIGNABLE_ROLES: { value: number; label: string; hint: string }[] = [
  { value: ROLE.EMPLOYEE, label: 'Employee', hint: 'Default. Views own assets, books resources.' },
  { value: ROLE.DEPT_HEAD, label: 'Department Head', hint: 'Approves within their department.' },
  { value: ROLE.ASSET_MANAGER, label: 'Asset Manager', hint: 'Registers & allocates assets.' },
  { value: ROLE.ADMIN, label: 'Admin', hint: 'Full organization setup + analytics.' },
];

const ROLE_PERMISSIONS: Record<number, Partial<Record<Resource, Action[]>>> = {
  [ROLE.ADMIN]: {
    [Resource.DEPARTMENTS]: [Action.VIEW, Action.CREATE, Action.UPDATE, Action.DELETE],
    [Resource.ASSET_CATEGORIES]: [Action.VIEW, Action.CREATE, Action.UPDATE, Action.DELETE],
    [Resource.EMPLOYEE_DIRECTORY]: [Action.VIEW, Action.CREATE, Action.UPDATE, Action.DELETE],
    [Resource.DASHBOARD]: [Action.VIEW],
  },
  [ROLE.ASSET_MANAGER]: {
    [Resource.DEPARTMENTS]: [Action.VIEW],
    [Resource.ASSET_CATEGORIES]: [Action.VIEW, Action.CREATE, Action.UPDATE, Action.DELETE],
    [Resource.EMPLOYEE_DIRECTORY]: [Action.VIEW],
    [Resource.DASHBOARD]: [Action.VIEW],
  },
  [ROLE.DEPT_HEAD]: {
    [Resource.DEPARTMENTS]: [Action.VIEW],
    [Resource.EMPLOYEE_DIRECTORY]: [Action.VIEW],
    [Resource.DASHBOARD]: [Action.VIEW],
  },
  [ROLE.EMPLOYEE]: {
    [Resource.DASHBOARD]: [Action.VIEW],
  },
};

export function hasPermission(
  roleId: number | undefined | null,
  resource: Resource,
  action: Action,
): boolean {
  if (roleId == null) return false;
  return ROLE_PERMISSIONS[roleId]?.[resource]?.includes(action) ?? false;
}

export function roleName(roleId: number | undefined | null): string {
  return roleId != null ? (ROLE_NAMES[roleId] ?? 'Unknown') : 'Unknown';
}
