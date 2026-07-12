'use client';

import { useAvailability } from '@/hooks/useBookings';
import { LoadingRows } from '@/components/common/Spinner';

const DAY_START = 8;
const DAY_END = 20;
const pct = (hour: number) => ((hour - DAY_START) / (DAY_END - DAY_START)) * 100;

function hourOf(iso: string) {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
}

function toHour(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h + m / 60;
}

export function AvailabilityPreview({
  assetId,
  date,
  proposedStart,
  proposedEnd,
}: {
  assetId: number | '';
  date: string;
  /** "HH:mm" — draws the proposed range as an outline on top of the free/busy bar */
  proposedStart?: string;
  proposedEnd?: string;
}) {
  const { data, isLoading } = useAvailability(assetId, date);

  if (assetId === '' || !date) {
    return <p className="text-sm text-muted">Pick an asset and date to see availability.</p>;
  }
  if (isLoading) return <LoadingRows label="Loading availability…" />;
  if (!data) return null;

  const proposed =
    proposedStart && proposedEnd
      ? { startHour: toHour(proposedStart), endHour: toHour(proposedEnd) }
      : null;

  return (
    <div className="space-y-2">
      <div className="relative h-8 overflow-hidden rounded-lg bg-danger/10">
        {data.free.map((slot, i) => (
          <div
            key={i}
            className="absolute inset-y-0 bg-emerald-400/50 dark:bg-emerald-500/30"
            style={{
              left: `${pct(hourOf(slot.start))}%`,
              width: `${Math.max(pct(hourOf(slot.end)) - pct(hourOf(slot.start)), 0)}%`,
            }}
            title={`Free ${new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(
              slot.end,
            ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          />
        ))}
        {proposed && (
          <div
            className="absolute inset-y-0 rounded border-2 border-primary bg-primary/30"
            style={{
              left: `${pct(proposed.startHour)}%`,
              width: `${Math.max(pct(proposed.endHour) - pct(proposed.startHour), 1)}%`,
            }}
          />
        )}
      </div>
      <div className="flex justify-between text-[11px] text-muted">
        <span>{DAY_START}:00</span>
        <span>{DAY_END}:00</span>
      </div>
      <p className="text-xs text-muted">Green = free · Red = booked · Blue outline = your proposed time</p>
    </div>
  );
}

export default AvailabilityPreview;
