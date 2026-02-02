import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet, CryptoType } from './entities/wallet.entity';
import {
  WalletResponseDto,
  AllWalletsResponseDto,
  UpdateWalletAddressDto,
} from './dto';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) {}

  async initializeWalletsForUser(userId: string): Promise<void> {
    // Create wallets for all crypto types
    const cryptoTypes = Object.values(CryptoType);
    
    for (const cryptoType of cryptoTypes) {
      const existingWallet = await this.walletRepository.findOne({
        where: { userId, cryptoType },
      });
      
      if (!existingWallet) {
        const wallet = this.walletRepository.create({
          userId,
          cryptoType,
          balance: 0,
          pendingBalance: 0,
          walletAddress: null,
          isActive: true,
        });
        await this.walletRepository.save(wallet);
      }
    }
  }

  async getAllWallets(userId: string): Promise<AllWalletsResponseDto> {
    // Ensure user has wallets initialized
    await this.initializeWalletsForUser(userId);
    
    const wallets = await this.walletRepository.find({
      where: { userId, isActive: true },
      order: { cryptoType: 'ASC' },
    });

    const walletDtos = wallets.map((wallet) =>
      WalletResponseDto.fromEntity(wallet),
    );

    // Calculate total balance in USD (this would normally use live prices)
    // For now, we'll use placeholder values
    const totalBalanceUsd = 0; // This should be calculated with live crypto prices

    return {
      wallets: walletDtos,
      totalBalanceUsd,
    };
  }

  async getWallet(userId: string, cryptoType: CryptoType): Promise<WalletResponseDto> {
    let wallet = await this.walletRepository.findOne({
      where: { userId, cryptoType },
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = this.walletRepository.create({
        userId,
        cryptoType,
        balance: 0,
        pendingBalance: 0,
        walletAddress: null,
        isActive: true,
      });
      await this.walletRepository.save(wallet);
    }

    return WalletResponseDto.fromEntity(wallet);
  }

  async updateWalletAddress(
    userId: string,
    updateDto: UpdateWalletAddressDto,
  ): Promise<WalletResponseDto> {
    let wallet = await this.walletRepository.findOne({
      where: { userId, cryptoType: updateDto.cryptoType },
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = this.walletRepository.create({
        userId,
        cryptoType: updateDto.cryptoType,
        balance: 0,
        pendingBalance: 0,
        walletAddress: updateDto.walletAddress,
        isActive: true,
      });
    } else {
      wallet.walletAddress = updateDto.walletAddress;
    }

    const savedWallet = await this.walletRepository.save(wallet);
    return WalletResponseDto.fromEntity(savedWallet);
  }

  async addBalance(
    userId: string,
    cryptoType: CryptoType,
    amount: number,
  ): Promise<WalletResponseDto> {
    let wallet = await this.walletRepository.findOne({
      where: { userId, cryptoType },
    });

    if (!wallet) {
      wallet = this.walletRepository.create({
        userId,
        cryptoType,
        balance: amount,
        pendingBalance: 0,
        walletAddress: null,
        isActive: true,
      });
    } else {
      wallet.balance = Number(wallet.balance) + amount;
    }

    const savedWallet = await this.walletRepository.save(wallet);
    return WalletResponseDto.fromEntity(savedWallet);
  }

  async subtractBalance(
    userId: string,
    cryptoType: CryptoType,
    amount: number,
  ): Promise<WalletResponseDto> {
    const wallet = await this.walletRepository.findOne({
      where: { userId, cryptoType },
    });

    if (!wallet) {
      throw new NotFoundException({
        message: 'Wallet not found',
        errorCode: 'WALLET_001',
        errorDescription: `No wallet found for crypto type '${cryptoType}'`,
      });
    }

    if (Number(wallet.balance) < amount) {
      throw new NotFoundException({
        message: 'Insufficient balance',
        errorCode: 'WALLET_002',
        errorDescription: 'Insufficient balance for this operation',
      });
    }

    wallet.balance = Number(wallet.balance) - amount;
    const savedWallet = await this.walletRepository.save(wallet);
    return WalletResponseDto.fromEntity(savedWallet);
  }

  async getWalletByAddress(
    cryptoType: CryptoType,
    walletAddress: string,
  ): Promise<Wallet | null> {
    return this.walletRepository.findOne({
      where: { cryptoType, walletAddress },
    });
  }
}
