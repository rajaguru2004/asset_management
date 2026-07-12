'use client';

import { useMemo, useState } from 'react';
import type { DateSelectArg, EventClickArg, EventInput } from '@fullcalendar/core';
import { useAssetOptions } from '@/hooks/useAssets';
import { useBookingCalendar } from '@/hooks/useBookings';
import { useAuthStore } from '@/store/authStore';
import { Action, Resource, hasPermission } from '@/lib/permissions';
import { BookingsFullCalendar } from './BookingsFullCalendar';
import { BookingDetailModal } from './BookingDetailModal';
import { CancelBookingDialog } from './CancelBookingDialog';
import { BookingForm, type BookingFormInitial } from './BookingForm';
import { AvailabilityPreview } from './AvailabilityPreview';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import type { Booking } from '@/types/bookings';

function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toLocalTime(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function BookingCalendar() {
  const roleId = useAuthStore((s) => s.user?.roleId);
  const canCreate = hasPermission(roleId, Resource.BOOKINGS, Action.CREATE);

  const { data: assetOpts } = useAssetOptions(true);
  const [assetId, setAssetId] = useState<number | ''>('');
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [detail, setDetail] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const [formInitial, setFormInitial] = useState<BookingFormInitial | null>(null);

  const { data: byDay, isFetching } = useBookingCalendar(range, assetId || undefined);

  const assetOptions = [
    { value: '', label: 'All shared assets' },
    ...(assetOpts ?? []).map((a) => ({ value: a.id, label: a.name })),
  ];

  const events = useMemo<EventInput[]>(() => {
    if (!byDay) return [];
    return Object.values(byDay)
      .flat()
      .map((b) => ({
        id: String(b.id),
        title: assetId ? b.purpose : `${b.asset.name} · ${b.purpose}`,
        start: b.startTime,
        end: b.endTime,
        extendedProps: { status: b.status, booking: b },
      }));
  }, [byDay, assetId]);

  const onEventClick = (info: EventClickArg) => {
    const booking = info.event.extendedProps.booking as Booking | undefined;
    if (booking) setDetail(booking);
  };

  const onDateSelect = (info: DateSelectArg) => {
    if (!canCreate) return;
    setFormInitial({
      assetId: assetId || undefined,
      date: toLocalDate(info.start),
      startTime: info.allDay ? '09:00' : toLocalTime(info.start),
      endTime: info.allDay ? '10:00' : toLocalTime(info.end),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-64">
          <Select
            options={assetOptions}
            value={assetId}
            onChange={(e) => setAssetId(e.target.value ? Number(e.target.value) : '')}
            aria-label="Filter by asset"
          />
        </div>
        {isFetching && <span className="text-xs text-muted">updating…</span>}
        {canCreate && (
          <span className="ml-auto hidden text-xs text-muted sm:block">
            Tip: select a day or drag a time range to book it.
          </span>
        )}
      </div>

      {assetId !== '' && (
        <Card>
          <div className="p-5">
            <AvailabilityPreview assetId={assetId} date={toLocalDate(new Date())} />
          </div>
        </Card>
      )}

      <Card>
        <div className="p-5">
          <BookingsFullCalendar
            events={events}
            initialView="dayGridMonth"
            height="auto"
            selectable={canCreate}
            onEventClick={onEventClick}
            onDateSelect={onDateSelect}
            onDatesSet={(start, end) => setRange({ from: toLocalDate(start), to: toLocalDate(end) })}
          />
        </div>
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
      <BookingForm
        open={!!formInitial}
        onClose={() => setFormInitial(null)}
        initial={formInitial ?? undefined}
      />
    </div>
  );
}

export default BookingCalendar;
