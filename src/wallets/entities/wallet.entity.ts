import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum CryptoType {
  BTC = 'BTC',
  ETH = 'ETH',
  USDT = 'USDT',
  LTC = 'LTC',
  XRP = 'XRP',
  DOGE = 'DOGE',
  BNB = 'BNB',
  SOL = 'SOL',
}

export const CRYPTO_INFO = {
  [CryptoType.BTC]: {
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: '₿',
    color: '#F7931A',
    decimals: 8,
  },
  [CryptoType.ETH]: {
    name: 'Ethereum',
    symbol: 'ETH',
    icon: 'Ξ',
    color: '#627EEA',
    decimals: 18,
  },
  [CryptoType.USDT]: {
    name: 'Tether',
    symbol: 'USDT',
    icon: '₮',
    color: '#26A17B',
    decimals: 6,
  },
  [CryptoType.LTC]: {
    name: 'Litecoin',
    symbol: 'LTC',
    icon: 'Ł',
    color: '#BFBBBB',
    decimals: 8,
  },
  [CryptoType.XRP]: {
    name: 'Ripple',
    symbol: 'XRP',
    icon: '✕',
    color: '#23292F',
    decimals: 6,
  },
  [CryptoType.DOGE]: {
    name: 'Dogecoin',
    symbol: 'DOGE',
    icon: 'Ð',
    color: '#C2A633',
    decimals: 8,
  },
  [CryptoType.BNB]: {
    name: 'Binance Coin',
    symbol: 'BNB',
    icon: '◆',
    color: '#F3BA2F',
    decimals: 18,
  },
  [CryptoType.SOL]: {
    name: 'Solana',
    symbol: 'SOL',
    icon: '◎',
    color: '#9945FF',
    decimals: 9,
  },
};

@Entity('wallets')
@Unique(['userId', 'cryptoType'])
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: CryptoType,
  })
  cryptoType: CryptoType;

  @Column({ type: 'decimal', precision: 24, scale: 8, default: 0 })
  balance: number;

  @Column({ type: 'decimal', precision: 24, scale: 8, default: 0 })
  pendingBalance: number;

  @Column({ type: 'varchar', nullable: true })
  walletAddress: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
