import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/** The single place a user's role changes (promotion / demotion). */
export class AssignRoleDto {
  @ApiProperty({
    example: 2,
    description: 'Target RoleMaster id: 1=Admin, 2=Asset Manager, 3=Department Head, 4=Employee',
  })
  @Type(() => Number)
  @IsInt()
  roleId: number;
}
