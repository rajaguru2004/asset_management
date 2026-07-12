import { useQuery } from '@tanstack/react-query';
import dashboardService from '@/services/dashboardService';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await dashboardService.stats()).data,
  });
}

export function useDashboardAnalytics() {
  return useQuery({
    queryKey: ['dashboard', 'analytics'],
    queryFn: async () => (await dashboardService.analytics()).data,
  });
}
