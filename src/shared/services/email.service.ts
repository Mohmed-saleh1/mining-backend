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
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${token}`;

    const content = `
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding-bottom: 30px;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, rgba(212, 166, 80, 0.2) 0%, rgba(244, 208, 63, 0.1) 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #d4a650;">
              <span style="font-size: 40px;">✉️</span>
            </div>
          </td>
        </tr>
        <tr>
          <td align="center">
            <h1 style="margin: 0 0 10px 0; color: #ffffff; font-size: 26px; font-weight: 700;">Verify Your Email</h1>
            <p style="margin: 0 0 30px 0; color: #a0a0a0; font-size: 16px; line-height: 1.6;">
              Welcome to X-BIN! Please verify your email address to start earning crypto profits daily.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 20px 0;">
            <a href="${verificationUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #d4a650 0%, #f4d03f 100%); color: #0a0a0f; text-decoration: none; font-size: 16px; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 15px rgba(212, 166, 80, 0.4);">
              Verify Email Address
            </a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top: 30px;">
            <p style="margin: 0; color: #6b6b7b; font-size: 13px;">
              Or copy and paste this link in your browser:
            </p>
            <p style="margin: 10px 0 0 0; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; border: 1px solid #2a2a3e;">
              <a href="${verificationUrl}" style="color: #d4a650; text-decoration: none; font-size: 12px; word-break: break-all;">${verificationUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top: 30px;">
            <table role="presentation" style="border-collapse: collapse; background: rgba(212, 166, 80, 0.1); border-radius: 8px; border: 1px solid rgba(212, 166, 80, 0.2);">
              <tr>
                <td style="padding: 15px 20px;">
                  <p style="margin: 0; color: #d4a650; font-size: 13px;">
                    ⏰ This link will expire in <strong>24 hours</strong>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    const html = this.getBaseEmailTemplate(content);

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: '✉️ Verify Your Email - X-BIN',
        html,
      });

      if (error) {
        this.logger.error(
          `Failed to send verification email: ${error.message}`,
        );
        throw new Error(`Failed to send email: ${error.message}`);
      }

      this.logger.log(`Verification email sent to ${email}, ID: ${data?.id}`);
    } catch (error) {
      this.logger.error(`Error sending verification email: ${error}`);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    const content = `
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding-bottom: 30px;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, rgba(212, 166, 80, 0.2) 0%, rgba(244, 208, 63, 0.1) 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #d4a650;">
              <span style="font-size: 40px;">🔐</span>
            </div>
          </td>
        </tr>
        <tr>
          <td align="center">
            <h1 style="margin: 0 0 10px 0; color: #ffffff; font-size: 26px; font-weight: 700;">Reset Your Password</h1>
            <p style="margin: 0 0 30px 0; color: #a0a0a0; font-size: 16px; line-height: 1.6;">
              We received a request to reset your password. Click the button below to create a new password for your X-BIN account.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 20px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #d4a650 0%, #f4d03f 100%); color: #0a0a0f; text-decoration: none; font-size: 16px; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 15px rgba(212, 166, 80, 0.4);">
              Reset Password
            </a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top: 30px;">
            <p style="margin: 0; color: #6b6b7b; font-size: 13px;">
              Or copy and paste this link in your browser:
            </p>
            <p style="margin: 10px 0 0 0; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; border: 1px solid #2a2a3e;">
              <a href="${resetUrl}" style="color: #d4a650; text-decoration: none; font-size: 12px; word-break: break-all;">${resetUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top: 30px;">
            <table role="presentation" style="border-collapse: collapse; background: rgba(212, 166, 80, 0.1); border-radius: 8px; border: 1px solid rgba(212, 166, 80, 0.2);">
              <tr>
                <td style="padding: 15px 20px;">
                  <p style="margin: 0; color: #d4a650; font-size: 13px;">
                    ⏰ This link will expire in <strong>1 hour</strong>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top: 25px;">
            <table role="presentation" style="border-collapse: collapse; background: rgba(255, 100, 100, 0.1); border-radius: 8px; border: 1px solid rgba(255, 100, 100, 0.2);">
              <tr>
                <td style="padding: 15px 20px;">
                  <p style="margin: 0; color: #ff9999; font-size: 13px;">
                    🔒 If you didn't request this, please ignore this email.<br>
                    <span style="font-size: 12px; color: #997777;">Your account remains secure.</span>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    const html = this.getBaseEmailTemplate(content);

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: '🔐 Reset Your Password - X-BIN',
        html,
      });

      if (error) {
        this.logger.error(
          `Failed to send password reset email: ${error.message}`,
        );
        throw new Error(`Failed to send email: ${error.message}`);
      }

      this.logger.log(`Password reset email sent to ${email}, ID: ${data?.id}`);
    } catch (error) {
      this.logger.error(`Error sending password reset email: ${error}`);
      throw error;
    }
  }
}
