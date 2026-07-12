import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelBookingDto {
  @ApiProperty({ example: 'Meeting moved to next week' })
  @IsString()
  @MinLength(1)
  reason: string;
}
