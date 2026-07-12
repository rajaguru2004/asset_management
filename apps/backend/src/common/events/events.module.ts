import { Module } from '@nestjs/common';
import { EventsListener } from './events.listener';

@Module({
  providers: [EventsListener],
})
export class EventsModule {}
