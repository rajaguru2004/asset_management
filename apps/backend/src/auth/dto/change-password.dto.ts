import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Admin@123' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewPass@123', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
