import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import departmentService, {
  type DepartmentPayload,
} from '@/services/departmentService';

const KEY = ['departments'];

export function useDepartments() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await departmentService.list()).data,
  });
}

export function useDepartmentMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: KEY });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const create = useMutation({
    mutationFn: (payload: DepartmentPayload) => departmentService.create(payload),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<DepartmentPayload> }) =>
      departmentService.update(id, payload),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number) => departmentService.remove(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
