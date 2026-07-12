'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EventInput } from '@fullcalendar/core';
import { useBookingCalendar } from '@/hooks/useBookings';
import { BookingsFullCalendar } from '@/components/bookings/BookingsFullCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

/** Month calendar of bookings on the dashboard; any interaction drills into /bookings. */
export function DashboardBookingsCalendar() {
  const router = useRouter();
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const { data } = useBookingCalendar(range);

  const events = useMemo<EventInput[]>(() => {
    if (!data) return [];
    return Object.values(data)
      .flat()
      .map((b) => ({
        id: String(b.id),
        title: `${b.asset?.name ?? 'Asset'} · ${b.purpose}`,
        start: b.startTime,
        end: b.endTime,
        extendedProps: { status: b.status },
      }));
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active bookings calendar</CardTitle>
        <p className="text-xs text-muted">Click any booking to manage it on the bookings screen.</p>
      </CardHeader>
      <CardContent>
        <BookingsFullCalendar
          events={events}
          initialView="dayGridMonth"
          height={520}
          onEventClick={() => router.push('/bookings')}
          onDatesSet={(start, end) =>
            setRange({ from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) })
          }
        />
      </CardContent>
    </Card>
  );
}

export default DashboardBookingsCalendar;
