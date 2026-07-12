import axiosInstance from '@/lib/axios';
import type { ApiResponse, Paginated } from '@/types/api';
import type { Asset, AssetCondition, AssetDetail, AssetStatus } from '@/types/assets';

export interface AssetPayload {
  name: string;
  categoryId?: number; // required on create, immutable/omitted on update
  serialNumber?: string;
  condition?: AssetCondition;
  location?: string;
  isShared?: boolean;
  acquisitionDate?: string;
  acquisitionCost?: number;
  photoUrl?: string;
  customValues?: Record<string, unknown>;
}

export interface AssetQuery {
  search?: string;
  categoryId?: number;
  status?: AssetStatus | '';
  condition?: AssetCondition | '';
  location?: string;
  isShared?: boolean;
  page?: number;
  limit?: number;
}

export interface AssetOption {
  id: number;
  assetTag: string;
  name: string;
  status: AssetStatus;
  isShared: boolean;
}

const assetService = {
  list(query: AssetQuery = {}): Promise<ApiResponse<Paginated<Asset>>> {
    return axiosInstance.get('/assets', { params: query });
  },
  options(isShared?: boolean): Promise<ApiResponse<AssetOption[]>> {
    return axiosInstance.get('/assets/options', {
      params: isShared === undefined ? {} : { isShared },
    });
  },
  get(id: number): Promise<ApiResponse<AssetDetail>> {
    return axiosInstance.get(`/assets/${id}`);
  },
  create(payload: AssetPayload): Promise<ApiResponse<Asset>> {
    return axiosInstance.post('/assets', payload);
  },
  update(id: number, payload: Partial<AssetPayload>): Promise<ApiResponse<Asset>> {
    return axiosInstance.patch(`/assets/${id}`, payload);
  },
  remove(id: number): Promise<ApiResponse<Asset>> {
    return axiosInstance.delete(`/assets/${id}`);
  },
};

export default assetService;
