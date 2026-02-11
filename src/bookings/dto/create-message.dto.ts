import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../entities/booking-message.entity';

export class CreateMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ enum: MessageType, description: 'Message type' })
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;
}
