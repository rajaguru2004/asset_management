// Module 4-7 generic library engine types.
// Mirrors apps/backend/src/libraries/library.config.ts.

export const LIBRARY_NAMES = ['location', 'fuel_type', 'booking_purpose', 'maintenance_type'] as const;
export type LibraryName = (typeof LIBRARY_NAMES)[number];

export interface LibraryItem {
  id: number;
  libName: string;
  dataId: string;
  data: Record<string, unknown> & { label?: string };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
