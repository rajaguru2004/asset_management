// Auth domain types (AssetFlow — Int ids, RoleMaster-backed roles).

export interface RoleRef {
  id: number;
  roleName: string;
}

export interface DeptRef {
  id: number;
  code: string;
  name: string;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  roleId: number;
  departmentId: number | null;
  isActive: boolean;
  role: RoleRef;
  department: DeptRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

/** `data` payload of POST /auth/login and /auth/register. */
export interface AuthResponse {
  user: User;
  accessToken: string;
}
