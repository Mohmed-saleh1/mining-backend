import { Wallet, CryptoType, CRYPTO_INFO } from '../entities/wallet.entity';

export class WalletResponseDto {
  id: string;
  cryptoType: CryptoType;
  name: string;
  symbol: string;
  icon: string;
  color: string;
  balance: number;
  pendingBalance: number;
  walletAddress: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(wallet: Wallet): WalletResponseDto {
    const info = CRYPTO_INFO[wallet.cryptoType];
    return {
      id: wallet.id,
      cryptoType: wallet.cryptoType,
      name: info.name,
      symbol: info.symbol,
      icon: info.icon,
      color: info.color,
      balance: Number(wallet.balance),
      pendingBalance: Number(wallet.pendingBalance),
      walletAddress: wallet.walletAddress,
      isActive: wallet.isActive,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }
}

export class AllWalletsResponseDto {
  wallets: WalletResponseDto[];
  totalBalanceUsd: number;
}
