import axiosInstance from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { LibraryItem } from '@/types/library';

export interface LibraryItemPayload {
  libName: string;
  dataId: string;
  data: Record<string, unknown>;
  isActive?: boolean;
}

const libraryService = {
  list(libName?: string): Promise<ApiResponse<LibraryItem[]>> {
    return axiosInstance.get('/libraries', { params: libName ? { libName } : {} });
  },
  create(payload: LibraryItemPayload): Promise<ApiResponse<LibraryItem>> {
    return axiosInstance.post('/libraries', payload);
  },
  update(
    id: number,
    payload: Partial<Pick<LibraryItemPayload, 'data' | 'isActive'>>,
  ): Promise<ApiResponse<LibraryItem>> {
    return axiosInstance.patch(`/libraries/${id}`, payload);
  },
  remove(id: number): Promise<ApiResponse<LibraryItem>> {
    return axiosInstance.delete(`/libraries/${id}`);
  },
};

export default libraryService;
