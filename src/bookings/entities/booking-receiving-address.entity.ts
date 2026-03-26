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

@Entity('booking_receiving_addresses')
export class BookingReceivingAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  networkType: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cryptoName: string | null;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'text', nullable: true })
  qrImageUrl: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
