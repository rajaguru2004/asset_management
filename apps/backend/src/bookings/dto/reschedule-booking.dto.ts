import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RescheduleBookingDto {
  @ApiProperty({ example: '2026-07-13T11:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-07-13T12:00:00.000Z' })
  @IsDateString()
  endTime: string;
}
