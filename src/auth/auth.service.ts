import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { EmailService } from '../shared/services/email.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetTokenDto } from './dto/verify-reset-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UserResponseDto } from '../users/dto';
import { User } from '../users/entities/user.entity';
import { JwtPayload, RequestUser } from './interfaces/jwt-payload.interface';
import * as crypto from 'crypto';

export interface AuthResponse {
  user: UserResponseDto;
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await user.validatePassword(password);

    if (!isPasswordValid) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException({
        message: 'Account is deactivated',
        errorCode: 'AUTH_002',
        errorDescription:
          'Your account has been deactivated. Please contact support.',
      });
    }

    return user;
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        errorCode: 'AUTH_001',
        errorDescription: 'Email or password is incorrect',
      });
    }

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      user: UserResponseDto.fromEntity(user),
      accessToken,
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const user = await this.usersService.create(registerDto);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    await this.usersService.setEmailVerificationToken(
      user.id,
      verificationToken,
      expiresAt,
    );

    // Send verification email
    await this.emailService.sendEmailVerification(
      user.email,
      verificationToken,
    );

    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      user,
      accessToken,
    };
  }

  async validateToken(payload: RequestUser): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(payload.userId);
    return UserResponseDto.fromEntity(user);
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);

    // Don't reveal if user exists or not for security
    if (!user) {
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

    await this.usersService.setPasswordResetToken(
      user.id,
      resetToken,
      expiresAt,
    );

    // Send reset email
    await this.emailService.sendPasswordResetEmail(user.email, resetToken);
  }

  async verifyResetToken(
    verifyResetTokenDto: VerifyResetTokenDto,
  ): Promise<{ valid: boolean }> {
    const user = await this.usersService.findByPasswordResetToken(
      verifyResetTokenDto.token,
    );

    if (!user) {
      return { valid: false };
    }

    if (
      !user.passwordResetTokenExpires ||
      user.passwordResetTokenExpires < new Date()
    ) {
      return { valid: false };
    }

    return { valid: true };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const user = await this.usersService.findByPasswordResetToken(
      resetPasswordDto.token,
    );

    if (!user) {
      throw new BadRequestException({
        message: 'Invalid or expired reset token',
        errorCode: 'AUTH_003',
        errorDescription: 'The password reset token is invalid or has expired',
      });
    }

    if (
      !user.passwordResetTokenExpires ||
      user.passwordResetTokenExpires < new Date()
    ) {
      throw new BadRequestException({
        message: 'Reset token has expired',
        errorCode: 'AUTH_004',
        errorDescription:
          'The password reset token has expired. Please request a new one.',
      });
    }

    await this.usersService.resetPassword(
      user.id,
      resetPasswordDto.newPassword,
    );
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<void> {
    const user = await this.usersService.findByEmailVerificationToken(
      verifyEmailDto.token,
    );

    if (!user) {
      throw new BadRequestException({
        message: 'Invalid verification token',
        errorCode: 'AUTH_005',
        errorDescription: 'The email verification token is invalid',
      });
    }

    if (
      !user.emailVerificationTokenExpires ||
      user.emailVerificationTokenExpires < new Date()
    ) {
      throw new BadRequestException({
        message: 'Verification token has expired',
        errorCode: 'AUTH_006',
        errorDescription:
          'The email verification token has expired. Please request a new one.',
      });
    }

    await this.usersService.verifyEmail(user.id);
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    if (user.emailVerified) {
      throw new BadRequestException({
        message: 'Email already verified',
        errorCode: 'AUTH_007',
        errorDescription: 'This email address has already been verified',
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    await this.usersService.setEmailVerificationToken(
      user.id,
      verificationToken,
      expiresAt,
    );

    // Send verification email
    await this.emailService.sendEmailVerification(
      user.email,
      verificationToken,
    );
  }
}
