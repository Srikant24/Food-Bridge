import mongoose, { Schema, Document, Types } from 'mongoose';

export type OrgType = 
  | 'restaurant' 
  | 'canteen' 
  | 'hotel' 
  | 'hostel' 
  | 'caterer' 
  | 'event_organizer'
  | 'ngo_shelter' 
  | 'community_kitchen' 
  | 'food_bank' 
  | 'charity';

export type VerificationStatus = 'pending' | 'verified' | 'approved' | 'rejected';

export interface ICapacity {
  maxMealsPerDay: number;
  currentAvailableCapacity: number;
  hasRefrigeration: boolean;
  hasWarmStorage: boolean;
  hasTransportFleet: boolean;
  activeVolunteers: number;
}

export interface ILocation {
  type: string; // 'Point'
  coordinates: [number, number]; // [longitude, latitude]
  address: string;
  city: string;
  state?: string;
  pincode?: string;
}

export interface IOrganization extends Document {
  name: string;
  type: OrgType;
  description: string;
  registrationNumber?: string;
  website?: string;
  contactPerson: string;
  phone: string;
  email: string;
  location: ILocation;
  serviceRadiusKm: number;
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  verifiedAt?: Date;
  verifiedBy?: Types.ObjectId;
  capacity: ICapacity;
  compatibleCategories: string[];
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true, index: true },
    type: { 
      type: String, 
      required: true,
      enum: [
        'restaurant', 'canteen', 'hotel', 'hostel', 'caterer', 'event_organizer',
        'ngo_shelter', 'community_kitchen', 'food_bank', 'charity'
      ] 
    },
    description: { type: String, default: '' },
    registrationNumber: { type: String, default: '' },
    website: { type: String, default: '' },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        default: [77.2090, 28.6139], // Default Delhi coordinates
      },
      address: { type: String, required: true },
      city: { type: String, required: true, index: true },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
    },
    serviceRadiusKm: { type: Number, default: 20 },
    verificationStatus: { 
      type: String, 
      enum: ['pending', 'verified', 'approved', 'rejected'], 
      default: 'pending',
      index: true 
    },
    verificationNotes: { type: String, default: '' },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    capacity: {
      maxMealsPerDay: { type: Number, default: 100 },
      currentAvailableCapacity: { type: Number, default: 100 },
      hasRefrigeration: { type: Boolean, default: false },
      hasWarmStorage: { type: Boolean, default: false },
      hasTransportFleet: { type: Boolean, default: false },
      activeVolunteers: { type: Number, default: 5 },
    },
    compatibleCategories: {
      type: [String],
      default: ['cooked_meals', 'bakery', 'packaged_produce', 'fruits_vegetables', 'dairy', 'raw_ingredients'],
    },
    isDemo: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// GeoJSON 2dsphere index for geospatial location queries
OrganizationSchema.index({ 'location.coordinates': '2dsphere' });

export const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);
