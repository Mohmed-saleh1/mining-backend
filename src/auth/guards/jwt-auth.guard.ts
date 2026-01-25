import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: any, user: any): TUser {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException({
          message: 'Unauthorized',
          errorCode: 'AUTH_003',
          errorDescription: 'You must be logged in to access this resource',
        })
      );
    }
    return user as TUser;
  }
}
