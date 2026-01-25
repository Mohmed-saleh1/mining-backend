import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestUser } from '../interfaces/jwt-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: RequestUser }>();
    const user: RequestUser = request.user;

    const hasRole = requiredRoles.some((role) => user.role === String(role));

    if (!hasRole) {
      throw new ForbiddenException({
        message: 'Forbidden',
        errorCode: 'AUTH_004',
        errorDescription: 'You do not have permission to access this resource',
      });
    }

    return true;
  }
}
