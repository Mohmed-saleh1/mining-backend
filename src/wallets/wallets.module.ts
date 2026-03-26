import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { Wallet } from './entities/wallet.entity';
import { WalletWithdrawalRequest } from './entities/wallet-withdrawal-request.entity';
import { WalletWithdrawalsService } from './wallet-withdrawals.service';
import { WalletWithdrawalsController } from './wallet-withdrawals.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([Wallet, WalletWithdrawalRequest])],
  controllers: [WalletsController, WalletWithdrawalsController],
  providers: [WalletsService, WalletWithdrawalsService],
  exports: [WalletsService],
})
export class WalletsModule {}
