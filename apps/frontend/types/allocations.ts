// Module 5 (Allocation & Transfer) domain types.

export type AllocationStatus = 'ACTIVE' | 'RETURNED' | 'TRANSFER_PENDING';

export interface AllocationAssetRef {
  id: number;
  assetTag: string;
  name: string;
  status: string;
  categoryId: number;
}

export interface AllocationUserRef {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface AllocationDeptRef {
  id: number;
  code: string;
  name: string;
}

export interface Allocation {
  id: number;
  assetId: number;
  userId: number | null;
  departmentId: number | null;
  allocatedById: number;
  status: AllocationStatus;
  allocatedAt: string;
  expectedReturnDate: string | null;
  returnedAt: string | null;
  returnCondition: string | null;
  notes: string;
  asset: AllocationAssetRef;
  user: AllocationUserRef | null;
  department: AllocationDeptRef | null;
  allocatedBy: AllocationUserRef | null;
}
