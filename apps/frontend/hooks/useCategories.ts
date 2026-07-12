import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import categoryService, {
  type CategoryPayload,
} from '@/services/categoryService';

const KEY = ['asset-categories'];

export function useCategories() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await categoryService.list()).data,
  });
}

export function useCategoryMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: KEY });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const create = useMutation({
    mutationFn: (payload: CategoryPayload) => categoryService.create(payload),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CategoryPayload> }) =>
      categoryService.update(id, payload),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number) => categoryService.remove(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
