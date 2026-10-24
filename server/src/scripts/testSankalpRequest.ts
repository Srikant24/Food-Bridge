import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { connectDatabase } from '../config/db';
import '../models/Organization';
import '../models/User';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Donation } from '../models/Donation';

const JWT_SECRET = process.env.JWT_SECRET || 'foodbridge_super_secret_jwt_key_hackathon_2025_dev_mode';
const BASE_URL = 'http://localhost:5000/api';

async function testSankalp() {
  await connectDatabase();

  // Find an available donation
  const availableDonation = await Donation.findOne({ status: 'available' }).exec();
  if (!availableDonation) {
    console.error('No available donation found!');
    return;
  }
  console.log(`Found available donation: ${availableDonation.title} (ID: ${availableDonation._id})`);

  const sankalpUsers = await User.find({
    $or: [
      { name: { $regex: /sankalp/i } },
      { email: { $regex: /sankalp/i } }
    ]
  }).populate('organizationId').exec();

  console.log(`Testing ${sankalpUsers.length} Sankalp users:`);

  for (const user of sankalpUsers) {
    console.log(`\n--- Testing User: ${user.name} (${user.email}) ---`);
    console.log(`Role in DB: "${user.role}"`);
    console.log(`Org: "${(user.organizationId as any)?.name}" | Status: "${(user.organizationId as any)?.verificationStatus}"`);

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Test GET /auth/me
    try {
      const meRes = await axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('GET /auth/me success:', meRes.data.user);
    } catch (err: any) {
      console.error('GET /auth/me failed:', err.response?.status, err.response?.data);
    }

    // Test POST /api/donations/:id/request
    try {
      const reqRes = await axios.post(
        `${BASE_URL}/donations/${availableDonation._id}/request`,
        {
          requestNotes: 'Testing NGO collection request from script',
          estimatedPickupTime: new Date(Date.now() + 2 * 3600000).toISOString(),
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      console.log('POST /api/donations/:id/request SUCCESS:', reqRes.status, reqRes.data);
    } catch (err: any) {
      console.error('POST /api/donations/:id/request FAILED:', err.response?.status, err.response?.data);
    }
  }

  process.exit(0);
}

testSankalp().catch(console.error);
