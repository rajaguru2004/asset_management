// Module 4 (Asset Registry) domain types.

export type AssetCondition = 'GOOD' | 'FAIR' | 'DAMAGED' | 'UNDER_REPAIR';

export type AssetStatus =
  | 'AVAILABLE'
  | 'ALLOCATED'
  | 'RESERVED'
  | 'UNDER_MAINTENANCE'
  | 'LOST'
  | 'RETIRED'
  | 'DISPOSED';

export interface AssetCategoryRef {
  id: number;
  name: string;
}

export interface AssetHolder {
  id: number;
  userId: number | null;
  departmentId: number | null;
  allocatedAt: string;
  expectedReturnDate: string | null;
  user: { id: number; firstName: string; lastName: string } | null;
  department: { id: number; code: string; name: string } | null;
}

export interface AssetMaintenanceRef {
  id: number;
  issue: string;
  status: string;
  priority: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface Asset {
  id: number;
  assetTag: string;
  name: string;
  categoryId: number;
  serialNumber: string | null;
  condition: AssetCondition;
  location: string;
  status: AssetStatus;
  isShared: boolean;
  acquisitionDate: string | null;
  acquisitionCost: string | null;
  photoUrl: string | null;
  customValues: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: AssetCategoryRef;
}

export interface AssetDetail extends Asset {
  allocations: AssetHolder[];
  maintenance: AssetMaintenanceRef[];
}
