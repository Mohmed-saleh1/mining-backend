import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { BaseResponseDto } from '../shared/dto/base-response.dto';
import { UserRole } from '../users/entities/user.entity';
import {
  CreateWalletWithdrawalRequestDto,
  MarkWalletWithdrawalSentDto,
} from './dto';
import { WalletWithdrawalsService } from './wallet-withdrawals.service';
import { WalletWithdrawalStatus } from './entities/wallet-withdrawal-request.entity';

@ApiTags('Wallet Withdrawals')
@Controller()
export class WalletWithdrawalsController {
  constructor(private readonly withdrawalsService: WalletWithdrawalsService) {}

  @Get('wallets/withdrawals')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List my withdrawal requests' })
  async getMyWithdrawals(@CurrentUser() user: RequestUser) {
    const items = await this.withdrawalsService.getMyWithdrawals(user.userId);
    return BaseResponseDto.success('Withdrawals retrieved successfully', items);
  }

  @Post('wallets/withdrawals')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a profit withdrawal request' })
  async createWithdrawal(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateWalletWithdrawalRequestDto,
  ) {
    const item = await this.withdrawalsService.createWithdrawalRequest(
      user.userId,
      dto,
    );
    return BaseResponseDto.success('Withdrawal request created successfully', item);
  }

  @Get('wallets/admin/withdrawals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: List withdrawal requests' })
  async adminGetWithdrawals(@Query('status') status?: WalletWithdrawalStatus) {
    const items = await this.withdrawalsService.adminGetWithdrawals(status);
    return BaseResponseDto.success('Withdrawals retrieved successfully', items);
  }

  @Post('wallets/admin/withdrawals/:id/sent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: Mark withdrawal as sent with screenshot' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  async adminMarkSent(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: MarkWalletWithdrawalSentDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    const item = await this.withdrawalsService.adminMarkSent(
      user.userId,
      id,
      dto,
      image,
    );
    return BaseResponseDto.success('Withdrawal marked as sent successfully', item);
  }
}

