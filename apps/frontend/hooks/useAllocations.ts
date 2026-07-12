import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import allocationService, {
  type AllocateRequest,
  type AllocationQuery,
  type ReturnRequest,
  type TransferRequestPayload,
} from '@/services/allocationService';

export function useAllocations(query: AllocationQuery = {}) {
  return useQuery({
    queryKey: ['allocations', query],
    queryFn: async () => (await allocationService.list(query)).data,
    placeholderData: keepPreviousData,
  });
}

export function useMyAllocations() {
  return useQuery({
    queryKey: ['allocations', 'my'],
    queryFn: async () => (await allocationService.my()).data,
  });
}

export function useOverdueAllocations() {
  return useQuery({
    queryKey: ['allocations', 'overdue'],
    queryFn: async () => (await allocationService.overdue()).data,
  });
}

export function usePendingTransfers() {
  return useQuery({
    queryKey: ['allocations', 'transfers-pending'],
    queryFn: async () => (await allocationService.transfersPending()).data,
  });
}

export function useAllocationMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['allocations'] });
    qc.invalidateQueries({ queryKey: ['assets'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const allocate = useMutation({
    mutationFn: (payload: AllocateRequest) => allocationService.allocate(payload),
    onSuccess: invalidate,
  });
  const returnAsset = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ReturnRequest }) =>
      allocationService.returnAsset(id, payload),
    onSuccess: invalidate,
  });
  const transferRequest = useMutation({
    mutationFn: (payload: TransferRequestPayload) => allocationService.transferRequest(payload),
    onSuccess: invalidate,
  });
  const approveTransfer = useMutation({
    mutationFn: (id: number) => allocationService.approveTransfer(id),
    onSuccess: invalidate,
  });
  const rejectTransfer = useMutation({
    mutationFn: (id: number) => allocationService.rejectTransfer(id),
    onSuccess: invalidate,
  });

  return { allocate, returnAsset, transferRequest, approveTransfer, rejectTransfer };
}
