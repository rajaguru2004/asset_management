import { format, isValid, parseISO } from 'date-fns';

/**
 * Format a date value into a readable string. Accepts ISO strings, timestamps
 * or Date objects and returns a dash for empty / invalid input.
 */
export function formatDate(
  date: string | number | Date | null | undefined,
  pattern = 'MMM d, yyyy'
): string {
  if (date === null || date === undefined || date === '') return '-';

  const parsed = typeof date === 'string' ? parseISO(date) : new Date(date);
  if (!isValid(parsed)) return '-';

  return format(parsed, pattern);
}
