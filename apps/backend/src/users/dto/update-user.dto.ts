import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Profile / status edits. Deliberately excludes `roleId` — promotion is a
 * separate, audited endpoint (PATCH /users/:id/role) so the "only Admin grants
 * roles, only here" rule is explicit.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Sam' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Chen' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+1 555 0100' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 2, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
