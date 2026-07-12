'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Zap } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useUserMutations } from '@/hooks/useUsers';
import { getErrorMessage } from '@/lib/apiError';
import { ASSIGNABLE_ROLES, roleName } from '@/lib/permissions';
import type { User } from '@/types/auth';
import { cn } from '@/utils/cn';

export function RoleAssignModal({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
}) {
  const { assignRole } = useUserMutations();
  const [roleId, setRoleId] = useState<number>(user?.roleId ?? 4);

  useEffect(() => {
    if (user) setRoleId(user.roleId);
  }, [user]);

  const submit = async () => {
    if (!user) return;
    if (roleId === user.roleId) {
      onClose();
      return;
    }
    try {
      await assignRole.mutateAsync({ id: user.id, roleId });
      toast.success(
        `${user.firstName} is now ${roleName(roleId)} — effective on their next request, no re-login.`,
      );
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not change role'));
    }
  };

  if (!user) return null;

  return (
    <Modal open={open} onClose={onClose} title="Assign role" className="max-w-lg">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted-bg/50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {user.firstName[0]}
            {user.lastName[0]}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <Badge variant="default" className="ml-auto">
            Current: {roleName(user.roleId)}
          </Badge>
        </div>

        <div className="space-y-2">
          {ASSIGNABLE_ROLES.map((r) => (
            <label
              key={r.value}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                roleId === r.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted-bg/60',
              )}
            >
              <input
                type="radio"
                name="role"
                checked={roleId === r.value}
                onChange={() => setRoleId(r.value)}
                className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
              />
              <div>
                <p className="text-sm font-medium text-foreground">{r.label}</p>
                <p className="text-xs text-muted">{r.hint}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-info/10 p-3 text-xs text-info">
          <Zap className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Role changes take effect immediately — the guard reads the role from the database on
            every request, so there&apos;s no need to log out and back in.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose} disabled={assignRole.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} isLoading={assignRole.isPending}>
            Apply role
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default RoleAssignModal;
