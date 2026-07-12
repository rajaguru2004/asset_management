import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Self-signup payload. Note there is deliberately NO role field — every signup
 * becomes an Employee (roleId forced server-side). Roles are only granted by an
 * Admin from the Employee Directory, preventing self-elevation.
 */
export class RegisterDto {
  @ApiProperty({ example: 'jordan@assetflow.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password@123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Jordan' })
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty({ example: 'Rivera' })
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiPropertyOptional({ example: '+1 555 0100' })
  @IsOptional()
  @IsString()
  phone?: string;
}
