import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MachineStatus {
  AVAILABLE = 'available',
  RENTED = 'rented',
  MAINTENANCE = 'maintenance',
  INACTIVE = 'inactive',
}

export enum MachineType {
  ASIC = 'asic',
  GPU = 'gpu',
}

@Entity('mining_machines')
export class MiningMachine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  image: string;

  @Column({
    type: 'enum',
    enum: MachineType,
    default: MachineType.ASIC,
  })
  type: MachineType;

  @Column({ nullable: true })
  manufacturer: string;

  @Column({ nullable: true })
  model: string;

  // Specifications
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  hashRate: number;

  @Column({ nullable: true })
  hashRateUnit: string; // TH/s, GH/s, MH/s

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  powerConsumption: number; // in Watts

  @Column({ nullable: true })
  algorithm: string; // SHA-256, Scrypt, Ethash, etc.

  @Column({ nullable: true })
  miningCoin: string; // BTC, ETH, LTC, etc.

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  efficiency: number; // J/TH

  // Pricing - Rental costs
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pricePerHour: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pricePerDay: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pricePerWeek: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pricePerMonth: number;

  // Profit Rates - Expected earnings
  @Column({ type: 'decimal', precision: 10, scale: 4 })
  profitPerHour: number;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  profitPerDay: number;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  profitPerWeek: number;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  profitPerMonth: number;

  // Status and availability
  @Column({
    type: 'enum',
    enum: MachineStatus,
    default: MachineStatus.AVAILABLE,
  })
  status: MachineStatus;

  @Column({ type: 'int', default: 1 })
  totalUnits: number;

  @Column({ type: 'int', default: 0 })
  rentedUnits: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual getter for available units
  get availableUnits(): number {
    return this.totalUnits - this.rentedUnits;
  }
}
