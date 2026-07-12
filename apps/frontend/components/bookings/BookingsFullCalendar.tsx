'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { DateSelectArg, DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core';

export interface BookingsFullCalendarProps {
  events: EventInput[];
  onEventClick?: (info: EventClickArg) => void;
  onDateSelect?: (info: DateSelectArg) => void;
  onDatesSet?: (start: Date, end: Date) => void;
  selectable?: boolean;
  initialView?: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';
  height?: string | number;
}

/**
 * Shared themed FullCalendar for bookings (used on /bookings and the
 * dashboard). Visual overrides live in globals.css under the
 * `.fullcalendar-wrapper` section so light/dark tokens apply.
 */
export function BookingsFullCalendar({
  events,
  onEventClick,
  onDateSelect,
  onDatesSet,
  selectable = false,
  initialView = 'dayGridMonth',
  height = 'auto',
}: BookingsFullCalendarProps) {
  return (
    <div className="fullcalendar-wrapper">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView={initialView}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,listWeek',
        }}
        locale="en"
        events={events}
        eventClick={onEventClick}
        select={onDateSelect}
        datesSet={(arg: DatesSetArg) => onDatesSet?.(arg.start, arg.end)}
        selectable={selectable}
        selectMirror
        dayMaxEvents={3}
        height={height}
        nowIndicator
        slotMinTime="08:00:00"
        slotMaxTime="20:00:00"
        slotDuration="00:30:00"
        allDaySlot={false}
        eventTimeFormat={{ hour: 'numeric', minute: '2-digit', hour12: true }}
        buttonText={{ today: 'Today', month: 'Month', week: 'Week', list: 'List' }}
        eventClassNames={(arg) => {
          const status = String(arg.event.extendedProps.status ?? '').toLowerCase();
          return status ? [`fc-event-${status}`] : [];
        }}
      />
    </div>
  );
}

export default BookingsFullCalendar;
