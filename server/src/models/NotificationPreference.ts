import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INotificationPreference extends Document {
  userId: Types.ObjectId;
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  operationalAlertsEnabled: boolean;
  marketingOptIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationPreferenceSchema = new Schema<INotificationPreference>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    emailEnabled: { type: Boolean, default: true },
    smsEnabled: { type: Boolean, default: true },
    inAppEnabled: { type: Boolean, default: true },
    operationalAlertsEnabled: { type: Boolean, default: true }, // Safety, OTP, and pickup alerts cannot be turned off
    marketingOptIn: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const NotificationPreference = mongoose.model<INotificationPreference>(
  'NotificationPreference',
  NotificationPreferenceSchema
);
