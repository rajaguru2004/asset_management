import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Target of the transfer is always the requesting (current) user — self-service,
// matches the PDF UX where a blocked employee clicks "Request Transfer".
export class TransferRequestDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  assetId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedReturnDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
