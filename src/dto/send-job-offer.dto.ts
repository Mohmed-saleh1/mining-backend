import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendJobOfferDto {
  @ApiProperty({
    description: 'Recipient email address to send the job offer to',
    example: 'candidate@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
