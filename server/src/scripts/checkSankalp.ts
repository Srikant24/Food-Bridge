import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { connectDatabase } from '../config/db';
import '../models/Organization';
import '../models/User';
import { User } from '../models/User';
import { Organization } from '../models/Organization';

async function checkSankalp() {
  await connectDatabase();
  console.log('Searching for user Sankalp in MongoDB...');
  const users = await User.find({
    $or: [
      { name: { $regex: /sankalp/i } },
      { email: { $regex: /sankalp/i } }
    ]
  }).exec();

  console.log(`Found ${users.length} matching users:`);
  for (const u of users) {
    let org: any = null;
    if (u.organizationId) {
      org = await Organization.findById(u.organizationId).lean();
    }
    console.log({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      roleType: typeof u.role,
      organizationName: org?.name,
      organizationType: org?.type,
      verificationStatus: org?.verificationStatus,
    });
  }

  // Also check all users and their roles
  const allUsers = await User.find().select('name email role organizationId').lean().exec();
  console.log(`\nTotal users in DB: ${allUsers.length}`);
  const rolesFound = new Set(allUsers.map(u => u.role));
  console.log('Distinct roles in DB:', Array.from(rolesFound));

  // Find all NGO users or users with NGO in name/email
  const ngoUsers = allUsers.filter(u => u.role === 'ngo');
  console.log(`\nTotal users with role === 'ngo': ${ngoUsers.length}`);
  for (const nu of ngoUsers) {
    console.log(`  NGO User: "${nu.name}" <${nu.email}> (ID: ${nu._id})`);
  }

  await mongoose.disconnect();
}

checkSankalp().catch(console.error);
