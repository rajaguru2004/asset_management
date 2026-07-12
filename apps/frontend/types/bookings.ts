// Module 6 (Resource Booking) domain types.

export type BookingStatus = 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export interface BookingAssetRef {
  id: number;
  assetTag: string;
  name: string;
  status: string;
}

export interface BookingUserRef {
  id: number;
  firstName: string;
  lastName: string;
  departmentId: number | null;
}

export interface Booking {
  id: number;
  assetId: number;
  bookedById: number;
  purpose: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  cancelReason: string;
  remindedAt: string | null;
  createdAt: string;
  updatedAt: string;
  asset: BookingAssetRef;
  bookedBy: BookingUserRef;
}

export interface FreeSlot {
  start: string;
  end: string;
}

export interface AvailabilityResponse {
  assetId: number;
  date: string;
  workingHours: { start: number; end: number };
  free: FreeSlot[];
}

export interface BookingClash {
  id: number;
  startTime: string;
  endTime: string;
  purpose: string;
}
