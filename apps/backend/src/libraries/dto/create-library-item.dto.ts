import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LIBRARY_NAMES } from '../library.config';
import type { LibraryName } from '../library.config';

export class CreateLibraryItemDto {
  @ApiProperty({ enum: LIBRARY_NAMES })
  @IsIn(LIBRARY_NAMES)
  libName: LibraryName;

  @ApiProperty({ description: 'Stable key within libName, e.g. "CHN"' })
  @IsString()
  @MaxLength(50)
  dataId: string;

  @ApiProperty({ description: 'Arbitrary payload, e.g. { "label": "Chennai" }' })
  @IsObject()
  data: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
