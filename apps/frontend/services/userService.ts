import axiosInstance from '@/lib/axios';
import type { ApiResponse, Paginated } from '@/types/api';
import type { User } from '@/types/auth';

export interface UserQuery {
  search?: string;
  roleId?: number;
  departmentId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: number;
  departmentId?: number | null;
  isActive?: boolean;
}

export type UpdateUserPayload = Partial<{
  firstName: string;
  lastName: string;
  phone: string;
  departmentId: number | null;
  isActive: boolean;
}>;

const userService = {
  list(query: UserQuery = {}): Promise<ApiResponse<Paginated<User>>> {
    return axiosInstance.get('/users', { params: query });
  },
  get(id: number): Promise<ApiResponse<User>> {
    return axiosInstance.get(`/users/${id}`);
  },
  create(payload: CreateUserPayload): Promise<ApiResponse<User>> {
    return axiosInstance.post('/users', payload);
  },
  update(id: number, payload: UpdateUserPayload): Promise<ApiResponse<User>> {
    return axiosInstance.patch(`/users/${id}`, payload);
  },
  assignRole(id: number, roleId: number): Promise<ApiResponse<User>> {
    return axiosInstance.patch(`/users/${id}/role`, { roleId });
  },
  remove(id: number): Promise<ApiResponse<User>> {
    return axiosInstance.delete(`/users/${id}`);
  },
};

export default userService;
