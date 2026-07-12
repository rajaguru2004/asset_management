'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeftRight, Boxes, ChevronLeft, ChevronRight, Pencil, Plus, Power, Search } from 'lucide-react';
import { useAssets, useAssetMutations } from '@/hooks/useAssets';
import { useCategories } from '@/hooks/useCategories';
import { useDebounce } from '@/hooks/useDebounce';
import { AssetForm } from './AssetForm';
import { AssetDetailDrawer } from './AssetDetailDrawer';
import { AllocateModal } from './AllocateModal';
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
import { Action, Resource } from '@/lib/permissions';
import type { Asset, AssetStatus } from '@/types/assets';

const STATUS_BADGE: Record<string, BadgeVariant> = {
  AVAILABLE: 'success',
  ALLOCATED: 'info',
  RESERVED: 'warning',
  UNDER_MAINTENANCE: 'warning',
  LOST: 'danger',
  RETIRED: 'neutral',
  DISPOSED: 'neutral',
};

const STATUS_OPTIONS: { value: AssetStatus | ''; label: string }[] = [
  { value: '', label: 'All status' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'ALLOCATED', label: 'Allocated' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
  { value: 'LOST', label: 'Lost' },
  { value: 'RETIRED', label: 'Retired' },
  { value: 'DISPOSED', label: 'Disposed' },
];

export function AssetTable() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | ''>('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 300);
  const { data: categories } = useCategories();
  const { remove } = useAssetMutations();

  const query = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      categoryId: categoryFilter ? Number(categoryFilter) : undefined,
      status: statusFilter || undefined,
      page,
      limit: 8,
    }),
    [debouncedSearch, categoryFilter, statusFilter, page],
  );

  const { data, isLoading, isFetching } = useAssets(query);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [toRetire, setToRetire] = useState<Asset | null>(null);
  const [allocating, setAllocating] = useState<Asset | null>(null);

  const categoryOptions = [
    { value: '', label: 'All categories' },
    ...(categories ?? []).map((c) => ({ value: String(c.id), label: c.name })),
  ];

  const resetPageThen = (fn: () => void) => {
    setPage(1);
    fn();
  };

  const confirmRetire = async () => {
    if (!toRetire) return;
    try {
      await remove.mutateAsync(toRetire.id);
      toast.success(`${toRetire.name} retired`);
      setToRetire(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not retire asset'));
    }
  };

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Asset Registry</h2>
          <p className="mt-1 text-sm text-muted">What we own, what shape it&apos;s in, where it is.</p>
        </div>
        <PermissionGate resource={Resource.ASSETS} action={Action.CREATE}>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Register asset
          </Button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => resetPageThen(() => setSearch(e.target.value))}
            placeholder="Search name, tag or serial…"
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <Select
          options={categoryOptions}
          value={categoryFilter}
          onChange={(e) => resetPageThen(() => setCategoryFilter(e.target.value))}
        />
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => resetPageThen(() => setStatusFilter(e.target.value as AssetStatus | ''))}
        />
      </div>

      <Card>
        {isLoading ? (
          <LoadingRows />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No assets match"
            description="Try clearing filters, or register a new asset."
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Tag</TH>
                  <TH>Name</TH>
                  <TH>Category</TH>
                  <TH>Condition</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((a) => (
                  <TR key={a.id} className="cursor-pointer" onClick={() => setDetailId(a.id)}>
                    <TD>
                      <Badge variant="neutral" className="font-mono">
                        {a.assetTag}
                      </Badge>
                    </TD>
                    <TD className="font-medium">
                      {a.name}
                      {a.isShared && (
                        <Badge variant="info" className="ml-2">
                          Shared
                        </Badge>
                      )}
                    </TD>
                    <TD className="text-muted">{a.category.name}</TD>
                    <TD className="text-muted">{a.condition}</TD>
                    <TD>
                      <Badge variant={STATUS_BADGE[a.status] ?? 'neutral'}>
                        {a.status.replace('_', ' ')}
                      </Badge>
                    </TD>
                    <TD onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        {a.status === 'AVAILABLE' && !a.isShared && (
                          <PermissionGate resource={Resource.ALLOCATIONS} action={Action.CREATE}>
                            <button
                              type="button"
                              onClick={() => setAllocating(a)}
                              className="rounded-lg p-2 text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                              aria-label="Allocate"
                              title="Allocate"
                            >
                              <ArrowLeftRight className="h-4 w-4" />
                            </button>
                          </PermissionGate>
                        )}
                        <PermissionGate resource={Resource.ASSETS} action={Action.UPDATE}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(a);
                              setFormOpen(true);
                            }}
                            className="rounded-lg p-2 text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </PermissionGate>
                        {a.status !== 'RETIRED' && a.status !== 'DISPOSED' && (
                          <PermissionGate resource={Resource.ASSETS} action={Action.DELETE}>
                            <button
                              type="button"
                              onClick={() => setToRetire(a)}
                              className="rounded-lg p-2 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                              aria-label="Retire"
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
                {data?.total ?? 0} asset{(data?.total ?? 0) === 1 ? '' : 's'}
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

      <AssetForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
      <AssetDetailDrawer assetId={detailId} onClose={() => setDetailId(null)} />
      <AllocateModal asset={allocating} onClose={() => setAllocating(null)} />
      <ConfirmDialog
        open={!!toRetire}
        title="Retire asset"
        message={`Retire "${toRetire?.name}"? This is blocked while the asset is allocated.`}
        confirmLabel="Retire"
        loading={remove.isPending}
        onConfirm={confirmRetire}
        onClose={() => setToRetire(null)}
      />
    </div>
  );
}

export default AssetTable;
