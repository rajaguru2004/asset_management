import { IsBoolean, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CustomFieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  BOOLEAN = 'boolean',
}

/**
 * One category-specific field definition (e.g. Electronics → warrantyPeriod).
 * Module 4 assets store matching values keyed by `key`.
 */
export class CustomFieldDto {
  @ApiProperty({ example: 'warrantyPeriod', description: 'Machine key (a-z, 0-9, _)' })
  @IsString()
  @Matches(/^[a-zA-Z][a-zA-Z0-9_]*$/, {
    message: 'key must start with a letter and contain only letters, numbers, _',
  })
  key: string;

  @ApiProperty({ example: 'Warranty Period (months)' })
  @IsString()
  label: string;

  @ApiProperty({ enum: CustomFieldType, example: CustomFieldType.NUMBER })
  @IsEnum(CustomFieldType)
  type: CustomFieldType;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}
