import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContactStatus } from '../entities/contact-us.entity';

export class UpdateContactSubmissionDto {
  @ApiProperty({
    description: 'Status of the contact submission',
    enum: ContactStatus,
    required: false,
  })
  @IsEnum(ContactStatus)
  @IsOptional()
  status?: ContactStatus;

  @ApiProperty({
    description: 'Admin notes about this submission',
    required: false,
  })
  @IsString()
  @IsOptional()
  adminNotes?: string;

  @ApiProperty({
    description: 'ID of admin assigned to handle this submission',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @ApiProperty({
    description: 'Whether the submission has been read',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;
}
