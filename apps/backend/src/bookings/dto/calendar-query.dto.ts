import { IsDateString, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalendarQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Omit for all shared assets' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assetId?: number;

  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  from: string;

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  to: string;
}
