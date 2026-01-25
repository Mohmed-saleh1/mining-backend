import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyResetTokenDto {
  @ApiProperty({
    description: 'Password reset token',
    example: 'abc123def456...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
