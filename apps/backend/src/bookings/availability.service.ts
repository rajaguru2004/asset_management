// Pure overlap/slot math for Module 6 (Resource Booking) — no DB, unit-testable.
// Working hours are a hardcoded constant for the demo. // TODO: system-settings

export const WORKING_HOURS_START = 8; // 08:00
export const WORKING_HOURS_END = 20; // 20:00
export const MAX_BOOKING_HOURS = 8;
export const SLOT_STEP_MINUTES = 15;

export interface TimeRange {
  start: Date;
  end: Date;
}

/** Half-open interval overlap: existing.start < candidate.end && existing.end > candidate.start. */
export function overlaps(existing: TimeRange, candidate: TimeRange): boolean {
  return existing.start < candidate.end && existing.end > candidate.start;
}

/** First existing range (CONFIRMED bookings only, by convention of the caller) that clashes. */
export function findConflict<T extends TimeRange>(existing: T[], candidate: TimeRange): T | undefined {
  return existing.find((e) => overlaps(e, candidate));
}

function isWithinWorkingHours(range: TimeRange): boolean {
  const sameDay = range.start.toDateString() === range.end.toDateString();
  const startHour = range.start.getHours() + range.start.getMinutes() / 60;
  const endHour = range.end.getHours() + range.end.getMinutes() / 60;
  return sameDay && startHour >= WORKING_HOURS_START && endHour <= WORKING_HOURS_END;
}

export function isValidWindow(range: TimeRange): { valid: boolean; reason?: string } {
  if (range.start.getTime() >= range.end.getTime()) {
    return { valid: false, reason: 'Start time must be before end time' };
  }
  if (range.start.getTime() < Date.now()) {
    return { valid: false, reason: 'Booking must start in the future' };
  }
  if (range.end.getTime() - range.start.getTime() > MAX_BOOKING_HOURS * 60 * 60 * 1000) {
    return { valid: false, reason: `Booking cannot exceed ${MAX_BOOKING_HOURS} hours` };
  }
  if (range.start.getMinutes() % SLOT_STEP_MINUTES !== 0 || range.end.getMinutes() % SLOT_STEP_MINUTES !== 0) {
    return { valid: false, reason: `Start and end must align to ${SLOT_STEP_MINUTES}-minute steps` };
  }
  if (!isWithinWorkingHours(range)) {
    return {
      valid: false,
      reason: `Booking must fall within ${WORKING_HOURS_START}:00-${WORKING_HOURS_END}:00 on a single day`,
    };
  }
  return { valid: true };
}

/** Free intervals within the working day, after subtracting (sorted/merged) CONFIRMED bookings. */
export function freeSlotsForDay(date: Date, confirmed: TimeRange[]): TimeRange[] {
  const dayStart = new Date(date);
  dayStart.setHours(WORKING_HOURS_START, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(WORKING_HOURS_END, 0, 0, 0);

  const busy = confirmed
    .filter((b) => b.start < dayEnd && b.end > dayStart)
    .map((b) => ({
      start: b.start < dayStart ? dayStart : b.start,
      end: b.end > dayEnd ? dayEnd : b.end,
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: TimeRange[] = [];
  for (const b of busy) {
    const last = merged[merged.length - 1];
    if (last && b.start.getTime() <= last.end.getTime()) {
      if (b.end.getTime() > last.end.getTime()) last.end = b.end;
    } else {
      merged.push({ ...b });
    }
  }

  const free: TimeRange[] = [];
  let cursor = dayStart;
  for (const b of merged) {
    if (b.start.getTime() > cursor.getTime()) free.push({ start: cursor, end: b.start });
    if (b.end.getTime() > cursor.getTime()) cursor = b.end;
  }
  if (cursor.getTime() < dayEnd.getTime()) free.push({ start: cursor, end: dayEnd });
  return free;
}
