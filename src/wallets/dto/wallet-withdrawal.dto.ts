import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { CryptoType } from '../entities/wallet.entity';
import {
  WalletWithdrawalRequest,
  WalletWithdrawalStatus,
} from '../entities/wallet-withdrawal-request.entity';

export class CreateWalletWithdrawalRequestDto {
  @ApiProperty({ enum: CryptoType })
  @IsEnum(CryptoType)
  cryptoType: CryptoType;

  @ApiProperty({ description: 'Network type (e.g., TRC20, ERC20, BTC)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  networkType: string;

  @ApiProperty({ description: 'Receiving address for withdrawal' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'Amount to withdraw' })
  @IsNumber()
  @IsPositive()
  amount: number;
}

export class WalletWithdrawalResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: CryptoType })
  cryptoType: CryptoType;

  @ApiProperty()
  networkType: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  amount: number;

  @ApiProperty({ enum: WalletWithdrawalStatus })
  status: WalletWithdrawalStatus;

  @ApiPropertyOptional()
  screenshotUrl?: string;

  @ApiPropertyOptional()
  adminNotes?: string;

  @ApiPropertyOptional()
  sentById?: string;

  @ApiPropertyOptional()
  sentAt?: Date;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(entity: WalletWithdrawalRequest): WalletWithdrawalResponseDto {
    return {
      id: entity.id,
      cryptoType: entity.cryptoType,
      networkType: entity.networkType,
      address: entity.address,
      amount: Number(entity.amount),
      status: entity.status,
      screenshotUrl: entity.screenshotUrl ?? undefined,
      adminNotes: entity.adminNotes ?? undefined,
      sentById: entity.sentById ?? undefined,
      sentAt: entity.sentAt ?? undefined,
      createdAt: entity.createdAt,
    };
  }
}

export class MarkWalletWithdrawalSentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

