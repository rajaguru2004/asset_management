import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// All Module 4-7 crons live here — one scheduler surface, fewer moving parts.
// Overdue allocations stay computed-on-read (no cron); this covers bookings only.
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleBookingCron() {
    await this.sendReminders();
    await this.autoCompletePastBookings();
  }

  private async sendReminders() {
    const now = new Date();
    const soon = new Date(now.getTime() + 15 * 60 * 1000);

    const due = await this.prisma.booking.findMany({
      where: { status: BookingStatus.CONFIRMED, remindedAt: null, startTime: { gte: now, lte: soon } },
      include: {
        asset: { select: { assetTag: true, name: true } },
        bookedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    for (const b of due) {
      this.events.emit('booking.reminder', {
        bookingId: b.id,
        recipient: `${b.bookedBy.firstName} ${b.bookedBy.lastName}`,
        asset: `${b.asset.name} (${b.asset.assetTag})`,
        startTime: b.startTime,
      });
      await this.prisma.booking.update({ where: { id: b.id }, data: { remindedAt: now } });
    }
  }

  private async autoCompletePastBookings() {
    const result = await this.prisma.booking.updateMany({
      where: { status: BookingStatus.CONFIRMED, endTime: { lt: new Date() } },
      data: { status: BookingStatus.COMPLETED },
    });
    if (result.count > 0) {
      this.logger.log(`booking auto-complete: ${result.count} booking(s) -> COMPLETED`);
    }
  }
}
