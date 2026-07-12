import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetCondition } from '@prisma/client';

// No assetTag/status field on purpose — server-generated only (whitelist +
// forbidNonWhitelisted 400s any attempt to send them, same trick as auth's
// no-self-elevation).
export class CreateAssetDto {
  @ApiProperty({ example: 'Dell Latitude 5420' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  categoryId: number;

  @ApiPropertyOptional({ example: 'SN-9928374' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ enum: AssetCondition, default: AssetCondition.GOOD })
  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @ApiPropertyOptional({ description: '"location" library dataId', example: 'CHN' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  location?: string;

  @ApiPropertyOptional({ default: false, description: 'true = bookable (M6), not allocatable (M5)' })
  @IsOptional()
  @IsBoolean()
  isShared?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  acquisitionDate?: string;

  @ApiPropertyOptional({ example: 899.99 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  acquisitionCost?: number;

  @ApiPropertyOptional({ description: 'TODO: upload wiring, accepts a URL for now' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Keyed by the owning category\'s customFields' })
  @IsOptional()
  @IsObject()
  customValues?: Record<string, unknown>;
}
