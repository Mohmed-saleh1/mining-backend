import { Module, Global } from '@nestjs/common';
import { S3Service } from './services/s3.service';
import { UploadService } from './services/upload.service';
import { EmailService } from './services/email.service';

@Global()
@Module({
  providers: [S3Service, UploadService, EmailService],
  exports: [S3Service, UploadService, EmailService],
})
export class SharedModule {}
