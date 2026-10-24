import mongoose, { Schema, Document, Types } from 'mongoose';

export type FoodCategory = 
  | 'cooked_meals' 
  | 'bakery' 
  | 'packaged_produce' 
  | 'fruits_vegetables' 
  | 'dairy' 
  | 'raw_ingredients';

export type DietaryType = 'veg' | 'non_veg' | 'vegan' | 'contains_eggs';

export type StorageRequirement = 
  | 'room_temperature' 
  | 'refrigerated' 
  | 'frozen' 
  | 'hot_insulated';

export type DonationStatus = 
  | 'available' 
  | 'requested' 
  | 'accepted' 
  | 'pickup_scheduled' 
  | 'picked_up' 
  | 'delivered' 
  | 'completed' 
  | 'cancelled' 
  | 'expired' 
  | 'flagged';

export interface ITimelineEvent {
  status: DonationStatus;
  timestamp: Date;
  note: string;
  actorId?: Types.ObjectId;
  actorName: string;
  actorRole: string;
}

export interface IDonation extends Document {
  title: string;
  description: string;
  foodCategory: FoodCategory;
  dietaryType: DietaryType;
  quantityMeals: number;
  quantityKg: number;
  preparationTime: Date;
  collectionDeadline: Date;
  storageRequirement: StorageRequirement;
  allergens: string[];
  location: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
    address: string;
    city: string;
    pincode?: string;
  };
  providerId: Types.ObjectId;
  organizationId: Types.ObjectId;
  status: DonationStatus;
  assignedNgoId?: Types.ObjectId;
  pickupContact: {
    name: string;
    phone: string;
    pickupInstructions?: string;
  };
  pickupOtp?: string;
  pickupOtpHashed?: string;
  pickupOtpEncrypted?: string;
  pickupOtpExpiresAt?: Date;
  pickupOtpAttempts?: number;
  pickupOtpMaxAttempts?: number;
  pickupOtpConsumedAt?: Date;
  pickupOtpApprovedRequestId?: Types.ObjectId;
  pickupOtpAuthorizedNgoId?: Types.ObjectId;
  pickupOtpRegeneratedAt?: Date;
  deliveryOtp?: string;
  images: string[];
  timeline: ITimelineEvent[];
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DonationSchema = new Schema<IDonation>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    foodCategory: { 
      type: String, 
      required: true,
      enum: ['cooked_meals', 'bakery', 'packaged_produce', 'fruits_vegetables', 'dairy', 'raw_ingredients'],
      index: true
    },
    dietaryType: {
      type: String,
      required: true,
      enum: ['veg', 'non_veg', 'vegan', 'contains_eggs'],
      default: 'veg'
    },
    quantityMeals: { type: Number, required: true, min: 1 },
    quantityKg: { type: Number, required: true, min: 0.1 },
    preparationTime: { type: Date, required: true },
    collectionDeadline: { type: Date, required: true, index: true },
    storageRequirement: {
      type: String,
      required: true,
      enum: ['room_temperature', 'refrigerated', 'frozen', 'hot_insulated'],
      default: 'room_temperature'
    },
    allergens: { type: [String], default: [] },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
      address: { type: String, required: true },
      city: { type: String, required: true, index: true },
      pincode: { type: String, default: '' },
    },
    providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    status: {
      type: String,
      enum: ['available', 'requested', 'accepted', 'pickup_scheduled', 'picked_up', 'delivered', 'completed', 'cancelled', 'expired', 'flagged'],
      lowercase: true,
      trim: true,
      default: 'available',
      index: true
    },
    assignedNgoId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    pickupContact: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      pickupInstructions: { type: String, default: '' },
    },
    pickupOtp: { type: String },
    pickupOtpHashed: { type: String },
    pickupOtpEncrypted: { type: String },
    pickupOtpExpiresAt: { type: Date },
    pickupOtpAttempts: { type: Number, default: 0 },
    pickupOtpMaxAttempts: { type: Number, default: 5 },
    pickupOtpConsumedAt: { type: Date },
    pickupOtpApprovedRequestId: { type: Schema.Types.ObjectId, ref: 'DonationRequest' },
    pickupOtpAuthorizedNgoId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    pickupOtpRegeneratedAt: { type: Date },
    deliveryOtp: { type: String },
    images: { type: [String], default: [] },
    timeline: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: '' },
        actorId: { type: Schema.Types.ObjectId, ref: 'User' },
        actorName: { type: String, default: 'System' },
        actorRole: { type: String, default: 'system' },
      }
    ],
    isDemo: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

DonationSchema.index({ 'location.coordinates': '2dsphere' });

export const Donation = mongoose.model<IDonation>('Donation', DonationSchema);
