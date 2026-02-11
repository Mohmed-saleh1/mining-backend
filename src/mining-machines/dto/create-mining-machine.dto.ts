import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MachineType, MachineStatus } from '../entities/mining-machine.entity';

export class CreateMiningMachineDto {
  @ApiProperty({ example: 'Antminer S19 Pro' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example:
      'High-performance Bitcoin mining machine with excellent efficiency',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({ enum: MachineType, default: MachineType.ASIC })
  @IsEnum(MachineType)
  @IsOptional()
  type?: MachineType;

  @ApiPropertyOptional({ example: 'Bitmain' })
  @IsString()
  @IsOptional()
  manufacturer?: string;

  @ApiPropertyOptional({ example: 'S19 Pro' })
  @IsString()
  @IsOptional()
  model?: string;

  // Specifications
  @ApiPropertyOptional({ example: 110 })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hashRate?: number;

  @ApiPropertyOptional({ example: 'TH/s' })
  @IsString()
  @IsOptional()
  hashRateUnit?: string;

  @ApiPropertyOptional({ example: 3250 })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  powerConsumption?: number;

  @ApiPropertyOptional({ example: 'SHA-256' })
  @IsString()
  @IsOptional()
  algorithm?: string;

  @ApiPropertyOptional({ example: 'BTC' })
  @IsString()
  @IsOptional()
  miningCoin?: string;

  @ApiPropertyOptional({ example: 29.5 })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  efficiency?: number;

  // Pricing
  @ApiProperty({ example: 120 })
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? 0 : Number(value)))
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerDay: number;

  @ApiProperty({ example: 750 })
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? 0 : Number(value)))
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerWeek: number;

  @ApiProperty({ example: 2800 })
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? 0 : Number(value)))
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerMonth: number;

  // Profit Rates
  @ApiProperty({ example: 0.45 })
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? 0 : Number(value)))
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  profitPerHour: number;

  @ApiProperty({ example: 10.8 })
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? 0 : Number(value)))
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  profitPerDay: number;

  @ApiProperty({ example: 75.6 })
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? 0 : Number(value)))
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  profitPerWeek: number;

  @ApiProperty({ example: 324 })
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? 0 : Number(value)))
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  profitPerMonth: number;

  // Status and availability
  @ApiPropertyOptional({
    enum: MachineStatus,
    default: MachineStatus.AVAILABLE,
  })
  @IsEnum(MachineStatus)
  @IsOptional()
  status?: MachineStatus;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  totalUnits?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;
}
