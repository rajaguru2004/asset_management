import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectRequestDto {
  @ApiProperty({ example: 'Not covered under warranty' })
  @IsString()
  @MinLength(1)
  reason: string;
}
