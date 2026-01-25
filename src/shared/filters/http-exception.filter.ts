import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseResponseDto } from '../dto/base-response.dto';

interface HttpExceptionResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  errorCode?: string;
  errorDescription?: string;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse() as HttpExceptionResponse;

    // Extract error details
    const errorMessage = Array.isArray(exceptionResponse.message)
      ? exceptionResponse.message.join(', ')
      : exceptionResponse.message || exception.message;

    const errorCode = exceptionResponse.errorCode || `ERR_${status}`;

    const errorDescription =
      exceptionResponse.errorDescription ||
      exceptionResponse.error ||
      this.getDefaultErrorDescription(status);

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - Error: ${errorMessage}`,
      exception.stack,
    );

    // Send response using BaseResponseDto
    const errorResponse = BaseResponseDto.error(
      errorMessage,
      errorCode,
      errorDescription,
    );

    response.status(status).json(errorResponse);
  }

  private getDefaultErrorDescription(status: HttpStatus): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request - The request was invalid or malformed';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized - Authentication is required';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden - You do not have permission to access this resource';
      case HttpStatus.NOT_FOUND:
        return 'Not Found - The requested resource was not found';
      case HttpStatus.CONFLICT:
        return 'Conflict - The request conflicts with existing data';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'Internal Server Error - An unexpected error occurred';
      default:
        return 'An error occurred while processing your request';
    }
  }
}
