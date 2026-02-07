import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLegalDocumentDto {
  @ApiPropertyOptional({ description: 'Content in English' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'Content in Arabic' })
  @IsString()
  @IsOptional()
  contentAr?: string;
}
