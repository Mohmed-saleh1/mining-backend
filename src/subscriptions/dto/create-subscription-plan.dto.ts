import { IsNotEmpty, IsUUID, IsEnum, IsNumber, Min, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanDuration } from '../entities/subscription-plan.entity';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ description: 'Machine ID for this plan' })
  @IsNotEmpty()
  @IsUUID()
  machineId: string;

  @ApiProperty({ example: 'Monthly Plan' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Best value for monthly mining' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PlanDuration, description: 'Plan duration' })
  @IsEnum(PlanDuration)
  duration: PlanDuration;

  @ApiProperty({ example: 100.0, description: 'Price in USD' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 1, description: 'Quantity of machines', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

