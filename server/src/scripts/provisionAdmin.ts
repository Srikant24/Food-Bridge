import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';

export async function ensureAdminProvisioned(): Promise<{ message: string; email: string }> {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@foodbridge.org').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePass2026!';
  const adminName = process.env.ADMIN_NAME || 'FoodBridge Operations Admin';
  const adminPhone = process.env.ADMIN_PHONE || '+91 98000 00000';

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI as string);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  // Check if admin account exists
  let adminUser = await User.findOne({ email: adminEmail });

  if (adminUser) {
    adminUser.name = adminName;
    adminUser.role = 'admin';
    adminUser.passwordHash = passwordHash;
    adminUser.isActive = true;
    adminUser.phone = adminPhone;
    await adminUser.save();
    return { message: 'Existing administrator account synchronized successfully', email: adminEmail };
  }

  // Also check if any admin exists with another email
  const anyAdmin = await User.findOne({ role: 'admin' });
  if (anyAdmin) {
    return { message: `Administrator account already present (${anyAdmin.email})`, email: anyAdmin.email };
  }

  // Create new administrator account
  adminUser = await User.create({
    name: adminName,
    email: adminEmail,
    passwordHash,
    role: 'admin',
    phone: adminPhone,
    isActive: true,
    isDemo: false,
  });

  return { message: 'New administrator account provisioned successfully', email: adminEmail };
}

if (require.main === module) {
  ensureAdminProvisioned()
    .then((res) => {
      console.log(`✅ [PROVISION ADMIN] ${res.message}: ${res.email}`);
      return mongoose.disconnect();
    })
    .catch((err) => {
      console.error('❌ Failed to provision administrator:', err);
      process.exit(1);
    });
}
