import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateDepartmentDto } from './create-department.dto';

// Base is Create minus parent/head, so we can re-declare those as nullable
// (sending null explicitly detaches a parent or head).
export class UpdateDepartmentDto extends PartialType(
  OmitType(CreateDepartmentDto, ['parentId', 'headId'] as const),
) {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  headId?: number | null;
}
