'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarClock, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { useBookings } from '@/hooks/useBookings';
import { useAssetOptions } from '@/hooks/useAssets';
import { CancelBookingDialog } from './CancelBookingDialog';
import { BookingDetailModal } from './BookingDetailModal';
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

function formatDuration(startTime: string, endTime: string) {
  const mins = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function BookingTable() {
  // Seed filters from the URL so drill-throughs land pre-filtered.
  const searchParams = useSearchParams();
  const { data: assetOpts } = useAssetOptions(true);
  const [assetFilter, setAssetFilter] = useState(() => searchParams.get('assetId') ?? '');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>(
    () => (searchParams.get('status') as BookingStatus) ?? '',
  );
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const [detail, setDetail] = useState<Booking | null>(null);

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
    ...(assetOpts ?? []).map((a) => ({ value: String(a.id), label: a.name })),
  ];

  const allItems = data?.items ?? [];
  const items = upcomingOnly
    ? allItems.filter((b) => new Date(b.startTime).getTime() > Date.now())
    : allItems;
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
      <Button
        type="button"
        size="sm"
        variant={upcomingOnly ? 'primary' : 'outline'}
        onClick={() => setUpcomingOnly((v) => !v)}
      >
        <Clock3 className="h-4 w-4" /> Upcoming only
      </Button>

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
                  <TH>Duration</TH>
                  <TH>Booked by</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((b) => (
                  <TR key={b.id} className="cursor-pointer" onClick={() => setDetail(b)}>
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
                    <TD className="whitespace-nowrap text-muted">{formatDuration(b.startTime, b.endTime)}</TD>
                    <TD className="text-muted">
                      {b.bookedBy.firstName} {b.bookedBy.lastName}
                    </TD>
                    <TD>
                      <Badge variant={STATUS_BADGE[b.status] ?? 'neutral'}>{b.status}</Badge>
                    </TD>
                    <TD>
                      <div className="flex justify-end">
                        {canCancel(b) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancelling(b);
                            }}
                          >
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

      <BookingDetailModal
        booking={detail}
        onClose={() => setDetail(null)}
        onCancelBooking={(b) => {
          setDetail(null);
          setCancelling(b);
        }}
      />
      <CancelBookingDialog booking={cancelling} onClose={() => setCancelling(null)} />
    </div>
  );
}

export default BookingTable;
