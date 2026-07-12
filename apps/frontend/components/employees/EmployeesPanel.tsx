'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Power,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useUsers, useUserMutations } from '@/hooks/useUsers';
import { useDepartments } from '@/hooks/useDepartments';
import { useDebounce } from '@/hooks/useDebounce';
import { EmployeeForm } from './EmployeeForm';
import { RoleAssignModal } from './RoleAssignModal';
import { Card } from '@/components/ui/Card';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingRows } from '@/components/common/Spinner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGate } from '@/components/common/PermissionGate';
import { getErrorMessage } from '@/lib/apiError';
import { Action, Resource, ROLE_NAMES, roleName } from '@/lib/permissions';
import type { User } from '@/types/auth';

const ROLE_BADGE: Record<number, BadgeVariant> = {
  1: 'danger',
  2: 'info',
  3: 'warning',
  4: 'neutral',
};

const roleFilterOptions = [
  { value: '', label: 'All roles' },
  ...Object.entries(ROLE_NAMES).map(([id, name]) => ({ value: id, label: name })),
];
const statusOptions = [
  { value: '', label: 'All status' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

export function EmployeesPanel() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 300);
  const { data: departments } = useDepartments();
  const { remove } = useUserMutations();

  const query = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      roleId: roleFilter ? Number(roleFilter) : undefined,
      departmentId: deptFilter ? Number(deptFilter) : undefined,
      isActive: statusFilter ? statusFilter === 'true' : undefined,
      page,
      limit: 8,
    }),
    [debouncedSearch, roleFilter, deptFilter, statusFilter, page],
  );

  const { data, isLoading, isFetching } = useUsers(query);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [toDeactivate, setToDeactivate] = useState<User | null>(null);

  const deptOptions = [
    { value: '', label: 'All departments' },
    ...(departments ?? []).map((d) => ({ value: String(d.id), label: `${d.code} — ${d.name}` })),
  ];

  const resetPageThen = (fn: () => void) => {
    setPage(1);
    fn();
  };

  const confirmDeactivate = async () => {
    if (!toDeactivate) return;
    try {
      await remove.mutateAsync(toDeactivate.id);
      toast.success(`${toDeactivate.firstName} deactivated`);
      setToDeactivate(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not deactivate'));
    }
  };

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Employee directory</h3>
          <p className="text-xs text-muted">
            The only place roles are assigned — promote employees here.
          </p>
        </div>
        <PermissionGate resource={Resource.EMPLOYEE_DIRECTORY} action={Action.CREATE}>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> New employee
          </Button>
        </PermissionGate>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => resetPageThen(() => setSearch(e.target.value))}
            placeholder="Search name or email…"
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <Select options={roleFilterOptions} value={roleFilter} onChange={(e) => resetPageThen(() => setRoleFilter(e.target.value))} />
        <Select options={deptOptions} value={deptFilter} onChange={(e) => resetPageThen(() => setDeptFilter(e.target.value))} />
        <Select options={statusOptions} value={statusFilter} onChange={(e) => resetPageThen(() => setStatusFilter(e.target.value))} />
      </div>

      <Card>
        {isLoading ? (
          <LoadingRows />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No employees match"
            description="Try clearing filters, or add a new employee."
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Employee</TH>
                  <TH>Role</TH>
                  <TH>Department</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((u) => (
                  <TR key={u.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted-bg text-xs font-semibold text-foreground">
                          {u.firstName[0]}
                          {u.lastName[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="truncate text-xs text-muted">{u.email}</p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <Badge variant={ROLE_BADGE[u.roleId] ?? 'neutral'}>
                        {roleName(u.roleId)}
                      </Badge>
                    </TD>
                    <TD className="text-muted">{u.department ? u.department.code : '—'}</TD>
                    <TD>
                      <Badge variant={u.isActive ? 'success' : 'neutral'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <PermissionGate resource={Resource.EMPLOYEE_DIRECTORY} action={Action.UPDATE}>
                          <button
                            type="button"
                            onClick={() => setRoleTarget(u)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                            title="Assign role"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            <span className="hidden sm:inline">Assign role</span>
                          </button>
                        </PermissionGate>
                        <PermissionGate resource={Resource.EMPLOYEE_DIRECTORY} action={Action.UPDATE}>
                          <button
                            type="button"
                            onClick={() => { setEditing(u); setFormOpen(true); }}
                            className="rounded-lg p-2 text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </PermissionGate>
                        {u.isActive && (
                          <PermissionGate resource={Resource.EMPLOYEE_DIRECTORY} action={Action.DELETE}>
                            <button
                              type="button"
                              onClick={() => setToDeactivate(u)}
                              className="rounded-lg p-2 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                              aria-label="Deactivate"
                            >
                              <Power className="h-4 w-4" />
                            </button>
                          </PermissionGate>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted">
              <span>
                {data?.total ?? 0} employee{(data?.total ?? 0) === 1 ? '' : 's'}
                {isFetching && ' · updating…'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-border p-1.5 transition-colors hover:bg-muted-bg disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="tabular-nums">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-border p-1.5 transition-colors hover:bg-muted-bg disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      <EmployeeForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
      <RoleAssignModal open={!!roleTarget} onClose={() => setRoleTarget(null)} user={roleTarget} />
      <ConfirmDialog
        open={!!toDeactivate}
        title="Deactivate employee"
        message={`Deactivate ${toDeactivate?.firstName} ${toDeactivate?.lastName}? They won't be able to sign in. The last active admin cannot be deactivated.`}
        confirmLabel="Deactivate"
        loading={remove.isPending}
        onConfirm={confirmDeactivate}
        onClose={() => setToDeactivate(null)}
      />
    </div>
  );
}

export default EmployeesPanel;
