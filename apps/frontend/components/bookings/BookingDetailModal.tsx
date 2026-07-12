'use client';

import { CalendarClock, Tag, User } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Booking } from '@/types/bookings';

const STATUS_BADGE: Record<string, BadgeVariant> = {
  CONFIRMED: 'success',
  COMPLETED: 'neutral',
  CANCELLED: 'neutral',
  REJECTED: 'danger',
};

/** Read-only booking detail shared by the list and calendar views. */
export function BookingDetailModal({
  booking,
  onClose,
  onCancelBooking,
}: {
  booking: Booking | null;
  onClose: () => void;
  onCancelBooking?: (b: Booking) => void;
}) {
  const canCancel =
    !!booking && booking.status === 'CONFIRMED' && new Date(booking.startTime).getTime() > Date.now();

  return (
    <Modal open={!!booking} onClose={onClose} title="Booking details" className="max-w-md">
      {booking && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-foreground">{booking.purpose}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                <Tag className="h-3.5 w-3.5" />
                <span className="font-mono text-xs">{booking.asset.assetTag}</span> {booking.asset.name}
              </p>
            </div>
            <Badge variant={STATUS_BADGE[booking.status] ?? 'neutral'}>{booking.status}</Badge>
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-muted-bg/40 p-3 text-sm">
            <p className="flex items-center gap-2 text-foreground">
              <CalendarClock className="h-4 w-4 text-muted" />
              {new Date(booking.startTime).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              {' · '}
              {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
              {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="flex items-center gap-2 text-muted">
              <User className="h-4 w-4" />
              Booked by {booking.bookedBy.firstName} {booking.bookedBy.lastName}
            </p>
            {booking.cancelReason && (
              <p className="text-xs text-danger">Cancelled: {booking.cancelReason}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            {canCancel && onCancelBooking && (
              <Button type="button" variant="danger" onClick={() => onCancelBooking(booking)}>
                Cancel booking
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default BookingDetailModal;
