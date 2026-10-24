import mongoose, { Schema, Document, Types } from 'mongoose';

export type DeliveryChannel = 'email' | 'sms' | 'in_app';
export type DeliveryLifecycleStatus = 'pending' | 'queued' | 'delivered' | 'failed';

export interface INotificationDelivery extends Document {
  notificationId: Types.ObjectId;
  channel: DeliveryChannel;
  recipient: string;
  provider: string; // 'resend' | 'brevo' | 'smtp' | 'twilio' | 'dlt_sms' | 'sandbox'
  providerMessageId?: string;
  status: DeliveryLifecycleStatus;
  attemptCount: number;
  lastError?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationDeliverySchema = new Schema<INotificationDelivery>(
  {
    notificationId: { type: Schema.Types.ObjectId, ref: 'Notification', required: true, index: true },
    channel: { type: String, enum: ['email', 'sms', 'in_app'], required: true, index: true },
    recipient: { type: String, required: true, index: true },
    provider: { type: String, default: 'sandbox', index: true },
    providerMessageId: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'queued', 'delivered', 'failed'],
      default: 'pending',
      index: true,
    },
    attemptCount: { type: Number, default: 0 },
    lastError: { type: String, default: '' },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

export const NotificationDelivery = mongoose.model<INotificationDelivery>(
  'NotificationDelivery',
  NotificationDeliverySchema
);
