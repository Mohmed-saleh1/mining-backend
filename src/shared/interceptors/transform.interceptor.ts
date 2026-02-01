import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseResponseDto } from '../dto/base-response.dto';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  BaseResponseDto<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<BaseResponseDto<T>> {
    return next.handle().pipe(
      map((data: T | BaseResponseDto<T>) => {
        // If data is already a BaseResponseDto, return as is
        if (data instanceof BaseResponseDto) {
          return data;
        }

        // Transform data into BaseResponseDto
        return BaseResponseDto.success('Request successful', data);
      }),
    );
  }
}
