import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Param,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { UpdateWalletAddressDto } from './dto';
import { CryptoType, CRYPTO_INFO } from './entities/wallet.entity';
import { BaseResponseDto } from '../shared/dto/base-response.dto';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  async getAllWallets(@CurrentUser() user: RequestUser) {
    const wallets = await this.walletsService.getAllWallets(user.userId);
    return BaseResponseDto.success('Wallets retrieved successfully', wallets);
  }

  @Get('crypto-types')
  getCryptoTypes() {
    const cryptoTypes = Object.entries(CRYPTO_INFO).map(([type, info]) => ({
      type,
      ...info,
    }));
    return BaseResponseDto.success('Crypto types retrieved successfully', cryptoTypes);
  }

  @Get(':cryptoType')
  async getWallet(
    @CurrentUser() user: RequestUser,
    @Param('cryptoType') cryptoType: CryptoType,
  ) {
    const wallet = await this.walletsService.getWallet(user.userId, cryptoType);
    return BaseResponseDto.success('Wallet retrieved successfully', wallet);
  }

  @Put('address')
  async updateWalletAddress(
    @CurrentUser() user: RequestUser,
    @Body() updateDto: UpdateWalletAddressDto,
  ) {
    const wallet = await this.walletsService.updateWalletAddress(user.userId, updateDto);
    return BaseResponseDto.success('Wallet address updated successfully', wallet);
  }
}
