import axiosInstance from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { DashboardStats } from '@/types/organization';

const dashboardService = {
  stats(): Promise<ApiResponse<DashboardStats>> {
    return axiosInstance.get('/dashboard/stats');
  },
};

export default dashboardService;
