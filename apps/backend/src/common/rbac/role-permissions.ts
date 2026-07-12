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
const ALL: A[] = [A.VIEW, A.CREATE, A.UPDATE, A.DELETE];

export const ROLE_PERMISSIONS: Record<number, Partial<Record<R, A[]>>> = {
  [ADMIN]: {
    [R.DEPARTMENTS]: [A.VIEW, A.CREATE, A.UPDATE, A.DELETE],
    [R.ASSET_CATEGORIES]: [A.VIEW, A.CREATE, A.UPDATE, A.DELETE],
    [R.EMPLOYEE_DIRECTORY]: [A.VIEW, A.CREATE, A.UPDATE, A.DELETE],
    [R.DASHBOARD]: [A.VIEW],
    // --- Module 4-7 ---
    [R.ASSETS]: ALL,
    [R.ALLOCATIONS]: ALL,
    [R.LIBRARIES]: ALL,
    [R.BOOKINGS]: ALL,
    [R.MAINTENANCE]: ALL,
  },
  [ASSET_MANAGER]: {
    [R.DEPARTMENTS]: [A.VIEW],
    [R.ASSET_CATEGORIES]: [A.VIEW, A.CREATE, A.UPDATE, A.DELETE],
    [R.EMPLOYEE_DIRECTORY]: [A.VIEW],
    [R.DASHBOARD]: [A.VIEW],
    // --- Module 4-7 ---
    [R.ASSETS]: ALL,
    [R.ALLOCATIONS]: ALL,
    [R.LIBRARIES]: [A.VIEW, A.CREATE],
    [R.BOOKINGS]: ALL, // manage/cancel any booking
    [R.MAINTENANCE]: ALL, // approve/assign/start/resolve = UPDATE
  },
  [DEPT_HEAD]: {
    [R.DEPARTMENTS]: [A.VIEW],
    [R.EMPLOYEE_DIRECTORY]: [A.VIEW],
    [R.DASHBOARD]: [A.VIEW],
    // --- Module 4-7 ---
    [R.ASSETS]: [A.VIEW],
    [R.ALLOCATIONS]: [A.VIEW, A.UPDATE], // approve transfers // TODO dept-scope
    [R.LIBRARIES]: [A.VIEW],
    [R.BOOKINGS]: [A.VIEW, A.CREATE, A.UPDATE], // book for the department, cancel own
    [R.MAINTENANCE]: [A.VIEW],
  },
  [EMPLOYEE]: {
    [R.DASHBOARD]: [A.VIEW],
    // --- Module 4-7 ---
    [R.BOOKINGS]: [A.VIEW, A.CREATE, A.UPDATE], // book/cancel/reschedule own (row-scoped in service)
    [R.MAINTENANCE]: [A.VIEW, A.CREATE], // raise + track own (row-scoped)
  },
};

export function hasPermission(
  roleId: number,
  resource: R,
  action: A,
): boolean {
  return ROLE_PERMISSIONS[roleId]?.[resource]?.includes(action) ?? false;
}
