import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContactSubject } from '../entities/contact-us.entity';

export class CreateContactSubmissionDto {
  @ApiProperty({
    description: 'First name of the contact',
    example: 'John',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({
    description: 'Last name of the contact',
    example: 'Doe',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+1234567890',
    required: false,
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({
    description: 'Subject of the contact',
    enum: ContactSubject,
    example: ContactSubject.GENERAL,
  })
  @IsEnum(ContactSubject)
  subject: ContactSubject;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, I would like to inquire about your services.',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  message: string;
}
