'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Building2, Pencil, Plus, Power } from 'lucide-react';
import { useDepartments, useDepartmentMutations } from '@/hooks/useDepartments';
import { DepartmentForm } from './DepartmentForm';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingRows } from '@/components/common/Spinner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGate } from '@/components/common/PermissionGate';
import { getErrorMessage } from '@/lib/apiError';
import { Action, Resource } from '@/lib/permissions';
import type { Department } from '@/types/organization';

export function DepartmentsPanel() {
  const { data: departments, isLoading } = useDepartments();
  const { remove } = useDepartmentMutations();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [toDeactivate, setToDeactivate] = useState<Department | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (d: Department) => {
    setEditing(d);
    setFormOpen(true);
  };

  const confirmDeactivate = async () => {
    if (!toDeactivate) return;
    try {
      await remove.mutateAsync(toDeactivate.id);
      toast.success(`${toDeactivate.name} deactivated`);
      setToDeactivate(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not deactivate'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Departments</h3>
          <p className="text-xs text-muted">Org units, hierarchy and heads.</p>
        </div>
        <PermissionGate resource={Resource.DEPARTMENTS} action={Action.CREATE}>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New department
          </Button>
        </PermissionGate>
      </div>

      <Card>
        {isLoading ? (
          <LoadingRows />
        ) : !departments || departments.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No departments yet"
            description="Create your first department to start structuring the organization."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Code</TH>
                <TH>Name</TH>
                <TH>Parent</TH>
                <TH>Head</TH>
                <TH>Members</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {departments.map((d) => (
                <TR key={d.id}>
                  <TD>
                    <Badge variant="neutral" className="font-mono">{d.code}</Badge>
                  </TD>
                  <TD className="font-medium">{d.name}</TD>
                  <TD className="text-muted">{d.parent ? d.parent.code : '—'}</TD>
                  <TD className="text-muted">
                    {d.head ? `${d.head.firstName} ${d.head.lastName}` : '—'}
                  </TD>
                  <TD>{d._count.members}</TD>
                  <TD>
                    <Badge variant={d.isActive ? 'success' : 'neutral'}>
                      {d.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-1">
                      <PermissionGate resource={Resource.DEPARTMENTS} action={Action.UPDATE}>
                        <button
                          type="button"
                          onClick={() => openEdit(d)}
                          className="rounded-lg p-2 text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </PermissionGate>
                      {d.isActive && (
                        <PermissionGate resource={Resource.DEPARTMENTS} action={Action.DELETE}>
                          <button
                            type="button"
                            onClick={() => setToDeactivate(d)}
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
        )}
      </Card>

      <DepartmentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        departments={departments ?? []}
      />

      <ConfirmDialog
        open={!!toDeactivate}
        title="Deactivate department"
        message={`Deactivate "${toDeactivate?.name}"? This is blocked if it still has active members or sub-departments.`}
        confirmLabel="Deactivate"
        loading={remove.isPending}
        onConfirm={confirmDeactivate}
        onClose={() => setToDeactivate(null)}
      />
    </div>
  );
}

export default DepartmentsPanel;
