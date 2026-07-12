'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  useAssets,
  useCreateAsset,
  useDeleteAsset,
  useUpdateAsset,
} from '@/hooks/useAssets';
import { useCategories } from '@/hooks/useCategories';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { ASSET_CONDITIONS, ASSET_STATUSES } from '@/utils/constants';
import { getErrorMessage } from '@/lib/apiError';
import type { Asset, AssetStatus, CreateAssetDto } from '@/types/asset';
import type { Category } from '@/types/asset';

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<AssetStatus, BadgeVariant> = {
  AVAILABLE: 'success',
  ASSIGNED: 'info',
  UNDER_MAINTENANCE: 'warning',
  RETIRED: 'neutral',
  LOST: 'danger',
};

const statusLabel = (status: AssetStatus) =>
  ASSET_STATUSES.find((s) => s.value === status)?.label ?? status;

const selectClass =
  'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30';

// ── Form schema ─────────────────────────────────────────────────────────────
const assetSchema = z.object({
  assetTag: z.string().min(1, 'Asset tag is required'),
  name: z.string().min(1, 'Name is required'),
  serialNumber: z.string().optional(),
  status: z.enum(['AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'RETIRED', 'LOST']),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']),
  location: z.string().optional(),
  purchaseCost: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Must be a number'),
  categoryId: z.string().optional(),
  description: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

// ── Create / edit form ──────────────────────────────────────────────────────
function AssetForm({
  defaultValues,
  categories,
  submitting,
  onSubmit,
  onCancel,
}: {
  defaultValues: AssetFormValues;
  categories: Category[];
  submitting: boolean;
  onSubmit: (values: AssetFormValues) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Asset Tag"
          placeholder="AST-0001"
          error={errors.assetTag?.message}
          {...register('assetTag')}
        />
        <Input
          label="Name"
          placeholder="MacBook Pro 16"
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Serial Number"
          placeholder="Optional"
          error={errors.serialNumber?.message}
          {...register('serialNumber')}
        />
        <Input
          label="Location"
          placeholder="Optional"
          error={errors.location?.message}
          {...register('location')}
        />

        <div className="w-full">
          <label className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
          <select className={selectClass} {...register('status')}>
            {ASSET_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full">
          <label className="mb-1.5 block text-sm font-medium text-foreground">Condition</label>
          <select className={selectClass} {...register('condition')}>
            {ASSET_CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full">
          <label className="mb-1.5 block text-sm font-medium text-foreground">Category</label>
          <select className={selectClass} {...register('categoryId')}>
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Purchase Cost"
          type="number"
          step="0.01"
          placeholder="0.00"
          error={errors.purchaseCost?.message}
          {...register('purchaseCost')}
        />
      </div>

      <div className="w-full">
        <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
        <textarea
          rows={3}
          placeholder="Optional"
          className={selectClass}
          {...register('description')}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={submitting}>
          Save
        </Button>
      </div>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AssetsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const { data, isLoading, isFetching } = useAssets({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
  });

  const { data: categoriesData } = useCategories({ page: 1, limit: 1000 });
  const categories = categoriesData?.items ?? [];

  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const deleteMutation = useDeleteAsset();

  const assets = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (asset: Asset) => {
    setEditing(asset);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (values: AssetFormValues) => {
    const dto: CreateAssetDto = {
      assetTag: values.assetTag,
      name: values.name,
      status: values.status,
      condition: values.condition,
      serialNumber: values.serialNumber || undefined,
      location: values.location || undefined,
      categoryId: values.categoryId || undefined,
      description: values.description || undefined,
      purchaseCost: values.purchaseCost ? Number(values.purchaseCost) : undefined,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, dto });
        toast.success('Asset updated');
      } else {
        await createMutation.mutateAsync(dto);
        toast.success('Asset created');
      }
      closeModal();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save asset'));
    }
  };

  const handleDelete = (asset: Asset) => {
    if (!window.confirm(`Delete asset "${asset.name}"? This cannot be undone.`)) {
      return;
    }
    deleteMutation.mutate(asset.id, {
      onSuccess: () => toast.success('Asset deleted'),
      onError: (err) => toast.error(getErrorMessage(err, 'Could not delete asset')),
    });
  };

  const formDefaults: AssetFormValues = editing
    ? {
        assetTag: editing.assetTag,
        name: editing.name,
        serialNumber: editing.serialNumber ?? '',
        status: editing.status,
        condition: editing.condition,
        location: editing.location ?? '',
        purchaseCost:
          editing.purchaseCost !== null && editing.purchaseCost !== undefined
            ? String(editing.purchaseCost)
            : '',
        categoryId: editing.categoryId ?? '',
        description: editing.description ?? '',
      }
    : {
        assetTag: '',
        name: '',
        serialNumber: '',
        status: 'AVAILABLE',
        condition: 'GOOD',
        location: '',
        purchaseCost: '',
        categoryId: '',
        description: '',
      };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assets</h1>
          <p className="text-sm text-muted">{total} total assets</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Asset
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets..."
            className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`sm:w-56 ${selectClass}`}
        >
          <option value="">All statuses</option>
          {ASSET_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Tag</TH>
              <TH>Name</TH>
              <TH>Category</TH>
              <TH>Status</TH>
              <TH>Condition</TH>
              <TH>Location</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <tr>
                <TD colSpan={7} className="py-10 text-center text-muted">
                  Loading assets...
                </TD>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <TD colSpan={7} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted">
                    <Package className="h-8 w-8 opacity-40" />
                    <span>No assets found</span>
                  </div>
                </TD>
              </tr>
            ) : (
              assets.map((asset) => (
                <TR key={asset.id}>
                  <TD className="font-mono text-xs">{asset.assetTag}</TD>
                  <TD className="font-medium">{asset.name}</TD>
                  <TD className="text-muted">{asset.category?.name ?? '—'}</TD>
                  <TD>
                    <Badge variant={STATUS_BADGE[asset.status]}>
                      {statusLabel(asset.status)}
                    </Badge>
                  </TD>
                  <TD className="text-muted">{asset.condition}</TD>
                  <TD className="text-muted">{asset.location ?? '—'}</TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(asset)}
                        className="rounded-lg p-2 text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
                        aria-label="Edit asset"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(asset)}
                        className="rounded-lg p-2 text-muted transition-colors hover:bg-red-50 hover:text-danger dark:hover:bg-red-500/10"
                        aria-label="Delete asset"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="text-xs text-muted">
            Page {page} of {totalPages}
            {isFetching ? ' · updating...' : ''}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Asset' : 'New Asset'}
      >
        <AssetForm
          key={editing?.id ?? 'new'}
          defaultValues={formDefaults}
          categories={categories}
          submitting={createMutation.isPending || updateMutation.isPending}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}
