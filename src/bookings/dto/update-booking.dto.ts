import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '../entities/booking.entity';

export class UpdateBookingDto {
  @ApiPropertyOptional({ enum: BookingStatus, description: 'Booking status' })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ description: 'Admin notes' })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class SendPaymentAddressDto {
  @ApiPropertyOptional({ description: 'Payment receiving address' })
  @IsString()
  paymentAddress: string;
}

export class MarkPaymentSentDto {
  @ApiPropertyOptional({ description: 'Transaction hash (optional)' })
  @IsOptional()
  @IsString()
  transactionHash?: string;
}
