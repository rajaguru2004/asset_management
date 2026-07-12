'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Layers, Pencil, Plus, Power } from 'lucide-react';
import { useCategories, useCategoryMutations } from '@/hooks/useCategories';
import { CategoryForm } from './CategoryForm';
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
import type { Category } from '@/types/organization';

export function CategoriesPanel() {
  const { data: categories, isLoading } = useCategories();
  const { remove } = useCategoryMutations();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [toDeactivate, setToDeactivate] = useState<Category | null>(null);

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
          <h3 className="text-sm font-semibold text-foreground">Asset categories</h3>
          <p className="text-xs text-muted">Categories and their custom-field schemas.</p>
        </div>
        <PermissionGate resource={Resource.ASSET_CATEGORIES} action={Action.CREATE}>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> New category
          </Button>
        </PermissionGate>
      </div>

      <Card>
        {isLoading ? (
          <LoadingRows />
        ) : !categories || categories.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No categories yet"
            description="Add categories like Electronics or Vehicles, each with its own custom fields."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Tag</TH>
                <TH>Custom fields</TH>
                <TH>Sort</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {categories.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <div className="font-medium">{c.name}</div>
                    {c.description && (
                      <div className="text-xs text-muted">{c.description}</div>
                    )}
                  </TD>
                  <TD>
                    <Badge variant="neutral" className="font-mono">{c.tagPrefix}</Badge>
                  </TD>
                  <TD>
                    {c.customFields.length === 0 ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {c.customFields.slice(0, 3).map((f) => (
                          <Badge key={f.key} variant="info">
                            {f.label}
                            {f.required && <span className="ml-0.5 text-danger">*</span>}
                          </Badge>
                        ))}
                        {c.customFields.length > 3 && (
                          <Badge variant="neutral">+{c.customFields.length - 3}</Badge>
                        )}
                      </div>
                    )}
                  </TD>
                  <TD className="text-muted">{c.sortOrder}</TD>
                  <TD>
                    <Badge variant={c.isActive ? 'success' : 'neutral'}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-1">
                      <PermissionGate resource={Resource.ASSET_CATEGORIES} action={Action.UPDATE}>
                        <button
                          type="button"
                          onClick={() => { setEditing(c); setFormOpen(true); }}
                          className="rounded-lg p-2 text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </PermissionGate>
                      {c.isActive && (
                        <PermissionGate resource={Resource.ASSET_CATEGORIES} action={Action.DELETE}>
                          <button
                            type="button"
                            onClick={() => setToDeactivate(c)}
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

      <CategoryForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />

      <ConfirmDialog
        open={!!toDeactivate}
        title="Deactivate category"
        message={`Deactivate "${toDeactivate?.name}"? Its custom-field schema is preserved and it can be reactivated later.`}
        confirmLabel="Deactivate"
        loading={remove.isPending}
        onConfirm={confirmDeactivate}
        onClose={() => setToDeactivate(null)}
      />
    </div>
  );
}

export default CategoriesPanel;
