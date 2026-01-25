import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Service } from './s3.service';

@Injectable()
export class UploadService {
  constructor(private readonly s3Service: S3Service) {}

  // Allowed image mime types
  private readonly allowedImageMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];

  // Max file size: 5MB
  private readonly maxFileSize = 5 * 1024 * 1024;

  /**
   * Validate image file
   */
  validateImageFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!this.allowedImageMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException({
        message: 'Invalid file type',
        errorCode: 'FILE_001',
        errorDescription: `Only image files are allowed. Accepted formats: ${this.allowedImageMimeTypes.join(', ')}`,
      });
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException({
        message: 'File too large',
        errorCode: 'FILE_002',
        errorDescription: `File size must not exceed ${this.maxFileSize / 1024 / 1024}MB`,
      });
    }
  }

  /**
   * Validate multiple image files
   */
  validateImageFiles(files: Express.Multer.File[]): void {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    files.forEach((file, index) => {
      try {
        this.validateImageFile(file);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Validation failed';
        throw new BadRequestException(`File ${index + 1}: ${message}`);
      }
    });
  }

  /**
   * Upload single image to S3
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'destinations',
  ): Promise<string> {
    this.validateImageFile(file);
    const result = await this.s3Service.uploadFile(file, folder);
    return result.url;
  }

  /**
   * Upload multiple images to S3
   */
  async uploadImages(
    files: Express.Multer.File[],
    folder: string = 'destinations',
  ): Promise<string[]> {
    this.validateImageFiles(files);
    const results = await this.s3Service.uploadFiles(files, folder);
    return results.map((result) => result.url);
  }

  /**
   * Delete image from S3 by URL
   */
  async deleteImageByUrl(url: string): Promise<void> {
    if (!this.s3Service.isS3Url(url)) {
      return;
    }

    const key = this.s3Service.extractKeyFromUrl(url);
    if (key) {
      await this.s3Service.deleteFile(key);
    }
  }

  /**
   * Delete multiple images from S3 by URLs
   */
  async deleteImagesByUrls(urls: string[]): Promise<void> {
    const s3Urls = urls.filter((url) => this.s3Service.isS3Url(url));
    const keys = s3Urls
      .map((url) => this.s3Service.extractKeyFromUrl(url))
      .filter((key): key is string => key !== null);

    if (keys.length > 0) {
      await this.s3Service.deleteFiles(keys);
    }
  }
}
