'use client';

import { Suspense, useState } from 'react';
import { CalendarClock, List, Plus } from 'lucide-react';
import { LoadingRows } from '@/components/common/Spinner';
import { Tabs, type TabItem } from '@/components/common/Tabs';
import { Button } from '@/components/ui/Button';
import { PermissionGate } from '@/components/common/PermissionGate';
import { BookingTable } from '@/components/bookings/BookingTable';
import { BookingCalendar } from '@/components/bookings/BookingCalendar';
import { BookingForm } from '@/components/bookings/BookingForm';
import { Action, Resource } from '@/lib/permissions';

const TABS: TabItem[] = [
  { id: 'list', label: 'List', icon: List },
  { id: 'calendar', label: 'Calendar', icon: CalendarClock },
];

export default function BookingsPage() {
  const [active, setActive] = useState('list');
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Bookings</h2>
          <p className="mt-1 text-sm text-muted">Time-share shared resources without double-booking.</p>
        </div>
        <PermissionGate resource={Resource.BOOKINGS} action={Action.CREATE}>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> Book a resource
          </Button>
        </PermissionGate>
      </div>

      <Tabs tabs={TABS} active={active} onChange={setActive} />

      <div className="pt-1">
        {active === 'list' && (
          <Suspense fallback={<LoadingRows />}>
            <BookingTable />
          </Suspense>
        )}
        {active === 'calendar' && <BookingCalendar />}
      </div>

      <BookingForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
