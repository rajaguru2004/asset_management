'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBookings } from '@/hooks/useBookings';
import { useAssets } from '@/hooks/useAssets';
import { CancelBookingDialog } from './CancelBookingDialog';
import { Card } from '@/components/ui/Card';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingRows } from '@/components/common/Spinner';
import type { Booking, BookingStatus } from '@/types/bookings';

const STATUS_BADGE: Record<string, BadgeVariant> = {
  CONFIRMED: 'success',
  COMPLETED: 'neutral',
  CANCELLED: 'neutral',
  REJECTED: 'danger',
};

const STATUS_OPTIONS: { value: BookingStatus | ''; label: string }[] = [
  { value: '', label: 'All status' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REJECTED', label: 'Rejected' },
];

export function BookingTable() {
  const { data: assetsData } = useAssets({ isShared: true, limit: 100 });
  const [assetFilter, setAssetFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>('');
  const [page, setPage] = useState(1);
  const [cancelling, setCancelling] = useState<Booking | null>(null);

  const query = useMemo(
    () => ({
      assetId: assetFilter ? Number(assetFilter) : undefined,
      status: statusFilter || undefined,
      page,
      limit: 8,
    }),
    [assetFilter, statusFilter, page],
  );
  const { data, isLoading, isFetching } = useBookings(query);

  const assetOptions = [
    { value: '', label: 'All assets' },
    ...(assetsData?.items ?? []).map((a) => ({ value: String(a.id), label: a.name })),
  ];

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const canCancel = (b: Booking) => b.status === 'CONFIRMED' && new Date(b.startTime).getTime() > Date.now();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Select
          options={assetOptions}
          value={assetFilter}
          onChange={(e) => {
            setPage(1);
            setAssetFilter(e.target.value);
          }}
        />
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value as BookingStatus | '');
          }}
        />
      </div>

      <Card>
        {isLoading ? (
          <LoadingRows />
        ) : items.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No bookings match" description="Try clearing filters, or book a resource." />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Asset</TH>
                  <TH>Purpose</TH>
                  <TH>When</TH>
                  <TH>Booked by</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((b) => (
                  <TR key={b.id}>
                    <TD>
                      <Badge variant="neutral" className="font-mono">
                        {b.asset.assetTag}
                      </Badge>{' '}
                      <span className="text-foreground">{b.asset.name}</span>
                    </TD>
                    <TD className="text-foreground">{b.purpose}</TD>
                    <TD className="text-muted">
                      {new Date(b.startTime).toLocaleDateString()}{' '}
                      {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                      {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TD>
                    <TD className="text-muted">
                      {b.bookedBy.firstName} {b.bookedBy.lastName}
                    </TD>
                    <TD>
                      <Badge variant={STATUS_BADGE[b.status] ?? 'neutral'}>{b.status}</Badge>
                    </TD>
                    <TD>
                      <div className="flex justify-end">
                        {canCancel(b) && (
                          <Button size="sm" variant="outline" onClick={() => setCancelling(b)}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted">
              <span>
                {data?.total ?? 0} booking{(data?.total ?? 0) === 1 ? '' : 's'}
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

      <CancelBookingDialog booking={cancelling} onClose={() => setCancelling(null)} />
    </div>
  );
}

export default BookingTable;
