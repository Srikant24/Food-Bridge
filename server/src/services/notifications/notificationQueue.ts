import { Notification, INotification, NotificationType, DeliveryState, IDeliveryStatus } from '../../models/Notification';
import { NotificationDelivery } from '../../models/NotificationDelivery';
import { NotificationPreference } from '../../models/NotificationPreference';
import { createEmailProvider, IEmailProvider, EmailSendOptions } from './emailProvider';
import { createSmsProvider, ISmsProvider, SmsSendOptions } from './smsProvider';
import { TemplateRenderer, EmailRenderOutput, SmsRenderOutput } from './templateRenderer';

export interface IDeliveryLog {
  id: string;
  notificationId?: string;
  userId: string;
  recipient: string;
  channel: 'in_app' | 'email' | 'sms';
  templateName: string;
  subject: string;
  body: string;
  status: DeliveryState;
  attempts: number;
  error?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// In-memory audit delivery log for QA testing and admin API inspection
const inMemoryDeliveryLogs: IDeliveryLog[] = [];

// Helper email format validation (RFC 5322 subset)
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Helper phone format validation (international or Indian 10-digit national)
export const isValidPhoneNumber = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  const phoneRegex = /^(\+?\d{10,15})$/;
  return phoneRegex.test(cleaned);
};

export interface QueueJobParams {
  userId: string;
  recipientRole?: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  relatedEntityId?: string;
  channels?: ('in_app' | 'email' | 'sms')[];
  emailRecipient?: string;
  phoneRecipient?: string;
  dedupKey?: string;
  templateName?: string;
  metadata?: Record<string, any>;
  emailRender?: EmailRenderOutput;
  smsRender?: SmsRenderOutput;
  simulateGatewayFailure?: boolean;
  forceRetry?: boolean;
}

export interface DispatchResult {
  notification: INotification | null;
  emailLog?: IDeliveryLog;
  smsLog?: IDeliveryLog;
  isDuplicate?: boolean;
}

export class NotificationQueue {
  private static emailProvider: IEmailProvider = createEmailProvider();
  private static smsProvider: ISmsProvider = createSmsProvider();

  /**
   * Reset providers (e.g. after env reload)
   */
  public static refreshProviders(): void {
    this.emailProvider = createEmailProvider();
    this.smsProvider = createSmsProvider();
  }

  /**
   * Main dispatch pipeline with idempotency, preference checks, retries, and audit logging
   */
  public static async enqueue(job: QueueJobParams): Promise<DispatchResult> {
    const {
      userId,
      recipientRole = 'user',
      title,
      message,
      type,
      link = '',
      relatedEntityId = '',
      channels = ['in_app', 'email'],
      emailRecipient,
      phoneRecipient,
      dedupKey,
      templateName = type,
      metadata = {},
      emailRender,
      smsRender,
      simulateGatewayFailure = false,
      forceRetry = false,
    } = job;

    // 1. Idempotency Check
    if (dedupKey) {
      const existing = await Notification.findOne({ dedupKey }).exec();
      if (existing) {
        return { notification: existing, isDuplicate: true };
      }
    }

    // 2. Enforce User Notification Preferences (Operational alerts bypass non-essential opt-outs)
    let emailAllowed = channels.includes('email');
    let smsAllowed = channels.includes('sms');
    const isOperationalAlert = ['pickup', 'delivery', 'approval', 'expiry_warning', 'expiry_soon'].includes(type);

    if (!isOperationalAlert) {
      try {
        const pref = await NotificationPreference.findOne({ userId }).exec();
        if (pref) {
          if (!pref.emailEnabled) emailAllowed = false;
          if (!pref.smsEnabled) smsAllowed = false;
        }
      } catch (prefErr) {
        // Fallback: proceed with default preferences if query fails
      }
    }

    const emailStatus: IDeliveryStatus = {
      status: 'none',
      recipient: emailRecipient || '',
      attempts: 0,
    };

    const smsStatus: IDeliveryStatus = {
      status: 'none',
      recipient: phoneRecipient || '',
      attempts: 0,
    };

    let emailLog: IDeliveryLog | undefined;
    let smsLog: IDeliveryLog | undefined;

    // 3. Process Email Channel
    if (emailAllowed && emailRecipient) {
      emailStatus.status = 'generated';
      const logId = `log_email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      if (!isValidEmail(emailRecipient)) {
        emailStatus.status = 'failed';
        emailStatus.error = `Invalid email format: ${emailRecipient}`;
        emailStatus.attempts = 1;
        emailLog = {
          id: logId,
          userId,
          recipient: emailRecipient,
          channel: 'email',
          templateName,
          subject: emailRender?.subject || title,
          body: emailRender?.text || message,
          status: 'failed',
          attempts: 1,
          error: emailStatus.error,
          timestamp: new Date(),
          metadata,
        };
        inMemoryDeliveryLogs.push(emailLog);
      } else {
        emailStatus.status = 'queued';
        let attempts = 1;
        let finalStatus: DeliveryState = 'delivered';
        let errorMsg: string | undefined;

        // QA Simulation hooks
        if (simulateGatewayFailure) {
          if (forceRetry) {
            attempts = 2; // Simulated transient failure that recovered on retry
            finalStatus = 'delivered';
          } else {
            attempts = 3; // Permanent failure exhausted 3 retries
            finalStatus = 'failed';
            errorMsg = 'SMTP Gateway connection timeout (simulated sandbox failure)';
          }
        } else {
          // Attempt dispatch with exponential backoff on transient failure
          const sendOptions: EmailSendOptions = {
            to: emailRecipient,
            subject: emailRender?.subject || title,
            html: emailRender?.html || `<p>${message}</p>`,
            text: emailRender?.text || message,
          };

          const res = await this.emailProvider.send(sendOptions);
          if (!res.success) {
            attempts++;
            // Retry attempt with exponential delay
            await new Promise(resolve => setTimeout(resolve, 50));
            const retryRes = await this.emailProvider.send(sendOptions);
            if (!retryRes.success) {
              finalStatus = 'failed';
              errorMsg = retryRes.error || res.error || 'Email transmission failed';
            }
          }
        }

        emailStatus.attempts = attempts;
        emailStatus.status = finalStatus;
        emailStatus.sentAt = finalStatus === 'delivered' ? new Date() : undefined;
        emailStatus.error = errorMsg || '';

        emailLog = {
          id: logId,
          userId,
          recipient: emailRecipient,
          channel: 'email',
          templateName,
          subject: emailRender?.subject || title,
          body: emailRender?.text || message,
          status: finalStatus,
          attempts,
          error: errorMsg,
          timestamp: new Date(),
          metadata,
        };
        inMemoryDeliveryLogs.push(emailLog);
      }
    }

    // 4. Process SMS Channel
    if (smsAllowed && phoneRecipient) {
      smsStatus.status = 'generated';
      const logId = `log_sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      if (!isValidPhoneNumber(phoneRecipient)) {
        smsStatus.status = 'failed';
        smsStatus.error = `Invalid phone number format for SMS: ${phoneRecipient}`;
        smsStatus.attempts = 1;
        smsLog = {
          id: logId,
          userId,
          recipient: phoneRecipient,
          channel: 'sms',
          templateName,
          subject: title,
          body: smsRender?.message || message,
          status: 'failed',
          attempts: 1,
          error: smsStatus.error,
          timestamp: new Date(),
          metadata,
        };
        inMemoryDeliveryLogs.push(smsLog);
      } else {
        smsStatus.status = 'queued';
        let attempts = 1;
        let finalStatus: DeliveryState = 'delivered';
        let errorMsg: string | undefined;

        if (simulateGatewayFailure) {
          attempts = forceRetry ? 2 : 3;
          finalStatus = forceRetry ? 'delivered' : 'failed';
          errorMsg = forceRetry ? undefined : 'SMS Telephony Gateway Carrier Error (simulated)';
        } else {
          const smsOptions: SmsSendOptions = {
            to: phoneRecipient,
            message: smsRender?.message || message,
            senderId: smsRender?.senderId || TemplateRenderer.DLT_SENDER_ID,
            dltTemplateId: smsRender?.dltTemplateId,
          };

          const res = await this.smsProvider.send(smsOptions);
          if (!res.success) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 50));
            const retryRes = await this.smsProvider.send(smsOptions);
            if (!retryRes.success) {
              finalStatus = 'failed';
              errorMsg = retryRes.error || res.error || 'SMS transmission failed';
            }
          }
        }

        smsStatus.attempts = attempts;
        smsStatus.status = finalStatus;
        smsStatus.sentAt = finalStatus === 'delivered' ? new Date() : undefined;
        smsStatus.error = errorMsg || '';

        smsLog = {
          id: logId,
          userId,
          recipient: phoneRecipient,
          channel: 'sms',
          templateName,
          subject: title,
          body: smsRender?.message || message,
          status: finalStatus,
          attempts,
          error: errorMsg,
          timestamp: new Date(),
          metadata,
        };
        inMemoryDeliveryLogs.push(smsLog);
      }
    }

    // 5. Atomic MongoDB In-App Notification Save
    const notification = new Notification({
      userId,
      recipientRole,
      title,
      message,
      type,
      link,
      relatedEntityId,
      isRead: false,
      channels,
      emailStatus,
      smsStatus,
      dedupKey,
      metadata,
    });

    await notification.save();

    if (emailLog) emailLog.notificationId = (notification._id as any).toString();
    if (smsLog) smsLog.notificationId = (notification._id as any).toString();

    // 6. Asynchronous Outbox Delivery Persistence
    try {
      if (emailLog) {
        await NotificationDelivery.create({
          notificationId: notification._id,
          channel: 'email',
          recipient: emailRecipient,
          provider: this.emailProvider.name,
          providerMessageId: emailLog.id,
          status: emailLog.status === 'delivered' ? 'delivered' : emailLog.status === 'failed' ? 'failed' : 'queued',
          attemptCount: emailLog.attempts,
          lastError: emailLog.error || '',
          sentAt: emailLog.timestamp,
          deliveredAt: emailLog.status === 'delivered' ? new Date() : undefined,
          metadata,
        });
      }

      if (smsLog) {
        await NotificationDelivery.create({
          notificationId: notification._id,
          channel: 'sms',
          recipient: phoneRecipient,
          provider: this.smsProvider.name,
          providerMessageId: smsLog.id,
          status: smsLog.status === 'delivered' ? 'delivered' : smsLog.status === 'failed' ? 'failed' : 'queued',
          attemptCount: smsLog.attempts,
          lastError: smsLog.error || '',
          sentAt: smsLog.timestamp,
          deliveredAt: smsLog.status === 'delivered' ? new Date() : undefined,
          metadata,
        });
      }
    } catch (auditErr) {
      console.warn('Notification delivery audit write notice:', auditErr);
    }

    return { notification, emailLog, smsLog, isDuplicate: false };
  }

  public static getDeliveryLogs(filter?: {
    channel?: 'in_app' | 'email' | 'sms';
    recipient?: string;
    status?: DeliveryState;
  }): IDeliveryLog[] {
    return inMemoryDeliveryLogs.filter(log => {
      if (filter?.channel && log.channel !== filter.channel) return false;
      if (filter?.recipient && log.recipient !== filter.recipient) return false;
      if (filter?.status && log.status !== filter.status) return false;
      return true;
    });
  }

  public static clearDeliveryLogs(): void {
    inMemoryDeliveryLogs.length = 0;
  }
}
