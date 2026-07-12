import { ConflictException } from '@nestjs/common';
import { MaintenanceRequestStatus as S } from '@prisma/client';
import { assertTransition } from './maintenance-state.machine';

describe('maintenance-state.machine', () => {
  it('allows the full happy path', () => {
    expect(() => assertTransition(S.PENDING, S.APPROVED)).not.toThrow();
    expect(() => assertTransition(S.APPROVED, S.TECHNICIAN_ASSIGNED)).not.toThrow();
    expect(() => assertTransition(S.TECHNICIAN_ASSIGNED, S.IN_PROGRESS)).not.toThrow();
    expect(() => assertTransition(S.IN_PROGRESS, S.RESOLVED)).not.toThrow();
  });

  it('allows reject and cancel from PENDING', () => {
    expect(() => assertTransition(S.PENDING, S.REJECTED)).not.toThrow();
    expect(() => assertTransition(S.PENDING, S.CANCELLED)).not.toThrow();
  });

  it('blocks skipping straight from PENDING to RESOLVED', () => {
    expect(() => assertTransition(S.PENDING, S.RESOLVED)).toThrow(ConflictException);
  });

  it('blocks any transition out of a terminal state', () => {
    expect(() => assertTransition(S.RESOLVED, S.PENDING)).toThrow(ConflictException);
    expect(() => assertTransition(S.REJECTED, S.APPROVED)).toThrow(ConflictException);
    expect(() => assertTransition(S.CANCELLED, S.APPROVED)).toThrow(ConflictException);
  });

  it('blocks assigning before approval', () => {
    expect(() => assertTransition(S.PENDING, S.TECHNICIAN_ASSIGNED)).toThrow(ConflictException);
  });
});
