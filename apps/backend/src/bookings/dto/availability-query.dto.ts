import { IsDateString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AvailabilityQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  assetId: number;

  @ApiProperty({ example: '2026-07-13' })
  @IsDateString()
  date: string;
}
