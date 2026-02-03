import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus, RentalDuration } from '../entities/booking.entity';
import { MessageType } from '../entities/booking-message.entity';

export class BookingUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;
}

export class BookingMachineDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  image?: string;

  @ApiProperty()
  miningCoin: string;
}

export class BookingMessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  bookingId: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty()
  sender: BookingUserDto;

  @ApiProperty()
  content: string;

  @ApiProperty({ enum: MessageType })
  messageType: MessageType;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty()
  isFromAdmin: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class BookingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  user: BookingUserDto;

  @ApiProperty()
  machineId: string;

  @ApiProperty()
  machine: BookingMachineDto;

  @ApiProperty({ enum: RentalDuration })
  rentalDuration: RentalDuration;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  totalPrice: number;

  @ApiProperty({ enum: BookingStatus })
  status: BookingStatus;

  @ApiPropertyOptional()
  paymentAddress?: string;

  @ApiPropertyOptional()
  transactionHash?: string;

  @ApiPropertyOptional()
  userNotes?: string;

  @ApiPropertyOptional()
  adminNotes?: string;

  @ApiPropertyOptional()
  paymentSentAt?: Date;

  @ApiPropertyOptional()
  approvedAt?: Date;

  @ApiPropertyOptional()
  rejectedAt?: Date;

  @ApiPropertyOptional()
  approvedById?: string;

  @ApiPropertyOptional()
  approvedBy?: BookingUserDto;

  @ApiProperty({ type: [BookingMessageResponseDto] })
  messages: BookingMessageResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class BookingStatisticsDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  pending: number;

  @ApiProperty()
  awaitingPayment: number;

  @ApiProperty()
  paymentSent: number;

  @ApiProperty()
  approved: number;

  @ApiProperty()
  rejected: number;

  @ApiProperty()
  cancelled: number;
}
