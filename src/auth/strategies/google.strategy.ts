import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { User } from '../../users/entities/user.entity';

export interface GoogleProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: {
      id: string;
      emails?: Array<{ value: string; verified?: boolean }>;
      name?: { givenName?: string; familyName?: string };
      photos?: Array<{ value: string }>;
    },
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('Email not provided by Google'), undefined);
    }

    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      email,
      firstName: profile.name?.givenName || 'User',
      lastName: profile.name?.familyName || '',
      avatar: profile.photos?.[0]?.value,
    };

    try {
      const user = await this.usersService.createOrUpdateFromGoogle(googleProfile);
      done(null, user);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
