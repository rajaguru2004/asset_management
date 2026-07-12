import { useQuery } from '@tanstack/react-query';
import dashboardService from '@/services/dashboardService';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await dashboardService.stats()).data,
  });
}
