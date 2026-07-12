import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveRequestDto {
  @ApiProperty({ example: 'Replaced screen assembly' })
  @IsString()
  @MinLength(1)
  resolutionNotes: string;

  @ApiPropertyOptional({ example: 89.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cost?: number;
}
