import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseDto<T> {
  @ApiProperty({ description: 'Success flag' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Response data', required: false })
  data?: T;

  @ApiProperty({ description: 'Error code', required: false })
  errorCode?: string;

  @ApiProperty({ description: 'Error description', required: false })
  errorDescription?: string;

  @ApiProperty({ description: 'Timestamp' })
  timestamp: string;

  constructor(
    success: boolean,
    message: string,
    data?: T,
    errorCode?: string,
    errorDescription?: string,
  ) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.errorCode = errorCode;
    this.errorDescription = errorDescription;
    this.timestamp = new Date().toISOString();
  }

  static success<T>(message: string, data?: T): BaseResponseDto<T> {
    return new BaseResponseDto<T>(true, message, data);
  }

  static error<T>(
    message: string,
    errorCode: string,
    errorDescription: string,
  ): BaseResponseDto<T> {
    return new BaseResponseDto<T>(
      false,
      message,
      undefined,
      errorCode,
      errorDescription,
    );
  }
}
