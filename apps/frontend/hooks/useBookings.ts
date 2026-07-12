import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import bookingService, {
  type BookingQuery,
  type CalendarQuery,
  type CancelBookingPayload,
  type CreateBookingPayload,
  type RescheduleBookingPayload,
} from '@/services/bookingService';

export function useBookingCalendar(range: Omit<CalendarQuery, 'assetId'> | null, assetId?: number) {
  return useQuery({
    queryKey: ['bookings', 'calendar', range, assetId ?? null],
    queryFn: async () =>
      (await bookingService.calendar({ ...(range as CalendarQuery), assetId })).data,
    enabled: !!range,
    placeholderData: keepPreviousData,
  });
}

export function useBookings(query: BookingQuery = {}) {
  return useQuery({
    queryKey: ['bookings', query],
    queryFn: async () => (await bookingService.list(query)).data,
    placeholderData: keepPreviousData,
  });
}

export function useAvailability(assetId: number | '', date: string) {
  return useQuery({
    queryKey: ['bookings', 'availability', assetId, date],
    queryFn: async () => (await bookingService.availability(assetId as number, date)).data,
    enabled: assetId !== '' && !!date,
  });
}

export function useBookingMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['bookings'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const create = useMutation({
    mutationFn: (payload: CreateBookingPayload) => bookingService.create(payload),
    onSuccess: invalidate,
  });
  const reschedule = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RescheduleBookingPayload }) =>
      bookingService.reschedule(id, payload),
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CancelBookingPayload }) =>
      bookingService.cancel(id, payload),
    onSuccess: invalidate,
  });

  return { create, reschedule, cancel };
}
