import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Admin-only: create a user directly with any role. */
export class CreateUserDto {
  @ApiProperty({ example: 'sam@assetflow.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password@123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Sam' })
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty({ example: 'Chen' })
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiPropertyOptional({ example: '+1 555 0100' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 4, description: 'RoleMaster id (1=Admin..4=Employee)' })
  @Type(() => Number)
  @IsInt()
  roleId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
