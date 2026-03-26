import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CryptoType } from './wallet.entity';

export enum WalletWithdrawalStatus {
  PENDING = 'pending',
  SENT = 'sent',
  REJECTED = 'rejected',
}

@Entity('wallet_withdrawal_requests')
export class WalletWithdrawalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: CryptoType })
  cryptoType: CryptoType;

  @Column({ type: 'varchar', length: 100 })
  networkType: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'decimal', precision: 24, scale: 8 })
  amount: number;

  @Column({
    type: 'enum',
    enum: WalletWithdrawalStatus,
    default: WalletWithdrawalStatus.PENDING,
  })
  status: WalletWithdrawalStatus;

  @Column({ type: 'text', nullable: true })
  screenshotUrl: string | null;

  @Column({ type: 'text', nullable: true })
  adminNotes: string | null;

  @Column({ name: 'sent_by_id', nullable: true })
  sentById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sent_by_id' })
  sentBy: User;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

