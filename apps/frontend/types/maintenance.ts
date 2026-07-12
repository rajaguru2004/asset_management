// Module 7 (Maintenance) domain types.

export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type MaintenanceRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'TECHNICIAN_ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CANCELLED';

export interface MaintenanceAssetRef {
  id: number;
  assetTag: string;
  name: string;
  status: string;
}

export interface MaintenanceUserRef {
  id: number;
  firstName: string;
  lastName: string;
  departmentId?: number | null;
}

export interface MaintenanceRequest {
  id: number;
  assetId: number;
  requestedById: number;
  issue: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceRequestStatus;
  approvedById: number | null;
  technicianId: number | null;
  rejectReason: string;
  resolutionNotes: string;
  cost: string | null;
  prevAssetStatus: string | null;
  approvedAt: string | null;
  assignedAt: string | null;
  startedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  asset: MaintenanceAssetRef;
  requestedBy: MaintenanceUserRef;
  approvedBy: MaintenanceUserRef | null;
  technician: MaintenanceUserRef | null;
}
