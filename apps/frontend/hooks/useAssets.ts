import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import assetService, { type AssetListParams } from '@/services/assetService';
import type { CreateAssetDto, UpdateAssetDto } from '@/types/asset';

export function useAssets(params: AssetListParams = {}) {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: () => assetService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ['assets', id],
    queryFn: () => assetService.get(id),
    enabled: !!id,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAssetDto) => assetService.create(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets'] }),
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAssetDto }) =>
      assetService.update(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets'] }),
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets'] }),
  });
}
