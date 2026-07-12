import { findConflict, freeSlotsForDay, isValidWindow, overlaps } from './availability.service';

const d = (h: number, m = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + 1); // tomorrow, so "future" checks pass
  date.setHours(h, m, 0, 0);
  return date;
};

describe('availability.service', () => {
  it('flags a mid-overlap as a conflict', () => {
    expect(overlaps({ start: d(9), end: d(10) }, { start: d(9, 30), end: d(10, 30) })).toBe(true);
  });

  it('allows back-to-back bookings (half-open interval)', () => {
    expect(overlaps({ start: d(9), end: d(10) }, { start: d(10), end: d(11) })).toBe(false);
  });

  it('findConflict returns the clashing booking from a CONFIRMED list', () => {
    const existing = [{ id: 1, start: d(9), end: d(10) }];
    expect(findConflict(existing, { start: d(9, 30), end: d(10, 30) })?.id).toBe(1);
    expect(findConflict(existing, { start: d(10), end: d(11) })).toBeUndefined();
  });

  it('rejects a window outside working hours', () => {
    expect(isValidWindow({ start: d(7), end: d(9) }).valid).toBe(false);
    expect(isValidWindow({ start: d(19), end: d(21) }).valid).toBe(false);
  });

  it('rejects a window longer than the max duration', () => {
    expect(isValidWindow({ start: d(8), end: d(17) }).valid).toBe(false);
  });

  it('rejects start/end not aligned to 15-minute steps', () => {
    expect(isValidWindow({ start: d(9, 5), end: d(10) }).valid).toBe(false);
  });

  it('accepts a valid same-day window', () => {
    expect(isValidWindow({ start: d(9), end: d(10) }).valid).toBe(true);
  });

  it('freeSlotsForDay subtracts a single booking from the working day', () => {
    const day = d(0);
    const free = freeSlotsForDay(day, [{ start: d(9), end: d(10) }]);
    expect(free).toHaveLength(2);
    expect(free[0].start.getHours()).toBe(8);
    expect(free[0].end.getHours()).toBe(9);
    expect(free[1].start.getHours()).toBe(10);
    expect(free[1].end.getHours()).toBe(20);
  });

  it('freeSlotsForDay merges overlapping/adjacent bookings', () => {
    const day = d(0);
    const free = freeSlotsForDay(day, [
      { start: d(9), end: d(10) },
      { start: d(10), end: d(11) },
    ]);
    expect(free).toHaveLength(2);
    expect(free[0].end.getHours()).toBe(9);
    expect(free[1].start.getHours()).toBe(11);
  });
});
