import axiosInstance from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { DashboardAnalytics, DashboardStats } from '@/types/organization';

const dashboardService = {
  stats(): Promise<ApiResponse<DashboardStats>> {
    return axiosInstance.get('/dashboard/stats');
  },
  analytics(): Promise<ApiResponse<DashboardAnalytics>> {
    return axiosInstance.get('/dashboard/analytics');
  },
};

export default dashboardService;
