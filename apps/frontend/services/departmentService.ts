import axiosInstance from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { Department, DepartmentDetail } from '@/types/organization';

export interface DepartmentPayload {
  code: string;
  name: string;
  description?: string;
  parentId?: number | null;
  headId?: number | null;
  isActive?: boolean;
}

const departmentService = {
  list(): Promise<ApiResponse<Department[]>> {
    return axiosInstance.get('/departments');
  },
  tree(): Promise<ApiResponse<Department[]>> {
    return axiosInstance.get('/departments/tree');
  },
  get(id: number): Promise<ApiResponse<DepartmentDetail>> {
    return axiosInstance.get(`/departments/${id}`);
  },
  create(payload: DepartmentPayload): Promise<ApiResponse<Department>> {
    return axiosInstance.post('/departments', payload);
  },
  update(
    id: number,
    payload: Partial<DepartmentPayload>,
  ): Promise<ApiResponse<Department>> {
    return axiosInstance.patch(`/departments/${id}`, payload);
  },
  remove(id: number): Promise<ApiResponse<Department>> {
    return axiosInstance.delete(`/departments/${id}`);
  },
};

export default departmentService;
