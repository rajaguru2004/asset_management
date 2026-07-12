import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssetStatus, BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ADMIN, ASSET_MANAGER, DEPT_HEAD } from '../common/rbac/permissions.enum';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { findConflict, freeSlotsForDay, isValidWindow, WORKING_HOURS_END, WORKING_HOURS_START } from './availability.service';

export interface RequestUser {
  id: number;
  roleId: number;
  departmentId: number | null;
}

const BOOKING_INCLUDE = {
  asset: { select: { id: true, assetTag: true, name: true, status: true } },
  bookedBy: { select: { id: true, firstName: true, lastName: true, departmentId: true } },
} satisfies Prisma.BookingInclude;

const BLOCKED_ASSET_STATUSES: AssetStatus[] = [
  AssetStatus.UNDER_MAINTENANCE,
  AssetStatus.RETIRED,
  AssetStatus.LOST,
  AssetStatus.DISPOSED,
];

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  async findAll(query: QueryBookingsDto, user: RequestUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: Prisma.BookingWhereInput = { assetId: query.assetId, status: query.status };
    this.applyRowScope(where, user);

    const [total, items] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        include: BOOKING_INCLUDE,
        orderBy: { startTime: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async calendar(query: CalendarQueryDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    const bookings = await this.prisma.booking.findMany({
      where: {
        assetId: query.assetId,
        status: { not: BookingStatus.REJECTED },
        startTime: { lt: to },
        endTime: { gt: from },
      },
      include: BOOKING_INCLUDE,
      orderBy: { startTime: 'asc' },
    });

    const byDay: Record<string, typeof bookings> = {};
    for (const b of bookings) {
      const key = b.startTime.toISOString().slice(0, 10);
      (byDay[key] ??= []).push(b);
    }
    return byDay;
  }

  async availability(query: AvailabilityQueryDto) {
    const asset = await this.prisma.asset.findUnique({ where: { id: query.assetId } });
    if (!asset) throw new NotFoundException('Asset not found');

    const day = new Date(query.date);
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const confirmed = await this.prisma.booking.findMany({
      where: { assetId: query.assetId, status: BookingStatus.CONFIRMED, startTime: { lt: dayEnd }, endTime: { gt: dayStart } },
      select: { startTime: true, endTime: true },
    });

    const free = freeSlotsForDay(day, confirmed.map((b) => ({ start: b.startTime, end: b.endTime })));
    return {
      assetId: query.assetId,
      date: query.date,
      workingHours: { start: WORKING_HOURS_START, end: WORKING_HOURS_END },
      free: free.map((f) => ({ start: f.start.toISOString(), end: f.end.toISOString() })),
    };
  }

  async create(dto: CreateBookingDto, userId: number) {
    const range = { start: new Date(dto.startTime), end: new Date(dto.endTime) };
    const validity = isValidWindow(range);
    if (!validity.valid) throw new BadRequestException(validity.reason);

    // Throwing inside $transaction rolls back everything written so far — so the
    // REJECTED audit row is created here and the transaction is allowed to COMMIT
    // either way; the 409 is raised afterward, outside the transaction, based on
    // the returned marker. (A version that threw mid-transaction silently lost
    // every REJECTED row it tried to write.)
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "assets" WHERE id = ${dto.assetId} FOR UPDATE`;

      const asset = await tx.asset.findUnique({ where: { id: dto.assetId } });
      if (!asset) throw new NotFoundException('Asset not found');
      if (!asset.isShared) throw new BadRequestException('Asset is not a shared/bookable resource');
      if (BLOCKED_ASSET_STATUSES.includes(asset.status)) {
        throw new BadRequestException(`Asset unavailable for booking: ${asset.status}`);
      }

      const confirmed = await tx.booking.findMany({
        where: { assetId: dto.assetId, status: BookingStatus.CONFIRMED },
        select: { id: true, startTime: true, endTime: true, purpose: true },
      });
      const clash = findConflict(confirmed.map((c) => ({ ...c, start: c.startTime, end: c.endTime })), range);

      if (clash) {
        await tx.booking.create({
          data: {
            assetId: dto.assetId,
            bookedById: userId,
            purpose: dto.purpose,
            startTime: range.start,
            endTime: range.end,
            status: BookingStatus.REJECTED,
            cancelReason: 'Conflicts with an existing confirmed booking',
          },
        });
        return { conflict: clash };
      }

      const booking = await tx.booking.create({
        data: { assetId: dto.assetId, bookedById: userId, purpose: dto.purpose, startTime: range.start, endTime: range.end },
        include: BOOKING_INCLUDE,
      });
      return { booking };
    });

    if (result.conflict) {
      const clash = result.conflict;
      throw new ConflictException({
        message: 'Requested time slot conflicts with an existing booking',
        errors: { clash: { id: clash.id, startTime: clash.startTime, endTime: clash.endTime, purpose: clash.purpose } },
      });
    }
    if (!result.booking) throw new BadRequestException('Booking could not be created');

    this.events.emit('booking.created', { bookingId: result.booking.id, assetId: dto.assetId });
    return result.booking;
  }

  reschedule(id: number, dto: RescheduleBookingDto, user: RequestUser) {
    const range = { start: new Date(dto.startTime), end: new Date(dto.endTime) };
    const validity = isValidWindow(range);
    if (!validity.valid) throw new BadRequestException(validity.reason);

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new BadRequestException('Only a CONFIRMED booking can be rescheduled');
      }
      this.assertOwnerOrPrivileged(booking.bookedById, user);

      await tx.$queryRaw`SELECT id FROM "assets" WHERE id = ${booking.assetId} FOR UPDATE`;

      const confirmed = await tx.booking.findMany({
        where: { assetId: booking.assetId, status: BookingStatus.CONFIRMED, id: { not: id } },
        select: { id: true, startTime: true, endTime: true, purpose: true },
      });
      const clash = findConflict(confirmed.map((c) => ({ ...c, start: c.startTime, end: c.endTime })), range);
      if (clash) {
        throw new ConflictException({
          message: 'Requested time slot conflicts with an existing booking',
          errors: { clash: { id: clash.id, startTime: clash.startTime, endTime: clash.endTime, purpose: clash.purpose } },
        });
      }

      return tx.booking.update({
        where: { id },
        data: { startTime: range.start, endTime: range.end },
        include: BOOKING_INCLUDE,
      });
    });
  }

  async cancel(id: number, dto: CancelBookingDto, user: RequestUser) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only a CONFIRMED booking can be cancelled');
    }
    if (booking.startTime.getTime() <= Date.now()) {
      throw new BadRequestException('Cannot cancel a booking that has already started');
    }
    this.assertOwnerOrPrivileged(booking.bookedById, user);

    this.events.emit('booking.cancelled', { bookingId: id, assetId: booking.assetId });
    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED, cancelReason: dto.reason },
      include: BOOKING_INCLUDE,
    });
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  private applyRowScope(where: Prisma.BookingWhereInput, user: RequestUser) {
    if (user.roleId === ADMIN || user.roleId === ASSET_MANAGER) return;
    if (user.roleId === DEPT_HEAD) {
      where.bookedBy = { departmentId: user.departmentId };
      return;
    }
    where.bookedById = user.id; // Employee: own only
  }

  private assertOwnerOrPrivileged(bookedById: number, user: RequestUser) {
    if (user.roleId === ADMIN || user.roleId === ASSET_MANAGER) return;
    if (bookedById !== user.id) throw new ForbiddenException('Not your booking');
  }
}
