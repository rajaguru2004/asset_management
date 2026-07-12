// AssetFlow RBAC — resources, actions, and the seeded role ids.
// Kept deliberately small: the whole permission model is a static matrix
// (see role-permissions.ts), so there is no DB table for pages/permissions.

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

// Role ids must match the RoleMaster rows created in prisma/seed.ts.
export const ADMIN = 1;
export const ASSET_MANAGER = 2;
export const DEPT_HEAD = 3;
export const EMPLOYEE = 4;

export const ROLE_NAMES: Record<number, string> = {
  [ADMIN]: 'Admin',
  [ASSET_MANAGER]: 'Asset Manager',
  [DEPT_HEAD]: 'Department Head',
  [EMPLOYEE]: 'Employee',
};
