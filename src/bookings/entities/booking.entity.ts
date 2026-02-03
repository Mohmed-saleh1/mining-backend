import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MiningMachine } from '../../mining-machines/entities/mining-machine.entity';
import { BookingMessage } from './booking-message.entity';

export enum BookingStatus {
  PENDING = 'pending',
  AWAITING_PAYMENT = 'awaiting_payment',
  PAYMENT_SENT = 'payment_sent',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum RentalDuration {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'machine_id' })
  machineId: string;

  @ManyToOne(() => MiningMachine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: MiningMachine;

  @Column({
    type: 'enum',
    enum: RentalDuration,
    default: RentalDuration.DAY,
  })
  rentalDuration: RentalDuration;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({ type: 'text', nullable: true })
  paymentAddress: string;

  @Column({ type: 'text', nullable: true })
  transactionHash: string;

  @Column({ type: 'text', nullable: true })
  userNotes: string;

  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  @Column({ type: 'timestamp', nullable: true })
  paymentSentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt: Date;

  @Column({ nullable: true, name: 'approved_by_id' })
  approvedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: User;

  @OneToMany(() => BookingMessage, (message) => message.booking, {
    cascade: true,
  })
  messages: BookingMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
