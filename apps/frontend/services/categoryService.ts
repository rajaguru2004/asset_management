import axiosInstance from '@/lib/axios';
import type { ApiResponse, Paginated } from '@/types/api';
import type {
  Category,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '@/types/asset';

export interface CategoryListParams {
  page?: number;
  limit?: number;
  search?: string;
}

const categoryService = {
  async list(params: CategoryListParams = {}): Promise<Paginated<Category>> {
    const res: ApiResponse<Paginated<Category>> = await axiosInstance.get(
      '/categories',
      { params }
    );
    return res.data;
  },

  async get(id: string): Promise<Category> {
    const res: ApiResponse<Category> = await axiosInstance.get(`/categories/${id}`);
    return res.data;
  },

  async create(dto: CreateCategoryDto): Promise<Category> {
    const res: ApiResponse<Category> = await axiosInstance.post('/categories', dto);
    return res.data;
  },

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const res: ApiResponse<Category> = await axiosInstance.patch(
      `/categories/${id}`,
      dto
    );
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await axiosInstance.delete(`/categories/${id}`);
  },
};

export default categoryService;
