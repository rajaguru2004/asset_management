'use client';

import { useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import { useBookings } from '@/hooks/useBookings';
import { AvailabilityPreview } from './AvailabilityPreview';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { LoadingRows } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';

const STATUS_BADGE: Record<string, BadgeVariant> = {
  CONFIRMED: 'success',
  COMPLETED: 'neutral',
  CANCELLED: 'neutral',
  REJECTED: 'danger',
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function BookingCalendar() {
  const { data: assetsData } = useAssets({ isShared: true, limit: 100 });
  const [assetId, setAssetId] = useState<number | ''>('');
  const [date, setDate] = useState(todayISO());

  const assetOptions = (assetsData?.items ?? []).map((a) => ({ value: a.id, label: a.name }));

  const dayStart = useMemo(() => new Date(`${date}T00:00:00`), [date]);
  const dayEnd = useMemo(() => new Date(`${date}T23:59:59`), [date]);
  const { data: bookingsData, isLoading } = useBookings({ assetId: assetId || undefined, limit: 50 });
  const dayBookings = (bookingsData?.items ?? [])
    .filter((b) => new Date(b.startTime) < dayEnd && new Date(b.endTime) > dayStart)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Select
          label="Asset"
          options={assetOptions}
          placeholder="Select a bookable asset…"
          value={assetId}
          onChange={(e) => setAssetId(e.target.value ? Number(e.target.value) : '')}
        />
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <Card>
        <div className="p-5">
          <AvailabilityPreview assetId={assetId} date={date} />
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <LoadingRows />
        ) : dayBookings.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No bookings this day" description="Pick a different asset or date." />
        ) : (
          <ul className="divide-y divide-border">
            {dayBookings.map((b) => (
              <li key={b.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{b.purpose}</p>
                  <p className="text-muted">
                    {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                    {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                    {b.bookedBy.firstName} {b.bookedBy.lastName}
                  </p>
                </div>
                <Badge variant={STATUS_BADGE[b.status] ?? 'neutral'}>{b.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default BookingCalendar;
