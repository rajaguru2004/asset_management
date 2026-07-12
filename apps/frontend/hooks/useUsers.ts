import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import userService, {
  type CreateUserPayload,
  type UpdateUserPayload,
  type UserQuery,
} from '@/services/userService';

export function useUsers(query: UserQuery = {}) {
  return useQuery({
    queryKey: ['users', query],
    queryFn: async () => (await userService.list(query)).data,
    placeholderData: keepPreviousData,
  });
}

export function useUserMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['users'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['departments'] });
  };

  const create = useMutation({
    mutationFn: (payload: CreateUserPayload) => userService.create(payload),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateUserPayload }) =>
      userService.update(id, payload),
    onSuccess: invalidate,
  });
  const assignRole = useMutation({
    mutationFn: ({ id, roleId }: { id: number; roleId: number }) =>
      userService.assignRole(id, roleId),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number) => userService.remove(id),
    onSuccess: invalidate,
  });

  return { create, update, assignRole, remove };
}
