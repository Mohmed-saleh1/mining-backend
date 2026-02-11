import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BinanceCallbackDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bizType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bizId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bizStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  data?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  merchantTradeNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  totalFee?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;
}
