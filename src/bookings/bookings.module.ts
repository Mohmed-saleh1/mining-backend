import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { Booking } from './entities/booking.entity';
import { BookingMessage } from './entities/booking-message.entity';
import { MiningMachine } from '../mining-machines/entities/mining-machine.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingMessage, MiningMachine]),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
