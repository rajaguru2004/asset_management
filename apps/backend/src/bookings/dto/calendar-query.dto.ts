import { IsDateString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CalendarQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  assetId: number;

  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  from: string;

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  to: string;
}
