import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import maintenanceService, {
  type AssignTechnicianPayload,
  type CreateRequestPayload,
  type MaintenanceQuery,
  type RejectRequestPayload,
  type ResolveRequestPayload,
} from '@/services/maintenanceService';

export function useMaintenanceRequests(query: MaintenanceQuery = {}) {
  return useQuery({
    queryKey: ['maintenance', query],
    queryFn: async () => (await maintenanceService.list(query)).data,
    placeholderData: keepPreviousData,
  });
}

export function useMaintenanceMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['maintenance'] });
    qc.invalidateQueries({ queryKey: ['assets'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const create = useMutation({
    mutationFn: (payload: CreateRequestPayload) => maintenanceService.create(payload),
    onSuccess: invalidate,
  });
  const approve = useMutation({
    mutationFn: (id: number) => maintenanceService.approve(id),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RejectRequestPayload }) =>
      maintenanceService.reject(id, payload),
    onSuccess: invalidate,
  });
  const assign = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AssignTechnicianPayload }) =>
      maintenanceService.assign(id, payload),
    onSuccess: invalidate,
  });
  const start = useMutation({
    mutationFn: (id: number) => maintenanceService.start(id),
    onSuccess: invalidate,
  });
  const resolve = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ResolveRequestPayload }) =>
      maintenanceService.resolve(id, payload),
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: (id: number) => maintenanceService.cancel(id),
    onSuccess: invalidate,
  });

  return { create, approve, reject, assign, start, resolve, cancel };
}
