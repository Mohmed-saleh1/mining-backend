import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION') ?? 'us-east-1';
    this.bucketName =
      this.configService.get<string>('AWS_S3_BUCKET') ??
      'tourism-company-uploads';
    this.publicUrl =
      this.configService.get<string>('AWS_S3_PUBLIC_URL') ??
      `https://${this.bucketName}.s3.amazonaws.com`;

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey:
          this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });

    this.logger.log(`S3 Service initialized for bucket: ${this.bucketName}`);
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ): Promise<{ url: string; key: string }> {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read', // Make file publicly accessible
    });

    try {
      await this.s3Client.send(command);
      const url = `${this.publicUrl}/${fileName}`;

      this.logger.log(`File uploaded successfully: ${fileName}`);

      return {
        url,
        key: fileName,
      };
    } catch (error) {
      this.logger.error(`Error uploading file to S3: ${error}`);
      throw new Error(`Failed to upload file to S3: ${error}`);
    }
  }

  /**
   * Upload multiple files to S3
   */
  async uploadFiles(
    files: Express.Multer.File[],
    folder: string = 'uploads',
  ): Promise<Array<{ url: string; key: string }>> {
    const uploadPromises = files.map((file) => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting file from S3: ${error}`);
      throw new Error(`Failed to delete file from S3: ${error}`);
    }
  }

  /**
   * Delete multiple files from S3
   */
  async deleteFiles(keys: string[]): Promise<void> {
    const deletePromises = keys.map((key) => this.deleteFile(key));
    await Promise.all(deletePromises);
  }

  /**
   * Get a presigned URL for a private file
   */
  async getPresignedUrl(
    key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      this.logger.error(`Error generating presigned URL: ${error}`);
      throw new Error(`Failed to generate presigned URL: ${error}`);
    }
  }

  /**
   * Extract S3 key from URL
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      // Handle both formats:
      // https://bucket.s3.amazonaws.com/folder/file.jpg
      // https://bucket.s3.region.amazonaws.com/folder/file.jpg
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      // Remove leading slash
      return pathname.startsWith('/') ? pathname.slice(1) : pathname;
    } catch {
      this.logger.error(`Invalid URL format: ${url}`);
      return null;
    }
  }

  /**
   * Check if URL is from our S3 bucket
   */
  isS3Url(url: string): boolean {
    return url.includes(this.bucketName) || url.startsWith(this.publicUrl);
  }
}
