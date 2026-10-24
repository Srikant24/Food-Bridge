import mongoose, { Schema, Document, Types } from 'mongoose';

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export interface IDonationRequest extends Document {
  donationId: Types.ObjectId;
  ngoId: Types.ObjectId; // User ID
  ngoOrganizationId: Types.ObjectId; // Organization ID
  status: RequestStatus;
  requestNotes: string;
  estimatedPickupTime: Date;
  matchScore: number;
  matchDetails: {
    urgencyScore: number;
    distanceKm: number;
    distanceScore: number;
    capacityScore: number;
    availabilityScore: number;
    storageScore: number;
  };
  pickupOtpHash?: string;
  pickupOtpExpiresAt?: Date;
  pickupOtpAttempts?: number;
  pickupOtpVerified?: boolean;
  pickupOtpVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DonationRequestSchema = new Schema<IDonationRequest>(
  {
    donationId: { type: Schema.Types.ObjectId, ref: 'Donation', required: true, index: true },
    ngoId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ngoOrganizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'withdrawn'],
      default: 'pending',
      index: true
    },
    requestNotes: { type: String, default: '' },
    estimatedPickupTime: { type: Date, required: true },
    matchScore: { type: Number, default: 0 },
    matchDetails: {
      urgencyScore: { type: Number, default: 0 },
      distanceKm: { type: Number, default: 0 },
      distanceScore: { type: Number, default: 0 },
      capacityScore: { type: Number, default: 0 },
      availabilityScore: { type: Number, default: 0 },
      storageScore: { type: Number, default: 0 },
    },
    pickupOtpHash: { type: String },
    pickupOtpExpiresAt: { type: Date },
    pickupOtpAttempts: { type: Number, default: 0 },
    pickupOtpVerified: { type: Boolean, default: false },
    pickupOtpVerifiedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate pending requests from same NGO for same donation
DonationRequestSchema.index({ donationId: 1, ngoOrganizationId: 1 }, { unique: true });

export const DonationRequest = mongoose.model<IDonationRequest>('DonationRequest', DonationRequestSchema);
