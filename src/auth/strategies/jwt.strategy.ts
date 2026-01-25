import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload, RequestUser } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key',
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.usersService.findOne(payload.sub);

    if (!user) {
      throw new UnauthorizedException({
        message: 'User not found',
        errorCode: 'AUTH_004',
        errorDescription: 'The user associated with this token does not exist',
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException({
        message: 'Account is deactivated',
        errorCode: 'AUTH_002',
        errorDescription:
          'Your account has been deactivated. Please contact support.',
      });
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
