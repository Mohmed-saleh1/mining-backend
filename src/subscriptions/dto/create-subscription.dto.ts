import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'Subscription Plan ID' })
  @IsNotEmpty()
  @IsUUID()
  planId: string;
}

