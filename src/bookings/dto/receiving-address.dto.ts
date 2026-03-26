import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReceivingAddressDto {
  @ApiProperty({ description: 'Crypto name (e.g., USDT, BTC, ETH)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cryptoName: string;

  @ApiProperty({ description: 'Network type (e.g., TRC20, ERC20, BTC)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  networkType: string;

  @ApiProperty({ description: 'Receiving wallet address' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ description: 'Whether this address is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateReceivingAddressDto {
  @ApiPropertyOptional({ description: 'Crypto name (e.g., USDT, BTC, ETH)' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cryptoName?: string;

  @ApiPropertyOptional({ description: 'Network type (e.g., TRC20, ERC20, BTC)' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  networkType?: string;

  @ApiPropertyOptional({ description: 'Receiving wallet address' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  address?: string;

  @ApiPropertyOptional({ description: 'Whether this address is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
