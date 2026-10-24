import nodemailer from 'nodemailer';
import axios from 'axios';

export interface EmailSendOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId: string;
  provider: 'resend' | 'brevo' | 'smtp' | 'sandbox';
  error?: string;
}

export interface IEmailProvider {
  name: 'resend' | 'brevo' | 'smtp' | 'sandbox';
  send(options: EmailSendOptions): Promise<EmailSendResult>;
}

/**
 * 1. Resend API Email Provider
 * Recommended transactional provider (https://resend.com)
 */
export class ResendEmailProvider implements IEmailProvider {
  public readonly name = 'resend';
  private apiKey: string;
  private fromAddress: string;

  constructor(apiKey: string, fromAddress?: string) {
    this.apiKey = apiKey;
    this.fromAddress = fromAddress || process.env.RESEND_FROM || process.env.EMAIL_FROM_ADDRESS || 'FoodBridge <notifications@foodbridge.org>';
  }

  async send(options: EmailSendOptions): Promise<EmailSendResult> {
    try {
      console.log(`[Resend Email] Sending email to ${options.to} (Subject: "${options.subject}")...`);
      const response = await axios.post(
        'https://api.resend.com/emails',
        {
          from: options.from || this.fromAddress,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const messageId = response.data.id || `resend_${Date.now()}`;
      console.log(`[Resend Email] Successfully sent! MessageId: ${messageId}`);
      return {
        success: true,
        messageId,
        provider: 'resend',
      };
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Resend transmission failed';
      console.error(`[Resend Email Error] Failed to send to ${options.to}:`, errorMsg);
      return {
        success: false,
        messageId: '',
        provider: 'resend',
        error: errorMsg,
      };
    }
  }
}

/**
 * 2. Brevo (Sendinblue) Transactional API Provider
 * (https://brevo.com)
 */
export class BrevoEmailProvider implements IEmailProvider {
  public readonly name = 'brevo';
  private apiKey: string;
  private fromAddress: string;
  private fromName: string;

  constructor(apiKey: string, fromAddress?: string, fromName?: string) {
    this.apiKey = apiKey;
    this.fromAddress = fromAddress || process.env.BREVO_FROM_EMAIL || process.env.EMAIL_FROM_ADDRESS || 'notifications@foodbridge.org';
    this.fromName = fromName || process.env.BREVO_FROM_NAME || process.env.EMAIL_FROM_NAME || 'FoodBridge Platform';
  }

  async send(options: EmailSendOptions): Promise<EmailSendResult> {
    try {
      console.log(`[Brevo Email] Sending email to ${options.to} (Subject: "${options.subject}")...`);
      const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: { name: this.fromName, email: this.fromAddress },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
          textContent: options.text,
        },
        {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const messageId = response.data.messageId || `brevo_${Date.now()}`;
      console.log(`[Brevo Email] Successfully sent! MessageId: ${messageId}`);
      return {
        success: true,
        messageId,
        provider: 'brevo',
      };
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Brevo transmission failed';
      console.error(`[Brevo Email Error] Failed to send to ${options.to}:`, errorMsg);
      return {
        success: false,
        messageId: '',
        provider: 'brevo',
        error: errorMsg,
      };
    }
  }
}

/**
 * 3. Standard SMTP Provider (Nodemailer)
 * Compatible with AWS SES, SendGrid SMTP, Gmail Workspace, or custom SMTP
 */
export class SmtpEmailProvider implements IEmailProvider {
  public readonly name = 'smtp';
  private transporter: any;
  private fromAddress: string;

  constructor(host: string, port: number, user: string, pass: string, from?: string) {
    const isGmail = host?.includes('gmail') || process.env.SMTP_SERVICE === 'gmail';
    const isSecure = port === 465 || process.env.SMTP_SECURE === 'true';

    const transportConfig: any = isGmail
      ? {
          service: 'gmail',
          auth: { user, pass },
        }
      : {
          host,
          port,
          secure: isSecure,
          auth: { user, pass },
          tls: { rejectUnauthorized: false },
        };

    this.transporter = nodemailer.createTransport(transportConfig);
    this.fromAddress = from || process.env.SMTP_FROM || process.env.EMAIL_FROM_ADDRESS || `"FoodBridge Operations" <${user}>`;
  }

  async verifyConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.transporter.verify();
      return { success: true, message: 'SMTP connection verified successfully' };
    } catch (err: any) {
      return { success: false, message: err.message || 'SMTP verification failed' };
    }
  }

  async send(options: EmailSendOptions): Promise<EmailSendResult> {
    try {
      console.log(`[SMTP Email] Sending email to ${options.to} (Subject: "${options.subject}") via ${this.fromAddress}...`);
      const info = await this.transporter.sendMail({
        from: options.from || this.fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      console.log(`[SMTP Email] Successfully sent! MessageId: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId || `smtp_${Date.now()}`,
        provider: 'smtp',
      };
    } catch (err: any) {
      console.error(`[SMTP Email Error] Failed to send to ${options.to}:`, err.message);
      return {
        success: false,
        messageId: '',
        provider: 'smtp',
        error: err.message || 'SMTP transmission failed',
      };
    }
  }
}

/**
 * 4. Sandbox Email Provider
 * Deterministic mock provider with rich delivery inspection logging for zero-cost development & testing
 */
export class SandboxEmailProvider implements IEmailProvider {
  public readonly name = 'sandbox';

  async send(options: EmailSendOptions): Promise<EmailSendResult> {
    const messageId = `sandbox_email_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    console.log(`\n==================================================`);
    console.log(`📬 [Email Dispatch - Transactional Notification Engine]`);
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Provider: Sandbox Mode (Delivery Simulated & Audited)`);
    console.log(`Message-ID: ${messageId}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Content Summary:\n${options.text.slice(0, 250)}...`);
    console.log(`Status: 200 OK (Accepted for delivery)`);
    console.log(`==================================================\n`);
    return {
      success: true,
      messageId,
      provider: 'sandbox',
    };
  }
}

/**
 * Factory creating the most appropriate email provider according to environment variables.
 * Automatically checks Resend, Brevo, and SMTP configurations.
 */
export const createEmailProvider = (): IEmailProvider => {
  // If explicitly configured for sandbox simulation
  if (process.env.NOTIFICATION_SANDBOX === 'true') {
    return new SandboxEmailProvider();
  }

  // 1. Resend API
  if (process.env.RESEND_API_KEY) {
    return new ResendEmailProvider(process.env.RESEND_API_KEY, process.env.EMAIL_FROM_ADDRESS);
  }

  // 2. Brevo (Sendinblue)
  if (process.env.BREVO_API_KEY) {
    return new BrevoEmailProvider(
      process.env.BREVO_API_KEY, 
      process.env.EMAIL_FROM_ADDRESS, 
      process.env.EMAIL_FROM_NAME
    );
  }

  // 3. Standard SMTP (Gmail app password, SendGrid, Amazon SES, custom SMTP)
  if ((process.env.SMTP_HOST || process.env.SMTP_SERVICE === 'gmail') && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    return new SmtpEmailProvider(
      host,
      port,
      process.env.SMTP_USER,
      process.env.SMTP_PASS,
      process.env.SMTP_FROM || process.env.EMAIL_FROM_ADDRESS
    );
  }

  // Default to Sandbox for zero-config local development with rich logging
  return new SandboxEmailProvider();
};
