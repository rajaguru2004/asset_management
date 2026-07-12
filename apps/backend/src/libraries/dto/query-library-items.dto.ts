import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { LIBRARY_NAMES } from '../library.config';
import type { LibraryName } from '../library.config';

export class QueryLibraryItemsDto {
  @ApiPropertyOptional({ enum: LIBRARY_NAMES })
  @IsOptional()
  @IsIn(LIBRARY_NAMES)
  libName?: LibraryName;
}
