import axios from 'axios';

export interface SmsSendOptions {
  to: string;
  message: string;
  senderId?: string;
  dltTemplateId?: string;
}

export interface SmsSendResult {
  success: boolean;
  messageId: string;
  provider: 'twilio' | 'dlt_gateway' | 'sandbox';
  error?: string;
}

export interface ISmsProvider {
  name: 'twilio' | 'dlt_gateway' | 'sandbox';
  send(options: SmsSendOptions): Promise<SmsSendResult>;
}

/**
 * 1. Twilio International Telephony Provider
 */
export class TwilioSmsProvider implements ISmsProvider {
  public readonly name = 'twilio';
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.fromNumber = fromNumber;
  }

  async send(options: SmsSendOptions): Promise<SmsSendResult> {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      
      const params = new URLSearchParams();
      params.append('To', options.to);
      params.append('From', this.fromNumber);
      params.append('Body', options.message);

      const response = await axios.post(url, params.toString(), {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      });

      return {
        success: true,
        messageId: response.data.sid || `twilio_${Date.now()}`,
        provider: 'twilio',
      };
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Twilio SMS transmission failed';
      return {
        success: false,
        messageId: '',
        provider: 'twilio',
        error: errorMsg,
      };
    }
  }
}

/**
 * 2. India-Compatible DLT SMS Gateway Provider
 * Compliant with TRAI/DLT distributed ledger regulations
 * Compatible with Fast2SMS, MSG91, Textlocal, and Airtel IQ
 */
export class IndiaDltSmsProvider implements ISmsProvider {
  public readonly name = 'dlt_gateway';
  private apiKey: string;
  private defaultSenderId: string;
  private endpointUrl: string;

  constructor(apiKey: string, senderId = 'FDBRDG', endpointUrl?: string) {
    this.apiKey = apiKey;
    this.defaultSenderId = senderId;
    this.endpointUrl = endpointUrl || process.env.DLT_SMS_ENDPOINT || 'https://www.fast2sms.com/dev/bulkV2';
  }

  async send(options: SmsSendOptions): Promise<SmsSendResult> {
    try {
      // Clean phone number (strip +91 prefix or non-digits for standard 10-digit Indian numbers)
      const cleanPhone = options.to.replace(/^\+91/, '').replace(/\D/g, '');

      const response = await axios.post(
        this.endpointUrl,
        {
          route: 'dlt',
          sender_id: options.senderId || this.defaultSenderId,
          message: options.message,
          template_id: options.dltTemplateId || 'DLT_DEFAULT_01',
          numbers: cleanPhone,
        },
        {
          headers: {
            authorization: this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const success = response.data?.return === true || response.status === 200;
      return {
        success,
        messageId: response.data?.request_id || `dlt_${Date.now()}`,
        provider: 'dlt_gateway',
        error: success ? undefined : response.data?.message || 'DLT provider returned failure',
      };
    } catch (err: any) {
      return {
        success: false,
        messageId: '',
        provider: 'dlt_gateway',
        error: err.response?.data?.message || err.message || 'DLT SMS gateway failure',
      };
    }
  }
}

/**
 * 3. Sandbox Telephony Provider
 */
export class SandboxSmsProvider implements ISmsProvider {
  public readonly name = 'sandbox';

  async send(options: SmsSendOptions): Promise<SmsSendResult> {
    const messageId = `sandbox_sms_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      success: true,
      messageId,
      provider: 'sandbox',
    };
  }
}

/**
 * Factory creating appropriate SMS provider according to environment variables
 */
export const createSmsProvider = (): ISmsProvider => {
  const isSandbox = process.env.NOTIFICATION_SANDBOX !== 'false';

  if (!isSandbox) {
    if (process.env.DLT_SMS_API_KEY) {
      return new IndiaDltSmsProvider(
        process.env.DLT_SMS_API_KEY,
        process.env.DLT_SENDER_ID || 'FDBRDG',
        process.env.DLT_SMS_ENDPOINT
      );
    }
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      return new TwilioSmsProvider(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
        process.env.TWILIO_PHONE_NUMBER
      );
    }
  }

  return new SandboxSmsProvider();
};
