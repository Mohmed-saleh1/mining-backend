import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { UploadService } from '../shared/services/upload.service';
import { Wallet, CryptoType } from './entities/wallet.entity';
import {
  WalletWithdrawalRequest,
  WalletWithdrawalStatus,
} from './entities/wallet-withdrawal-request.entity';
import {
  CreateWalletWithdrawalRequestDto,
  MarkWalletWithdrawalSentDto,
  WalletWithdrawalResponseDto,
} from './dto';

@Injectable()
export class WalletWithdrawalsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletWithdrawalRequest)
    private readonly withdrawalRepository: Repository<WalletWithdrawalRequest>,
    private readonly uploadService: UploadService,
    private readonly entityManager: EntityManager,
  ) {}

  async getMyWithdrawals(userId: string): Promise<WalletWithdrawalResponseDto[]> {
    const items = await this.withdrawalRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return items.map(WalletWithdrawalResponseDto.fromEntity);
  }

  async createWithdrawalRequest(
    userId: string,
    dto: CreateWalletWithdrawalRequestDto,
  ): Promise<WalletWithdrawalResponseDto> {
    const wallet = await this.walletRepository.findOne({
      where: { userId, cryptoType: dto.cryptoType },
    });

    if (!wallet) {
      throw new NotFoundException({
        message: 'Wallet not found',
        errorCode: 'WALLET_001',
        errorDescription: `No wallet found for crypto type '${dto.cryptoType}'`,
      });
    }

    const balance = Number(wallet.balance);
    const pendingSumRaw = await this.withdrawalRepository
      .createQueryBuilder('w')
      .select('COALESCE(SUM(w.amount), 0)', 'sum')
      .where('w.userId = :userId', { userId })
      .andWhere('w.cryptoType = :cryptoType', { cryptoType: dto.cryptoType })
      .andWhere('w.status = :status', { status: WalletWithdrawalStatus.PENDING })
      .getRawOne<{ sum: string }>();

    const pendingSum = Number(pendingSumRaw?.sum || 0);
    const requested = Number(dto.amount);

    if (requested <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    if (pendingSum + requested > balance) {
      throw new BadRequestException({
        message: 'Insufficient available balance',
        errorCode: 'WITHDRAW_001',
        errorDescription:
          'Your pending withdrawal requests plus this request exceed your available balance.',
      });
    }

    const entity = this.withdrawalRepository.create({
      userId,
      cryptoType: dto.cryptoType as CryptoType,
      networkType: dto.networkType,
      address: dto.address,
      amount: requested,
      status: WalletWithdrawalStatus.PENDING,
    });

    const saved = await this.withdrawalRepository.save(entity);
    return WalletWithdrawalResponseDto.fromEntity(saved);
  }

  async adminGetWithdrawals(
    status?: WalletWithdrawalStatus,
  ): Promise<WalletWithdrawalResponseDto[]> {
    const items = await this.withdrawalRepository.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
    return items.map(WalletWithdrawalResponseDto.fromEntity);
  }

  async adminMarkSent(
    adminId: string,
    withdrawalId: string,
    dto: MarkWalletWithdrawalSentDto,
    screenshot: Express.Multer.File,
  ): Promise<WalletWithdrawalResponseDto> {
    if (!screenshot) {
      throw new BadRequestException('Screenshot is required');
    }

    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
    });
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (withdrawal.status !== WalletWithdrawalStatus.PENDING) {
      throw new BadRequestException('Only pending withdrawals can be marked as sent');
    }

    // Upload first (outside transaction); rollback by deleting on failure.
    const screenshotUrl = await this.uploadService.uploadImage(
      screenshot,
      'wallet-withdrawals',
    );

    try {
      const updated = await this.entityManager.transaction(async (manager) => {
        const reqRepo = manager.getRepository(WalletWithdrawalRequest);
        const walletRepo = manager.getRepository(Wallet);

        const req = await reqRepo.findOne({ where: { id: withdrawalId } });
        if (!req) throw new NotFoundException('Withdrawal request not found');
        if (req.status !== WalletWithdrawalStatus.PENDING) {
          throw new BadRequestException('Only pending withdrawals can be marked as sent');
        }

        const wallet = await walletRepo.findOne({
          where: { userId: req.userId, cryptoType: req.cryptoType },
        });
        if (!wallet) {
          throw new NotFoundException('Wallet not found for user');
        }

        const amount = Number(req.amount);
        if (Number(wallet.balance) < amount) {
          throw new BadRequestException('Insufficient balance to deduct for this withdrawal');
        }

        wallet.balance = Number(wallet.balance) - amount;
        await walletRepo.save(wallet);

        req.status = WalletWithdrawalStatus.SENT;
        req.screenshotUrl = screenshotUrl;
        req.adminNotes = dto.adminNotes?.trim() || null;
        req.sentById = adminId;
        req.sentAt = new Date();
        return await reqRepo.save(req);
      });

      return WalletWithdrawalResponseDto.fromEntity(updated);
    } catch (e) {
      // Delete uploaded image if DB operation fails
      await this.uploadService.deleteImageByUrl(screenshotUrl);
      throw e;
    }
  }
}

