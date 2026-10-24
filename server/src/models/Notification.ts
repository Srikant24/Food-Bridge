import mongoose, { Schema, Document, Types } from 'mongoose';

export type NotificationType = 
  | 'registration'
  | 'food_alert'
  | 'match' 
  | 'request' 
  | 'approval' 
  | 'rejection'
  | 'driver_assigned'
  | 'pickup'
  | 'delivery_progress'
  | 'delivery'
  | 'status_update' 
  | 'expiry_warning'
  | 'expiry_soon'
  | 'cancelled'
  | 'system';

export type DeliveryState = 'none' | 'generated' | 'queued' | 'provider_accepted' | 'delivered' | 'failed';

export interface IDeliveryStatus {
  status: DeliveryState;
  recipient?: string;
  sentAt?: Date;
  error?: string;
  attempts: number;
}

export interface INotification extends Document {
  userId: Types.ObjectId;
  recipientRole?: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  relatedEntityId?: string;
  isRead: boolean;
  channels: ('in_app' | 'email' | 'sms')[];
  emailStatus: IDeliveryStatus;
  smsStatus: IDeliveryStatus;
  dedupKey?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryStatusSchema = new Schema<IDeliveryStatus>(
  {
    status: {
      type: String,
      enum: ['none', 'generated', 'queued', 'provider_accepted', 'delivered', 'failed'],
      default: 'none',
    },
    recipient: { type: String, default: '' },
    sentAt: { type: Date },
    error: { type: String, default: '' },
    attempts: { type: Number, default: 0 },
  },
  { _id: false }
);

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipientRole: { type: String, default: 'user', index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { 
      type: String, 
      enum: [
        'registration',
        'food_alert',
        'match', 
        'request', 
        'approval', 
        'rejection',
        'driver_assigned',
        'pickup',
        'delivery_progress',
        'delivery',
        'status_update', 
        'expiry_warning',
        'expiry_soon',
        'cancelled',
        'system'
      ],
      default: 'system',
      index: true,
    },
    link: { type: String, default: '' },
    relatedEntityId: { type: String, default: '', index: true },
    isRead: { type: Boolean, default: false, index: true },
    channels: {
      type: [String],
      enum: ['in_app', 'email', 'sms'],
      default: ['in_app'],
    },
    emailStatus: {
      type: DeliveryStatusSchema,
      default: () => ({ status: 'none', recipient: '', attempts: 0 }),
    },
    smsStatus: {
      type: DeliveryStatusSchema,
      default: () => ({ status: 'none', recipient: '', attempts: 0 }),
    },
    dedupKey: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

