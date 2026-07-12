import { IsDateString, IsInt, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  assetId: number;

  @ApiProperty({ example: 'Client demo' })
  @IsString()
  @MinLength(1)
  purpose: string;

  @ApiProperty({ example: '2026-07-13T09:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-07-13T10:00:00.000Z' })
  @IsDateString()
  endTime: string;
}
