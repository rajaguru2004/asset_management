// Auth domain types.

export type Role = 'ADMIN' | 'MANAGER' | 'STAFF';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

/** `data` payload returned by POST /auth/login and /auth/register. */
export interface LoginResponse {
  user: User;
  accessToken: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role?: Role;
}
