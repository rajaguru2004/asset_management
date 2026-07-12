import type { ApiError } from '@/types/api';

/**
 * Extract a human-readable message from an unknown error value.
 * Handles the normalized ApiError shape, native Errors and plain strings.
 */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (typeof error === 'string') return error;

  if (error && typeof error === 'object') {
    const maybe = error as Partial<ApiError> & { message?: unknown };
    if (typeof maybe.message === 'string' && maybe.message.trim()) {
      return maybe.message;
    }
  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;
}
