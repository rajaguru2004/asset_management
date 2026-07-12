import { ConflictException } from '@nestjs/common';
import { MaintenanceRequestStatus as S } from '@prisma/client';

// Single source of truth for legal maintenance transitions.
//
//   PENDING --approve--> APPROVED --assign--> TECHNICIAN_ASSIGNED --start--> IN_PROGRESS --resolve--> RESOLVED
//      |--reject--> REJECTED
//      |--cancel (requester only)--> CANCELLED
export const MAINTENANCE_TRANSITIONS: Record<S, S[]> = {
  [S.PENDING]: [S.APPROVED, S.REJECTED, S.CANCELLED],
  [S.APPROVED]: [S.TECHNICIAN_ASSIGNED],
  [S.TECHNICIAN_ASSIGNED]: [S.IN_PROGRESS],
  [S.IN_PROGRESS]: [S.RESOLVED],
  [S.RESOLVED]: [],
  [S.REJECTED]: [],
  [S.CANCELLED]: [],
};

export function assertTransition(current: S, next: S): void {
  const allowed = MAINTENANCE_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new ConflictException(`Cannot move a ${current} request to ${next}`);
  }
}
