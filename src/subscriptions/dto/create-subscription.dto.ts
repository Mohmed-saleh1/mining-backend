import {
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../entities/subscription.entity';
import { PlanDuration } from '../entities/subscription-plan.entity';

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'Machine ID to subscribe to' })
  @IsNotEmpty()
  @IsUUID()
  machineId: string;

  @ApiProperty({
    description: 'Duration type: day, week, or month',
    enum: PlanDuration,
  })
  @IsEnum(PlanDuration)
  duration: PlanDuration;

  @ApiProperty({
    description: 'Number of duration units (e.g., 2 for 2 weeks)',
    example: 1,
  })
  @IsNumber()
  @Min(1)
  number: number;

  @ApiPropertyOptional({
    description: 'Number of machine units',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Payment method: paytabs (card) or binance (crypto)',
    enum: PaymentMethod,
    default: PaymentMethod.PAYTABS,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
