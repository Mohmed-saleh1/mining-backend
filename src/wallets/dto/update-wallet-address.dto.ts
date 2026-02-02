import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { CryptoType } from '../entities/wallet.entity';

export class UpdateWalletAddressDto {
  @IsEnum(CryptoType)
  @IsNotEmpty()
  cryptoType: CryptoType;

  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}
