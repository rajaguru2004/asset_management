import axiosInstance from '@/lib/axios';
import type { ApiResponse, Paginated } from '@/types/api';
import type { Allocation, AllocationStatus } from '@/types/allocations';

export interface AllocateRequest {
  assetId: number;
  userId?: number;
  departmentId?: number;
  expectedReturnDate?: string;
  notes?: string;
}

export interface ReturnRequest {
  returnCondition?: string;
  notes?: string;
}

export interface TransferRequestPayload {
  assetId: number;
  expectedReturnDate?: string;
  notes?: string;
}

export interface AllocationQuery {
  status?: AllocationStatus;
  assetId?: number;
  userId?: number;
  departmentId?: number;
  overdue?: boolean;
  page?: number;
  limit?: number;
}

const allocationService = {
  list(query: AllocationQuery = {}): Promise<ApiResponse<Paginated<Allocation>>> {
    return axiosInstance.get('/allocations', { params: query });
  },
  my(): Promise<ApiResponse<Allocation[]>> {
    return axiosInstance.get('/allocations/my');
  },
  overdue(): Promise<ApiResponse<Allocation[]>> {
    return axiosInstance.get('/allocations/overdue');
  },
  transfersPending(): Promise<ApiResponse<Allocation[]>> {
    return axiosInstance.get('/allocations/transfers/pending');
  },
  allocate(payload: AllocateRequest): Promise<ApiResponse<Allocation>> {
    return axiosInstance.post('/allocations', payload);
  },
  returnAsset(id: number, payload: ReturnRequest): Promise<ApiResponse<Allocation>> {
    return axiosInstance.post(`/allocations/${id}/return`, payload);
  },
  transferRequest(payload: TransferRequestPayload): Promise<ApiResponse<Allocation>> {
    return axiosInstance.post('/allocations/transfer-request', payload);
  },
  approveTransfer(id: number): Promise<ApiResponse<Allocation>> {
    return axiosInstance.patch(`/allocations/transfers/${id}/approve`);
  },
  rejectTransfer(id: number): Promise<ApiResponse<{ id: number }>> {
    return axiosInstance.patch(`/allocations/transfers/${id}/reject`);
  },
};

export default allocationService;
