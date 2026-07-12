'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { BookOpen, Pencil, Plus, Power } from 'lucide-react';
import { useLibraryItems, useLibraryMutations } from '@/hooks/useLibraries';
import { LibraryForm } from './LibraryForm';
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
import { cn } from '@/utils/cn';
import { LIBRARY_NAMES, type LibraryItem, type LibraryName } from '@/types/library';

export function LibraryTable() {
  const [active, setActive] = useState<LibraryName>(LIBRARY_NAMES[0]);
  const { data: items, isLoading } = useLibraryItems(active);
  const { remove } = useLibraryMutations();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const [toDeactivate, setToDeactivate] = useState<LibraryItem | null>(null);

  const confirmDeactivate = async () => {
    if (!toDeactivate) return;
    try {
      await remove.mutateAsync(toDeactivate.id);
      toast.success('Deactivated');
      setToDeactivate(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not deactivate'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {LIBRARY_NAMES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setActive(n)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                active === n ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-muted-bg hover:text-foreground',
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <PermissionGate resource={Resource.LIBRARIES} action={Action.CREATE}>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New item
          </Button>
        </PermissionGate>
      </div>

      <Card>
        {isLoading ? (
          <LoadingRows />
        ) : !items || items.length === 0 ? (
          <EmptyState icon={BookOpen} title="No items yet" description={`Add the first "${active}" entry.`} />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Key</TH>
                <TH>Label</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((item) => (
                <TR key={item.id}>
                  <TD>
                    <Badge variant="neutral" className="font-mono">
                      {item.dataId}
                    </Badge>
                  </TD>
                  <TD className="text-foreground">{(item.data.label as string) ?? '—'}</TD>
                  <TD>
                    <Badge variant={item.isActive ? 'success' : 'neutral'}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-1">
                      <PermissionGate resource={Resource.LIBRARIES} action={Action.UPDATE}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(item);
                            setFormOpen(true);
                          }}
                          className="rounded-lg p-2 text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </PermissionGate>
                      {item.isActive && (
                        <PermissionGate resource={Resource.LIBRARIES} action={Action.DELETE}>
                          <button
                            type="button"
                            onClick={() => setToDeactivate(item)}
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

      <LibraryForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} defaultLibName={active} />
      <ConfirmDialog
        open={!!toDeactivate}
        title="Deactivate library item"
        message={`Deactivate "${toDeactivate ? (toDeactivate.data.label as string) : ''}"? Blocked if still referenced by active assets.`}
        confirmLabel="Deactivate"
        loading={remove.isPending}
        onConfirm={confirmDeactivate}
        onClose={() => setToDeactivate(null)}
      />
    </div>
  );
}

export default LibraryTable;
