import { IsNotEmpty, IsUUID, IsEnum, IsInt, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RentalDuration } from '../entities/booking.entity';

export class CreateBookingDto {
  @ApiProperty({ description: 'Machine ID to book' })
  @IsNotEmpty()
  @IsUUID()
  machineId: string;

  @ApiProperty({ enum: RentalDuration, description: 'Rental duration type' })
  @IsEnum(RentalDuration)
  rentalDuration: RentalDuration;

  @ApiProperty({ description: 'Number of units to rent', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Additional notes from user' })
  @IsOptional()
  @IsString()
  userNotes?: string;
}
