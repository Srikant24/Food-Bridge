import mongoose, { Schema, Document, Types } from 'mongoose';
import './Organization';
import { CanonicalRole, normalizeRole } from '../utils/roleUtils';

export type UserRole = CanonicalRole;

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone: string;
  organizationId?: Types.ObjectId;
  avatarUrl?: string;
  isActive: boolean;
  isDemo?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['provider', 'ngo', 'admin'], 
      required: true, 
      default: 'provider',
      set: (val: string) => normalizeRole(val),
    },
    phone: { type: String, default: '' },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    avatarUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook ensuring canonical role value is strictly stored in MongoDB
UserSchema.pre<IUser>('save', function (next) {
  if (this.isModified('role') || !this.role) {
    this.role = normalizeRole(this.role);
  }
  next();
});

export const User = mongoose.model<IUser>('User', UserSchema);
