// Organization Setup domain types.
import type { User } from './auth';

export interface DeptHeadRef {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  description: string;
  parentId: number | null;
  headId: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  head: DeptHeadRef | null;
  parent: { id: number; code: string; name: string } | null;
  _count: { members: number; children: number };
}

export interface DepartmentMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  role: { roleName: string };
}

export interface DepartmentDetail extends Department {
  children: { id: number; code: string; name: string; isActive: boolean }[];
  members: DepartmentMember[];
}

export type CustomFieldType = 'text' | 'number' | 'date' | 'boolean' | 'select';

export interface CustomField {
  key: string;
  label: string;
  type: CustomFieldType;
  required?: boolean;
  /** Module 4-7 library.config.ts libName this SELECT field draws options from */
  libraryName?: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  tagPrefix: string;
  customFields: CustomField[];
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalEmployees: number;
  totalDepartments: number;
  activeCategories: number;
  employeesByRole: Record<string, number>;
  recentlyAdded: User[];
  // --- Module 4-7 KPIs ---
  availableAssets: number;
  allocatedAssets: number;
  overdueReturns: number;
  pendingTransfers: number;
  activeBookings: number;
  bookingsToday: number;
  maintenanceToday: number;
  pendingMaintenance: number;
}

export interface DashboardAnalytics {
  /** Only statuses that actually have assets are present. */
  assetsByStatus: { status: string; count: number }[];
  categoryBreakdown: {
    categoryId: number;
    name: string;
    totalAssets: number;
    overdueReturns: number;
  }[];
}
