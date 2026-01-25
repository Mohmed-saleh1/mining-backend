import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetTokenDto } from './dto/verify-reset-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { BaseResponseDto } from '../shared/dto/base-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RequestUser } from './interfaces/jwt-payload.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return BaseResponseDto.success('Login successful', result);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({
    status: 201,
    description: 'Registration successful',
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists',
  })
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    return BaseResponseDto.success('Registration successful', result);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'User data retrieved successfully',
  })
  async getMe(@Request() req: { user: RequestUser }) {
    const user = await this.authService.validateToken(req.user);
    return BaseResponseDto.success('User data retrieved successfully', user);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description: 'If the email exists, a password reset link has been sent',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.forgotPassword(forgotPasswordDto);
    return BaseResponseDto.success(
      'If the email exists, a password reset link has been sent to your email',
      null,
    );
  }

  @Post('verify-reset-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify password reset token' })
  @ApiResponse({
    status: 200,
    description: 'Token verification result',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
  })
  async verifyResetToken(@Body() verifyResetTokenDto: VerifyResetTokenDto) {
    const result = await this.authService.verifyResetToken(verifyResetTokenDto);
    return BaseResponseDto.success(
      result.valid
        ? 'Token is valid'
        : 'Token is invalid or expired',
      result,
    );
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({
    status: 200,
    description: 'Password has been reset successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired reset token',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetPasswordDto);
    return BaseResponseDto.success('Password has been reset successfully', null);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiResponse({
    status: 200,
    description: 'Email has been verified successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification token',
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    await this.authService.verifyEmail(verifyEmailDto);
    return BaseResponseDto.success('Email has been verified successfully', null);
  }

  @Post('resend-verification-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiResponse({
    status: 200,
    description: 'If the email exists and is not verified, a verification link has been sent',
  })
  @ApiResponse({
    status: 400,
    description: 'Email already verified',
  })
  async resendVerificationEmail(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.resendVerificationEmail(forgotPasswordDto.email);
    return BaseResponseDto.success(
      'If the email exists and is not verified, a verification link has been sent to your email',
      null,
    );
  }
}
