import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetStatus, AssetCondition } from '@prisma/client';

export class CreateAssetDto {
  @ApiProperty({ example: 'AST-0001', description: 'Unique asset tag' })
  @IsString()
  assetTag: string;

  @ApiProperty({ example: 'Dell Latitude 5540', description: 'Asset name' })
  @IsString()
  name: string;

  @ApiProperty({
    example: '3f2504e0-4f89-11e3-9d7b-0800200c9a66',
    description: 'Category ID the asset belongs to',
  })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ description: 'Asset description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Serial number' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ enum: AssetStatus, description: 'Asset status' })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({
    enum: AssetCondition,
    description: 'Asset condition',
  })
  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @ApiPropertyOptional({
    example: '2024-01-15',
    description: 'Purchase date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({ example: 1200.5, description: 'Purchase cost' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  purchaseCost?: number;

  @ApiPropertyOptional({
    example: '2026-01-15',
    description: 'Warranty end date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  warrantyEnd?: string;

  @ApiPropertyOptional({ description: 'Physical location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Vendor ID' })
  @IsOptional()
  @IsUUID()
  vendorId?: string;
}
