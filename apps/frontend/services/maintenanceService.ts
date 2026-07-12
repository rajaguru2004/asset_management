import axiosInstance from '@/lib/axios';
import type { ApiResponse, Paginated } from '@/types/api';
import type { MaintenancePriority, MaintenanceRequest, MaintenanceRequestStatus } from '@/types/maintenance';

export interface CreateRequestPayload {
  assetId: number;
  issue: string;
  description?: string;
  priority?: MaintenancePriority;
}

export interface RejectRequestPayload {
  reason: string;
}

export interface AssignTechnicianPayload {
  technicianId: number;
}

export interface ResolveRequestPayload {
  resolutionNotes: string;
  cost?: number;
}

export interface MaintenanceQuery {
  assetId?: number;
  status?: MaintenanceRequestStatus;
  priority?: MaintenancePriority;
  page?: number;
  limit?: number;
}

const maintenanceService = {
  list(query: MaintenanceQuery = {}): Promise<ApiResponse<Paginated<MaintenanceRequest>>> {
    return axiosInstance.get('/maintenance', { params: query });
  },
  get(id: number): Promise<ApiResponse<MaintenanceRequest>> {
    return axiosInstance.get(`/maintenance/${id}`);
  },
  create(payload: CreateRequestPayload): Promise<ApiResponse<MaintenanceRequest>> {
    return axiosInstance.post('/maintenance', payload);
  },
  approve(id: number): Promise<ApiResponse<MaintenanceRequest>> {
    return axiosInstance.patch(`/maintenance/${id}/approve`);
  },
  reject(id: number, payload: RejectRequestPayload): Promise<ApiResponse<MaintenanceRequest>> {
    return axiosInstance.patch(`/maintenance/${id}/reject`, payload);
  },
  assign(id: number, payload: AssignTechnicianPayload): Promise<ApiResponse<MaintenanceRequest>> {
    return axiosInstance.patch(`/maintenance/${id}/assign`, payload);
  },
  start(id: number): Promise<ApiResponse<MaintenanceRequest>> {
    return axiosInstance.patch(`/maintenance/${id}/start`);
  },
  resolve(id: number, payload: ResolveRequestPayload): Promise<ApiResponse<MaintenanceRequest>> {
    return axiosInstance.patch(`/maintenance/${id}/resolve`, payload);
  },
  cancel(id: number): Promise<ApiResponse<MaintenanceRequest>> {
    return axiosInstance.patch(`/maintenance/${id}/cancel`);
  },
};

export default maintenanceService;
