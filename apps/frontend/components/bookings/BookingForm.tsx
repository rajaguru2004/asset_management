'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useAssetOptions } from '@/hooks/useAssets';
import { useBookingMutations } from '@/hooks/useBookings';
import { AvailabilityPreview } from './AvailabilityPreview';
import { getErrorMessage } from '@/lib/apiError';
import type { ApiError } from '@/types/api';
import type { BookingClash } from '@/types/bookings';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export interface BookingFormInitial {
  assetId?: number;
  date?: string;
  startTime?: string;
  endTime?: string;
}

export function BookingForm({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: BookingFormInitial;
}) {
  const { data: assetOpts } = useAssetOptions(true);
  const { create } = useBookingMutations();

  const [assetId, setAssetId] = useState<number | ''>('');
  const [date, setDate] = useState(todayISO());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [purpose, setPurpose] = useState('');
  const [clash, setClash] = useState<BookingClash | null>(null);

  useEffect(() => {
    if (!open) return;
    setAssetId(initial?.assetId ?? '');
    setDate(initial?.date ?? todayISO());
    setStartTime(initial?.startTime ?? '09:00');
    setEndTime(initial?.endTime ?? '10:00');
    setPurpose('');
    setClash(null);
  }, [open, initial]);

  const assetOptions = (assetOpts ?? []).map((a) => ({ value: a.id, label: a.name }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId) {
      toast.error('Pick an asset');
      return;
    }
    if (!purpose.trim()) {
      toast.error('Purpose is required');
      return;
    }
    setClash(null);

    try {
      await create.mutateAsync({
        assetId: Number(assetId),
        purpose: purpose.trim(),
        startTime: new Date(`${date}T${startTime}:00`).toISOString(),
        endTime: new Date(`${date}T${endTime}:00`).toISOString(),
      });
      toast.success('Booking confirmed');
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      const clashPayload = (apiErr.errors as { clash?: BookingClash } | undefined)?.clash;
      if (apiErr.statusCode === 409 && clashPayload) {
        setClash(clashPayload);
        return;
      }
      toast.error(getErrorMessage(err, 'Could not create booking'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Book a resource" className="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        <Select
          label="Asset"
          options={assetOptions}
          placeholder="Select a bookable asset…"
          value={assetId}
          onChange={(e) => {
            setAssetId(e.target.value ? Number(e.target.value) : '');
            setClash(null);
          }}
        />
        <Input label="Purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Sprint planning" />
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setClash(null);
            }}
          />
          <Input
            label="Start"
            type="time"
            step={900}
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value);
              setClash(null);
            }}
          />
          <Input
            label="End"
            type="time"
            step={900}
            value={endTime}
            onChange={(e) => {
              setEndTime(e.target.value);
              setClash(null);
            }}
          />
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="mb-2 text-xs font-medium uppercase text-muted">Live availability</p>
          <AvailabilityPreview assetId={assetId} date={date} proposedStart={startTime} proposedEnd={endTime} />
        </div>

        {clash && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            Conflicts with &quot;{clash.purpose}&quot; (
            {new Date(clash.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
            {new Date(clash.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={create.isPending}>
            Book
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default BookingForm;
