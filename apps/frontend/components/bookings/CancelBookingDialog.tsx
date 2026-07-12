'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useBookingMutations } from '@/hooks/useBookings';
import { getErrorMessage } from '@/lib/apiError';
import type { Booking } from '@/types/bookings';

export function CancelBookingDialog({
  booking,
  onClose,
}: {
  booking: Booking | null;
  onClose: () => void;
}) {
  const { cancel } = useBookingMutations();
  const [reason, setReason] = useState('');

  useEffect(() => setReason(''), [booking]);

  const submit = async () => {
    if (!booking) return;
    if (!reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    try {
      await cancel.mutateAsync({ id: booking.id, payload: { reason: reason.trim() } });
      toast.success('Booking cancelled');
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not cancel booking'));
    }
  };

  return (
    <Modal open={!!booking} onClose={onClose} title={`Cancel "${booking?.purpose ?? ''}"`} className="max-w-md">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
            placeholder="Meeting moved to next week"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button type="button" variant="danger" onClick={submit} isLoading={cancel.isPending}>
            Cancel booking
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default CancelBookingDialog;
