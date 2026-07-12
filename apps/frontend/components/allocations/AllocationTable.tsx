'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeftRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAllocations } from '@/hooks/useAllocations';
import { useCategories } from '@/hooks/useCategories';
import { ReturnModal } from './ReturnModal';
import { Card } from '@/components/ui/Card';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingRows } from '@/components/common/Spinner';
import { PermissionGate } from '@/components/common/PermissionGate';
import { Action, Resource } from '@/lib/permissions';
import type { Allocation, AllocationStatus } from '@/types/allocations';

const STATUS_BADGE: Record<string, BadgeVariant> = {
  ACTIVE: 'success',
  RETURNED: 'neutral',
  TRANSFER_PENDING: 'warning',
};

const STATUS_OPTIONS: { value: AllocationStatus | ''; label: string }[] = [
  { value: '', label: 'All status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'TRANSFER_PENDING', label: 'Transfer pending' },
];

export function AllocationTable() {
  // Seed filters from the URL so dashboard drill-throughs land pre-filtered.
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<AllocationStatus | ''>(
    () => (searchParams.get('status') as AllocationStatus) ?? '',
  );
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get('categoryId') ?? '');
  const [overdueOnly, setOverdueOnly] = useState(() => searchParams.get('overdue') === 'true');
  const [page, setPage] = useState(1);
  const [returning, setReturning] = useState<Allocation | null>(null);

  const { data: categories } = useCategories();
  const categoryOptions = [
    { value: '', label: 'All categories' },
    ...(categories ?? []).map((c) => ({ value: String(c.id), label: c.name })),
  ];

  const query = useMemo(
    () => ({
      status: statusFilter || undefined,
      categoryId: categoryFilter ? Number(categoryFilter) : undefined,
      overdue: overdueOnly || undefined,
      page,
      limit: 8,
    }),
    [statusFilter, categoryFilter, overdueOnly, page],
  );
  const { data, isLoading, isFetching } = useAllocations(query);

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const isOverdue = (a: Allocation) =>
    a.status === 'ACTIVE' && !!a.expectedReturnDate && new Date(a.expectedReturnDate) < new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value as AllocationStatus | '');
          }}
          className="w-48"
        />
        <Select
          options={categoryOptions}
          value={categoryFilter}
          onChange={(e) => {
            setPage(1);
            setCategoryFilter(e.target.value);
          }}
          className="w-48"
        />
        <Button
          type="button"
          size="sm"
          variant={overdueOnly ? 'primary' : 'outline'}
          onClick={() => {
            setPage(1);
            setOverdueOnly((v) => !v);
          }}
        >
          <AlertCircle className="h-4 w-4" /> Overdue only
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <LoadingRows />
        ) : items.length === 0 ? (
          <EmptyState icon={ArrowLeftRight} title="No allocations match" description="Try clearing filters." />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Asset</TH>
                  <TH>Holder</TH>
                  <TH>Status</TH>
                  <TH>Expected return</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((a) => (
                  <TR key={a.id}>
                    <TD>
                      <Badge variant="neutral" className="font-mono">
                        {a.asset.assetTag}
                      </Badge>{' '}
                      <span className="text-foreground">{a.asset.name}</span>
                    </TD>
                    <TD className="text-muted">
                      {a.user ? `${a.user.firstName} ${a.user.lastName}` : (a.department?.name ?? '—')}
                    </TD>
                    <TD>
                      <Badge variant={STATUS_BADGE[a.status] ?? 'neutral'}>{a.status.replace('_', ' ')}</Badge>
                      {isOverdue(a) && (
                        <Badge variant="danger" className="ml-1.5">
                          Overdue
                        </Badge>
                      )}
                    </TD>
                    <TD className="text-muted">
                      {a.expectedReturnDate ? new Date(a.expectedReturnDate).toLocaleDateString() : '—'}
                    </TD>
                    <TD>
                      <div className="flex justify-end">
                        {a.status === 'ACTIVE' && (
                          <PermissionGate resource={Resource.ALLOCATIONS} action={Action.UPDATE}>
                            <Button size="sm" variant="outline" onClick={() => setReturning(a)}>
                              Return
                            </Button>
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
                {data?.total ?? 0} allocation{(data?.total ?? 0) === 1 ? '' : 's'}
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

      <ReturnModal allocation={returning} onClose={() => setReturning(null)} />
    </div>
  );
}

export default AllocationTable;
