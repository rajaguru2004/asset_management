import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTechnicianDto {
  @ApiProperty({ example: 5, description: 'Any active User id — no dedicated Technician role' })
  @Type(() => Number)
  @IsInt()
  technicianId: number;
}
