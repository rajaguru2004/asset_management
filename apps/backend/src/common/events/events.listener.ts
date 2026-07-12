import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

// Console-logged stub for every Module 4-7 event. Module 10 swaps this for
// real Notification + AuditLog writes with zero changes to the services that
// emit these events (allocation.*, booking.*, maintenance.*).
@Injectable()
export class EventsListener {
  private readonly logger = new Logger('Events');

  @OnEvent('allocation.*')
  onAllocation(payload: unknown) {
    this.logger.log(`allocation event: ${JSON.stringify(payload)}`);
  }

  @OnEvent('booking.*')
  onBooking(payload: unknown) {
    this.logger.log(`booking event: ${JSON.stringify(payload)}`);
  }

  @OnEvent('maintenance.*')
  onMaintenance(payload: unknown) {
    this.logger.log(`maintenance event: ${JSON.stringify(payload)}`);
  }
}
