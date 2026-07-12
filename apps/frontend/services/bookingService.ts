import axiosInstance from '@/lib/axios';
import type { ApiResponse, Paginated } from '@/types/api';
import type { AvailabilityResponse, Booking, BookingStatus } from '@/types/bookings';

export interface CreateBookingPayload {
  assetId: number;
  purpose: string;
  startTime: string;
  endTime: string;
}

export interface RescheduleBookingPayload {
  startTime: string;
  endTime: string;
}

export interface CancelBookingPayload {
  reason: string;
}

export interface BookingQuery {
  assetId?: number;
  status?: BookingStatus;
  page?: number;
  limit?: number;
}

export interface CalendarQuery {
  assetId?: number;
  from: string;
  to: string;
}

const bookingService = {
  list(query: BookingQuery = {}): Promise<ApiResponse<Paginated<Booking>>> {
    return axiosInstance.get('/bookings', { params: query });
  },
  calendar(query: CalendarQuery): Promise<ApiResponse<Record<string, Booking[]>>> {
    return axiosInstance.get('/bookings/calendar', { params: query });
  },
  availability(assetId: number, date: string): Promise<ApiResponse<AvailabilityResponse>> {
    return axiosInstance.get('/bookings/availability', { params: { assetId, date } });
  },
  create(payload: CreateBookingPayload): Promise<ApiResponse<Booking>> {
    return axiosInstance.post('/bookings', payload);
  },
  reschedule(id: number, payload: RescheduleBookingPayload): Promise<ApiResponse<Booking>> {
    return axiosInstance.patch(`/bookings/${id}/reschedule`, payload);
  },
  cancel(id: number, payload: CancelBookingPayload): Promise<ApiResponse<Booking>> {
    return axiosInstance.patch(`/bookings/${id}/cancel`, payload);
  },
};

export default bookingService;
