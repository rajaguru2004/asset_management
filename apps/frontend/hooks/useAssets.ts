import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import assetService, { type AssetPayload, type AssetQuery } from '@/services/assetService';

export function useAssets(query: AssetQuery = {}) {
  return useQuery({
    queryKey: ['assets', query],
    queryFn: async () => (await assetService.list(query)).data,
    placeholderData: keepPreviousData,
  });
}

/** Minimal dropdown list — works for every authenticated role (no ASSETS permission needed). */
export function useAssetOptions(isShared?: boolean) {
  return useQuery({
    queryKey: ['assets', 'options', isShared ?? null],
    queryFn: async () => (await assetService.options(isShared)).data,
  });
}

export function useAsset(id: number | null) {
  return useQuery({
    queryKey: ['assets', 'detail', id],
    queryFn: async () => (await assetService.get(id as number)).data,
    enabled: id != null,
  });
}

export function useAssetMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['assets'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const create = useMutation({
    mutationFn: (payload: AssetPayload) => assetService.create(payload),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<AssetPayload> }) =>
      assetService.update(id, payload),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number) => assetService.remove(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
