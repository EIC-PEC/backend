import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { CircuitBreaker } from '../common/resilience/circuit-breaker';

export interface PassEmailPayload {
  to: string;
  recipientName: string;
  passId: string;
  passType: string;
  qrDataUrl: string;
  college?: string;
  amountPaid?: number;
}

export interface PasswordResetEmailPayload {
  to: string;
  recipientName: string;
  resetUrl: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null = null;
  private readonly fromEmail: string;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.fromEmail =
      this.config.get<string>('MAIL_FROM') || 'PEC E-Summit 2026 <no-reply@esummit.pec.ac.in>';

    this.circuitBreaker = new CircuitBreaker({
      serviceName: 'ResendEmail',
      failureThreshold: 5,
      resetTimeoutMs: 30000,
    });

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email provider initialized with CircuitBreaker.');
    } else {
      this.logger.warn(
        'RESEND_API_KEY not configured. Outgoing emails will be logged to console in development.',
      );
    }
  }

  /**
   * Sends branded digital ticket with embedded QR badge to the registered delegate.
   */
  async sendPassConfirmationEmail(payload: PassEmailPayload): Promise<boolean> {
    const { to, recipientName, passId, passType, qrDataUrl, college, amountPaid } = payload;

    const formattedPassType = passType.replace(/_/g, ' ');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0d0e; color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #141618; border: 1px solid #23272b; border-radius: 12px; overflow: hidden; }
    .header { background: #000000; padding: 30px 24px; text-align: center; border-bottom: 1px solid #23272b; }
    .header h1 { margin: 0; font-size: 22px; letter-spacing: 2px; color: #ffffff; text-transform: uppercase; }
    .header p { margin: 6px 0 0; color: #8892b0; font-size: 13px; letter-spacing: 1px; }
    .body-content { padding: 30px 24px; text-align: center; }
    .badge-card { background: #1c1f24; border: 1px solid #2e343d; border-radius: 8px; padding: 24px; margin: 20px 0; text-align: center; }
    .pass-id { font-family: monospace; font-size: 16px; font-weight: bold; color: #00e599; letter-spacing: 1px; margin: 8px 0; }
    .qr-container { background: #ffffff; padding: 12px; border-radius: 6px; display: inline-block; margin: 16px 0; }
    .qr-container img { display: block; width: 180px; height: 180px; }
    .meta-row { display: flex; justify-content: space-between; border-top: 1px solid #282d35; padding: 10px 0; font-size: 13px; text-align: left; }
    .meta-label { color: #8892b0; }
    .meta-value { color: #ffffff; font-weight: 600; text-align: right; }
    .footer { background: #0b0c0e; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1c1f24; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PEC E-Summit 2026</h1>
      <p>March 15-16, 2026 | Punjab Engineering College, Chandigarh</p>
    </div>
    <div class="body-content">
      <h2>Your Digital E-Badge is Ready</h2>
      <p style="color: #94a3b8; font-size: 14px;">Hello ${recipientName}, your registration is confirmed. Present the QR code below at the campus entry gate for instant check-in.</p>
      
      <div class="badge-card">
        <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Access Pass</div>
        <div class="pass-id">${passId}</div>
        
        <div class="qr-container">
          <img src="${qrDataUrl}" alt="Gate Entry QR Code" />
        </div>

        <div style="margin-top: 15px;">
          <div class="meta-row">
            <span class="meta-label">Pass Category</span>
            <span class="meta-value">${formattedPassType}</span>
          </div>
          ${college ? `<div class="meta-row"><span class="meta-label">Institution</span><span class="meta-value">${college}</span></div>` : ''}
          ${amountPaid !== undefined ? `<div class="meta-row"><span class="meta-label">Amount Paid</span><span class="meta-value">INR ${amountPaid.toFixed(2)}</span></div>` : ''}
        </div>
      </div>

      <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
        Please keep this email handy or save the QR code to your phone gallery for hassle-free venue entry.
      </p>
    </div>
    <div class="footer">
      Entrepreneurship & Incubation Cell (EIC), Punjab Engineering College, Sector 12, Chandigarh.<br/>
      Questions? Contact: eicpec@pec.edu.in
    </div>
  </div>
</body>
</html>
    `;

    if (this.resend) {
      return this.circuitBreaker.execute(
        async () => {
          const response = await this.resend!.emails.send({
            from: this.fromEmail,
            to: [to],
            subject: `Your E-Summit 2026 Digital Pass [${passId}]`,
            html: htmlContent,
          });

          if (response.error) {
            throw new Error(`Resend API error: ${response.error.message}`);
          }

          this.logger.log(`Pass confirmation email sent to ${to} (ID: ${response.data?.id})`);
          return true;
        },
        async () => {
          this.logger.warn(`[CIRCUIT FALLBACK] Logging email to console for ${to} [${passId}]`);
          return false;
        },
      );
    }

    // Development logging fallback
    this.logger.log(
      `[DEV EMAIL DISPATCH] To: ${to} | Pass ID: ${passId} | Type: ${passType} | Name: ${recipientName}`,
    );
    return true;
  }

  /**
   * Sends password reset verification link.
   */
  async sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<boolean> {
    const { to, recipientName, resetUrl } = payload;

    const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background: #0c0d0e; color: #fff; padding: 20px;">
  <div style="max-width: 500px; margin: 0 auto; background: #141618; border: 1px solid #23272b; border-radius: 8px; padding: 24px;">
    <h2>PEC E-Summit 2026 Password Reset</h2>
    <p>Hello ${recipientName},</p>
    <p>A request was received to reset your account password. Click the link below to set a new password. This link expires in 15 minutes.</p>
    <div style="margin: 25px 0;">
      <a href="${resetUrl}" style="background: #00e599; color: #000; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">Reset Password</a>
    </div>
    <p style="font-size: 12px; color: #64748b;">If you did not request this, you can safely ignore this email.</p>
  </div>
</body>
</html>
    `;

    if (this.resend) {
      return this.circuitBreaker.execute(
        async () => {
          const response = await this.resend!.emails.send({
            from: this.fromEmail,
            to: [to],
            subject: 'Reset your PEC E-Summit Account Password',
            html: htmlContent,
          });
          if (response.error) {
            throw new Error(`Resend API error: ${response.error.message}`);
          }
          return true;
        },
        async () => {
          this.logger.warn(`[CIRCUIT FALLBACK] Password reset email fallback for ${to}`);
          return false;
        },
      );
    }

    this.logger.log(`[DEV EMAIL DISPATCH] Password reset for ${to} -> ${resetUrl}`);
    return true;
  }
}
