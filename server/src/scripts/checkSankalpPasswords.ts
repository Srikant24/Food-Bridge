import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { connectDatabase } from '../config/db';
import '../models/Organization';
import '../models/User';
import { User } from '../models/User';

async function check() {
  await connectDatabase();

  const sankalps = await User.find({
    $or: [
      { name: { $regex: /sankalp/i } },
      { email: { $regex: /sankalp/i } }
    ]
  }).lean();

  console.log(`Found ${sankalps.length} Sankalp users:`);
  for (const s of sankalps) {
    console.log({
      _id: s._id,
      name: s.name,
      email: s.email,
      role: s.role,
      isActive: s.isActive,
      organizationId: s.organizationId,
      createdAt: s.createdAt,
    });
  }

  // Also check if there is ANY user whose name is Sankalp or similar where role is provider
  const anyProviderSankalp = await User.find({
    role: 'provider',
    $or: [
      { name: { $regex: /sankalp/i } },
      { email: { $regex: /sankalp/i } }
    ]
  });
  console.log('Any provider with sankalp in name/email:', anyProviderSankalp.length);

  // Check recent users created
  const recentUsers = await User.find().sort({ createdAt: -1 }).limit(10).lean();
  console.log('\n10 Most Recently Registered Users:');
  for (const r of recentUsers) {
    console.log(`  ${r.name} (${r.email}) -> Role: "${r.role}" (Created: ${r.createdAt})`);
  }

  await mongoose.disconnect();
}

check().catch(console.error);
