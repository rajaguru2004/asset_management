import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import libraryService, { type LibraryItemPayload } from '@/services/libraryService';

export function useLibraryItems(libName?: string) {
  return useQuery({
    queryKey: ['libraries', libName ?? 'all'],
    queryFn: async () => (await libraryService.list(libName)).data,
  });
}

export function useLibraryMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['libraries'] });

  const create = useMutation({
    mutationFn: (payload: LibraryItemPayload) => libraryService.create(payload),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<Pick<LibraryItemPayload, 'data' | 'isActive'>>;
    }) => libraryService.update(id, payload),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number) => libraryService.remove(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
