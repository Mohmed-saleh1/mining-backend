import { ApiProperty } from '@nestjs/swagger';
import {
  ContactSubmission,
  ContactStatus,
  ContactSubject,
} from '../entities/contact-us.entity';

export class ContactSubmissionResponseDto implements ContactSubmission {
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @ApiProperty({ description: 'First name' })
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  lastName: string;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'Phone number', required: false })
  phone: string;

  @ApiProperty({ description: 'Subject', enum: ContactSubject })
  subject: ContactSubject;

  @ApiProperty({ description: 'Message content' })
  message: string;

  @ApiProperty({ description: 'Status', enum: ContactStatus })
  status: ContactStatus;

  @ApiProperty({ description: 'Admin notes', required: false })
  adminNotes: string;

  @ApiProperty({ description: 'Assigned admin ID', required: false })
  assignedToId: string;

  @ApiProperty({ description: 'Whether it has been read' })
  isRead: boolean;

  @ApiProperty({ description: 'IP address', required: false })
  ipAddress: string;

  @ApiProperty({ description: 'User agent', required: false })
  userAgent: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;
}
