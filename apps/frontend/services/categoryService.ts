import axiosInstance from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { Category, CustomField } from '@/types/organization';

export interface CategoryPayload {
  name: string;
  description?: string;
  tagPrefix?: string;
  customFields?: CustomField[];
  sortOrder?: number;
  isActive?: boolean;
}

const categoryService = {
  list(): Promise<ApiResponse<Category[]>> {
    return axiosInstance.get('/asset-categories');
  },
  get(id: number): Promise<ApiResponse<Category>> {
    return axiosInstance.get(`/asset-categories/${id}`);
  },
  create(payload: CategoryPayload): Promise<ApiResponse<Category>> {
    return axiosInstance.post('/asset-categories', payload);
  },
  update(
    id: number,
    payload: Partial<CategoryPayload>,
  ): Promise<ApiResponse<Category>> {
    return axiosInstance.patch(`/asset-categories/${id}`, payload);
  },
  remove(id: number): Promise<ApiResponse<Category>> {
    return axiosInstance.delete(`/asset-categories/${id}`);
  },
};

export default categoryService;
