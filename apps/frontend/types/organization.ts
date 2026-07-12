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

export type CustomFieldType = 'text' | 'number' | 'date' | 'boolean';

export interface CustomField {
  key: string;
  label: string;
  type: CustomFieldType;
  required?: boolean;
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
}
