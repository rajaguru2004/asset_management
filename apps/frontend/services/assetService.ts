import axiosInstance from '@/lib/axios';
import type { ApiResponse, Paginated } from '@/types/api';
import type { Asset, CreateAssetDto, UpdateAssetDto } from '@/types/asset';

export interface AssetListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

const assetService = {
  async list(params: AssetListParams = {}): Promise<Paginated<Asset>> {
    const res: ApiResponse<Paginated<Asset>> = await axiosInstance.get('/assets', {
      params,
    });
    return res.data;
  },

  async get(id: string): Promise<Asset> {
    const res: ApiResponse<Asset> = await axiosInstance.get(`/assets/${id}`);
    return res.data;
  },

  async create(dto: CreateAssetDto): Promise<Asset> {
    const res: ApiResponse<Asset> = await axiosInstance.post('/assets', dto);
    return res.data;
  },

  async update(id: string, dto: UpdateAssetDto): Promise<Asset> {
    const res: ApiResponse<Asset> = await axiosInstance.patch(`/assets/${id}`, dto);
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await axiosInstance.delete(`/assets/${id}`);
  },
};

export default assetService;
