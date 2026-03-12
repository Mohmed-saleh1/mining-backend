import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly frontendUrl: string;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('EMAIL_API');
    this.resend = new Resend(apiKey);
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    this.fromEmail =
      this.configService.get<string>('EMAIL_FROM') ||
      'x-bin <noreply@x-bin.com>';
  }

  private getBaseEmailTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>X-BIN</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0f;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(180deg, #0a0a0f 0%, #12121a 100%);">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 30px 40px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px 16px 0 0; border-bottom: 2px solid #d4a650;">
              <table role="presentation" style="border-collapse: collapse;">
                <tr>
                  <td style="padding-right: 12px;">
                    <div style="width: 45px; height: 45px; background: linear-gradient(135deg, #d4a650 0%, #f4d03f 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                      <span style="color: #0a0a0f; font-size: 24px; font-weight: bold;">₿</span>
                    </div>
                  </td>
                  <td>
                    <span style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: 2px;">X-BIN</span>
                  </td>
                </tr>
              </table>
              <p style="margin: 15px 0 0 0; color: #a0a0a0; font-size: 14px;">Invest & Earn Crypto Profits Daily</p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px; background: linear-gradient(180deg, #16213e 0%, #1a1a2e 100%);">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background: #0d0d14; border-radius: 0 0 16px 16px; border-top: 1px solid #2a2a3e;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 15px 0; color: #d4a650; font-size: 14px; font-weight: 600;">Secure Your Financial Future</p>
                    <p style="margin: 0 0 20px 0; color: #6b6b7b; font-size: 12px;">
                      This email was sent by X-BIN Mining Platform.<br>
                      If you didn't request this, please ignore this email.
                    </p>
                    <table role="presentation" style="border-collapse: collapse;">
                      <tr>
                        <td style="padding: 0 10px;">
                          <a href="#" style="color: #a0a0a0; text-decoration: none; font-size: 12px;">Dashboard</a>
                        </td>
                        <td style="color: #3a3a4a;">|</td>
                        <td style="padding: 0 10px;">
                          <a href="#" style="color: #a0a0a0; text-decoration: none; font-size: 12px;">Packages</a>
                        </td>
                        <td style="color: #3a3a4a;">|</td>
                        <td style="padding: 0 10px;">
                          <a href="#" style="color: #a0a0a0; text-decoration: none; font-size: 12px;">Support</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 20px 0 0 0; color: #4a4a5a; font-size: 11px;">
                      © ${new Date().getFullYear()} X-BIN. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  async sendEmailVerification(email: string, token: string): Promise<void> {
    const base = this.frontendUrl.replace(/\/$/, '');
    const verificationUrl = `${base}/en/verify-email?token=${encodeURIComponent(token)}`;

    const content = `
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding-bottom: 40px;">
            <div style="width: 100px; height: 100px; background: linear-gradient(135deg, rgba(212, 166, 80, 0.25) 0%, rgba(244, 208, 63, 0.15) 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid #d4a650; box-shadow: 0 8px 25px rgba(212, 166, 80, 0.3);">
              <span style="font-size: 48px;">✉️</span>
            </div>
          </td>
        </tr>
        <tr>
          <td align="center">
            <h1 style="margin: 0 0 15px 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Verify Your Email</h1>
            <p style="margin: 0 0 40px 0; color: #b0b0c0; font-size: 17px; line-height: 1.7; max-width: 480px;">
              Welcome to <span style="color: #d4a650; font-weight: 600;">X-BIN</span>! Please verify your email address to activate your account and start earning crypto profits daily.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 30px 0 40px 0;">
            <a href="${verificationUrl}" style="display: inline-block; padding: 18px 48px; background: linear-gradient(135deg, #d4a650 0%, #f4d03f 100%); color: #0a0a0f; text-decoration: none; font-size: 17px; font-weight: 700; border-radius: 12px; box-shadow: 0 6px 20px rgba(212, 166, 80, 0.5), 0 2px 8px rgba(212, 166, 80, 0.3); transition: all 0.3s ease; letter-spacing: 0.3px;">
              Verify Email Address →
            </a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top: 20px;">
            <table role="presentation" style="border-collapse: collapse; background: linear-gradient(135deg, rgba(212, 166, 80, 0.12) 0%, rgba(244, 208, 63, 0.08) 100%); border-radius: 12px; border: 1px solid rgba(212, 166, 80, 0.25); box-shadow: 0 4px 12px rgba(212, 166, 80, 0.15);">
              <tr>
                <td style="padding: 18px 24px;">
                  <p style="margin: 0; color: #d4a650; font-size: 14px; font-weight: 500;">
                    ⏰ <strong>Important:</strong> This verification link will expire in <strong style="color: #f4d03f;">24 hours</strong>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top: 35px;">
            <p style="margin: 0; color: #6b6b7b; font-size: 13px; line-height: 1.6;">
              If the button doesn't work, please contact our support team for assistance.
            </p>
          </td>
        </tr>
      </table>
    `;

    const html = this.getBaseEmailTemplate(content);

    try {
      this.logger.debug(
        `Attempting to send verification email to ${email} from ${this.fromEmail}`,
      );

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: '✉️ Verify Your Email - X-BIN',
        html,
      });

      if (error) {
        this.logger.error(
          `Failed to send verification email to ${email}: ${JSON.stringify(error)}`,
        );
        throw new Error(
          `Failed to send email: ${error.message || JSON.stringify(error)}`,
        );
      }

      this.logger.log(
        `Verification email sent to ${email}, ID: ${data?.id}. ` +
          `Response: ${JSON.stringify(data)}`,
      );

      // Log warning if domain might not be verified
      if (data && !data.id) {
        this.logger.warn(
          `Email sent but no ID returned. This might indicate domain verification issues. ` +
            `Check Resend dashboard to verify domain: ${this.fromEmail.split('@')[1]}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error sending verification email to ${email}: ${error}`,
      );
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    const content = `
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding-bottom: 40px;">
            <div style="width: 100px; height: 100px; background: linear-gradient(135deg, rgba(212, 166, 80, 0.25) 0%, rgba(244, 208, 63, 0.15) 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid #d4a650; box-shadow: 0 8px 25px rgba(212, 166, 80, 0.3);">
              <span style="font-size: 48px;">🔐</span>
            </div>
          </td>
        </tr>
        <tr>
          <td align="center">
            <h1 style="margin: 0 0 15px 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Reset Your Password</h1>
            <p style="margin: 0 0 40px 0; color: #b0b0c0; font-size: 17px; line-height: 1.7; max-width: 480px;">
              We received a request to reset your password for your <span style="color: #d4a650; font-weight: 600;">X-BIN</span> account. Click the button below to create a new secure password.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 30px 0 40px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 18px 48px; background: linear-gradient(135deg, #d4a650 0%, #f4d03f 100%); color: #0a0a0f; text-decoration: none; font-size: 17px; font-weight: 700; border-radius: 12px; box-shadow: 0 6px 20px rgba(212, 166, 80, 0.5), 0 2px 8px rgba(212, 166, 80, 0.3); transition: all 0.3s ease; letter-spacing: 0.3px;">
              Reset Password →
            </a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top: 20px;">
            <table role="presentation" style="border-collapse: collapse; background: linear-gradient(135deg, rgba(212, 166, 80, 0.12) 0%, rgba(244, 208, 63, 0.08) 100%); border-radius: 12px; border: 1px solid rgba(212, 166, 80, 0.25); box-shadow: 0 4px 12px rgba(212, 166, 80, 0.15);">
              <tr>
                <td style="padding: 18px 24px;">
                  <p style="margin: 0; color: #d4a650; font-size: 14px; font-weight: 500;">
                    ⏰ <strong>Important:</strong> This reset link will expire in <strong style="color: #f4d03f;">1 hour</strong>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top: 25px;">
            <table role="presentation" style="border-collapse: collapse; background: linear-gradient(135deg, rgba(255, 100, 100, 0.12) 0%, rgba(255, 120, 120, 0.08) 100%); border-radius: 12px; border: 1px solid rgba(255, 100, 100, 0.25); box-shadow: 0 4px 12px rgba(255, 100, 100, 0.15);">
              <tr>
                <td style="padding: 18px 24px;">
                  <p style="margin: 0; color: #ff9999; font-size: 14px; font-weight: 500;">
                    🔒 <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email.<br>
                    <span style="font-size: 13px; color: #cc8888; font-weight: 400;">Your account remains secure and no changes have been made.</span>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top: 35px;">
            <p style="margin: 0; color: #6b6b7b; font-size: 13px; line-height: 1.6;">
              If the button doesn't work, please contact our support team for assistance.
            </p>
          </td>
        </tr>
      </table>
    `;

    const html = this.getBaseEmailTemplate(content);

    try {
      this.logger.debug(
        `Attempting to send password reset email to ${email} from ${this.fromEmail}`,
      );

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: '🔐 Reset Your Password - X-BIN',
        html,
      });

      if (error) {
        this.logger.error(
          `Failed to send password reset email to ${email}: ${JSON.stringify(error)}`,
        );
        throw new Error(
          `Failed to send email: ${error.message || JSON.stringify(error)}`,
        );
      }

      this.logger.log(
        `Password reset email sent to ${email}, ID: ${data?.id}. ` +
          `Response: ${JSON.stringify(data)}`,
      );

      // Log warning if domain might not be verified
      if (data && !data.id) {
        this.logger.warn(
          `Email sent but no ID returned. This might indicate domain verification issues. ` +
            `Check Resend dashboard to verify domain: ${this.fromEmail.split('@')[1]}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error sending password reset email to ${email}: ${error}`,
      );
      throw error;
    }
  }
}
