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
import { SubscriptionPlan } from './subscription-plan.entity';
import { MiningMachine } from '../../mining-machines/entities/mining-machine.entity';

export enum SubscriptionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  PAYTABS = 'paytabs',
  BINANCE = 'binance',
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'plan_id', nullable: true })
  planId: string;

  @ManyToOne(() => SubscriptionPlan, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @Column({
    type: 'enum',
    enum: ['day', 'week', 'month', 'year'],
    nullable: true,
  })
  duration: string;

  @Column({ type: 'int', nullable: true })
  durationNumber: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'machine_id' })
  machineId: string;

  @ManyToOne(() => MiningMachine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: MiningMachine;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.PENDING,
  })
  status: SubscriptionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.PAYTABS,
  })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  paytabsTransactionId: string;

  @Column({ nullable: true })
  paytabsPaymentId: string;

  @Column({ nullable: true })
  binanceOrderId: string;

  @Column({ nullable: true })
  binancePrepayId: string;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
