import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookingsService, type RequestUser } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Resource, Action } from '../common/rbac/permissions.enum';

@ApiTags('Bookings')
@ApiBearerAuth('JWT-auth')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  @RequirePermission({ resource: Resource.BOOKINGS, action: Action.VIEW })
  @ApiOperation({ summary: 'Paginated list — row scope: Employee=own, DeptHead=department, Admin/AM=all' })
  findAll(@Query() query: QueryBookingsDto, @CurrentUser() user: RequestUser) {
    return this.bookings.findAll(query, user);
  }

  @Get('calendar')
  @RequirePermission({ resource: Resource.BOOKINGS, action: Action.VIEW })
  @ApiOperation({ summary: 'Bookings for an asset in a date range, grouped per day' })
  calendar(@Query() query: CalendarQueryDto) {
    return this.bookings.calendar(query);
  }

  @Get('availability')
  @RequirePermission({ resource: Resource.BOOKINGS, action: Action.VIEW })
  @ApiOperation({ summary: 'Free slots for an asset on a given day (08:00-20:00)' })
  availability(@Query() query: AvailabilityQueryDto) {
    return this.bookings.availability(query);
  }

  @Post()
  @RequirePermission({ resource: Resource.BOOKINGS, action: Action.CREATE })
  @ApiOperation({ summary: 'Book a shared asset (conflict -> REJECTED row + 409 with the clash)' })
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: RequestUser) {
    return this.bookings.create(dto, user.id);
  }

  @Patch(':id/reschedule')
  @RequirePermission({ resource: Resource.BOOKINGS, action: Action.UPDATE })
  @ApiOperation({ summary: 'Reschedule (own, or Admin/AM) — atomic re-validation, original untouched on failure' })
  reschedule(@Param('id', ParseIntPipe) id: number, @Body() dto: RescheduleBookingDto, @CurrentUser() user: RequestUser) {
    return this.bookings.reschedule(id, dto, user);
  }

  @Patch(':id/cancel')
  @RequirePermission({ resource: Resource.BOOKINGS, action: Action.UPDATE })
  @ApiOperation({ summary: 'Cancel a future CONFIRMED booking (own, or Admin/AM) — reason required' })
  cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: CancelBookingDto, @CurrentUser() user: RequestUser) {
    return this.bookings.cancel(id, dto, user);
  }
}
