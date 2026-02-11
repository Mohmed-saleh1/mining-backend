import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaytabsCallbackDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  tranRef: string;

  @ApiProperty()
  @IsNotEmpty()
  payment_result: string | { response_code?: string; [key: string]: any };

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_info?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cart_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cart_description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cart_currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cart_amount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customer_details?: string;
}

