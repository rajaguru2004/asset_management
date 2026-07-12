// AssetFlow RBAC — the single source of truth for who can do what.
//
// Static in-memory matrix keyed by roleId. No DB round-trip, no cache to
// invalidate: promotion takes effect on the user's next request because the
// JWT strategy re-reads their roleId from the DB every request.
//
// The frontend mirrors this exact matrix in lib/permissions.ts for UI gating.

import {
  Resource as R,
  Action as A,
  ADMIN,
  ASSET_MANAGER,
  DEPT_HEAD,
  EMPLOYEE,
} from './permissions.enum';

// roleId → resource → allowed actions
export const ROLE_PERMISSIONS: Record<number, Partial<Record<R, A[]>>> = {
  [ADMIN]: {
    [R.DEPARTMENTS]: [A.VIEW, A.CREATE, A.UPDATE, A.DELETE],
    [R.ASSET_CATEGORIES]: [A.VIEW, A.CREATE, A.UPDATE, A.DELETE],
    [R.EMPLOYEE_DIRECTORY]: [A.VIEW, A.CREATE, A.UPDATE, A.DELETE],
    [R.DASHBOARD]: [A.VIEW],
  },
  [ASSET_MANAGER]: {
    [R.DEPARTMENTS]: [A.VIEW],
    [R.ASSET_CATEGORIES]: [A.VIEW, A.CREATE, A.UPDATE, A.DELETE],
    [R.EMPLOYEE_DIRECTORY]: [A.VIEW],
    [R.DASHBOARD]: [A.VIEW],
  },
  [DEPT_HEAD]: {
    [R.DEPARTMENTS]: [A.VIEW],
    [R.EMPLOYEE_DIRECTORY]: [A.VIEW],
    [R.DASHBOARD]: [A.VIEW],
  },
  [EMPLOYEE]: {
    [R.DASHBOARD]: [A.VIEW],
  },
};

export function hasPermission(
  roleId: number,
  resource: R,
  action: A,
): boolean {
  return ROLE_PERMISSIONS[roleId]?.[resource]?.includes(action) ?? false;
}
