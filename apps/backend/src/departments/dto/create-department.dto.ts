import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'IT', description: 'Unique short code' })
  @IsString()
  @MinLength(1)
  @MaxLength(12)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'code may contain only letters, numbers, - and _',
  })
  code: string;

  @ApiProperty({ example: 'Information Technology' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: 'Systems, networks and support' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1, description: 'Parent department id (hierarchy)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number;

  @ApiPropertyOptional({ example: 5, description: 'Department Head (user id)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  headId?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
