import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactUsController } from './contact-us.controller';
import { ContactUsService } from './contact-us.service';
import { ContactSubmission } from './entities/contact-us.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContactSubmission])],
  controllers: [ContactUsController],
  providers: [ContactUsService],
  exports: [ContactUsService],
})
export class ContactUsModule {}
