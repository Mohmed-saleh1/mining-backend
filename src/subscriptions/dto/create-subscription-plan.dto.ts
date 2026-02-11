import {
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
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

  @ApiPropertyOptional({ 
    example: 100.0, 
    description: 'Price in USD (auto-calculated if not provided, based on machine pricing and number)' 
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Number of duration units (e.g., 2 for 2 weeks). Used to calculate price if price not provided. Default: 1' 
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  number?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Quantity of machines',
    default: 1,
  })
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
