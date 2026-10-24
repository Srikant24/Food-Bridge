import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Donation } from '../models/Donation';

const BASE_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'foodbridge_super_secret_jwt_key_hackathon_2025_dev_mode';

function generateToken(user: any) {
  return jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
}

let createdDonationId: string | null = null;
let testPassedCount = 0;
let testTotalCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  testTotalCount++;
  if (condition) {
    testPassedCount++;
    console.log(`✅ [PASS] ${testName}`);
  } else {
    console.error(`❌ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
  }
}

async function runTestSuite() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  console.log('=== FOODBRIDGE SURPLUS LISTING CREATION TEST SUITE ===\n');

  // Find verified provider
  const verifiedProvider = await User.findOne({
    role: { $in: ['provider', 'food_provider'] }
  }).populate('organizationId');

  if (!verifiedProvider) {
    throw new Error('No provider user found in database');
  }

  // Ensure provider's organization is verified/approved for the test
  const org = verifiedProvider.organizationId as any;
  if (org && org.verificationStatus !== 'verified' && org.verificationStatus !== 'approved') {
    await Organization.findByIdAndUpdate(org._id, { verificationStatus: 'approved' });
  }

  const verifiedToken = generateToken(verifiedProvider);

  // Find or create pending provider
  let pendingProvider = await User.findOne({ email: 'qa_pending_prov@foodbridge.test' }).populate('organizationId');
  if (!pendingProvider) {
    let pendingOrg = await Organization.findOne({ name: 'Pending Kitchen Facility' });
    if (!pendingOrg) {
      pendingOrg = await Organization.create({
        name: 'Pending Kitchen Facility',
        type: 'restaurant',
        description: 'Testing pending verification',
        contactPerson: 'Pending Chef',
        phone: '+91 98765 43210',
        email: 'qa_pending_org@foodbridge.test',
        location: {
          type: 'Point',
          coordinates: [77.2090, 28.6139],
          address: 'Connaught Place, New Delhi',
          city: 'New Delhi'
        },
        serviceRadiusKm: 15,
        verificationStatus: 'pending',
        capacity: {
          maxMealsPerDay: 100,
          currentAvailableCapacity: 100,
          hasRefrigeration: true,
          hasWarmStorage: true,
          hasTransportFleet: false,
          activeVolunteers: 2
        },
        isDemo: true
      });
    }
    pendingProvider = await User.create({
      name: 'Chef Pending',
      email: 'qa_pending_prov@foodbridge.test',
      passwordHash: 'hashed_password_placeholder',
      role: 'provider',
      phone: '+91 98765 43210',
      organizationId: pendingOrg._id,
      isActive: true,
      isDemo: true
    });
  } else {
    await Organization.findByIdAndUpdate(pendingProvider.organizationId, { verificationStatus: 'pending' });
  }
  const pendingToken = generateToken(pendingProvider);

  // Find or create rejected provider
  let rejectedProvider = await User.findOne({ email: 'qa_rejected_prov@foodbridge.test' }).populate('organizationId');
  if (!rejectedProvider) {
    let rejectedOrg = await Organization.findOne({ name: 'Rejected Catering Facility' });
    if (!rejectedOrg) {
      rejectedOrg = await Organization.create({
        name: 'Rejected Catering Facility',
        type: 'caterer',
        description: 'Testing rejected verification',
        contactPerson: 'Rejected Chef',
        phone: '+91 98765 43211',
        email: 'qa_rejected_org@foodbridge.test',
        location: {
          type: 'Point',
          coordinates: [77.2090, 28.6139],
          address: 'Karol Bagh, New Delhi',
          city: 'New Delhi'
        },
        serviceRadiusKm: 15,
        verificationStatus: 'rejected',
        capacity: {
          maxMealsPerDay: 50,
          currentAvailableCapacity: 50,
          hasRefrigeration: false,
          hasWarmStorage: false,
          hasTransportFleet: false,
          activeVolunteers: 0
        },
        isDemo: true
      });
    }
    rejectedProvider = await User.create({
      name: 'Chef Rejected',
      email: 'qa_rejected_prov@foodbridge.test',
      passwordHash: 'hashed_password_placeholder',
      role: 'provider',
      phone: '+91 98765 43211',
      organizationId: rejectedOrg._id,
      isActive: true,
      isDemo: true
    });
  } else {
    await Organization.findByIdAndUpdate(rejectedProvider.organizationId, { verificationStatus: 'rejected' });
  }
  const rejectedToken = generateToken(rejectedProvider);

  // Find an NGO user
  const ngoUser = await User.findOne({ role: 'ngo' }).populate('organizationId');
  const ngoToken = ngoUser ? generateToken(ngoUser) : null;

  // ----------------------------------------------------
  // TEST 1: Valid food listing creation by verified provider
  // ----------------------------------------------------
  console.log('\n--- TEST 1: Valid food listing creation ---');
  const now = Date.now();
  const validPayload = {
    title: 'Surplus Banquet Thali Meal Trays',
    description: 'Freshly packed vegetarian thali meals from executive lunch buffet.',
    foodCategory: 'cooked_meals',
    dietaryType: 'veg',
    quantityMeals: 65,
    quantityKg: 26,
    preparationTime: new Date(now - 45 * 60 * 1000).toISOString(), // 45 min ago
    collectionDeadline: new Date(now + 4 * 60 * 60 * 1000).toISOString(), // 4 hours in future
    storageRequirement: 'hot_insulated',
    allergens: ['Dairy', 'Gluten'],
    address: 'Grand Spice Banquet, Block 4, Connaught Place',
    city: 'New Delhi',
    contactName: verifiedProvider.name || 'Head Chef',
    contactPhone: verifiedProvider.phone || '+91 98112 34567',
    pickupInstructions: 'Enter loading dock #3. Call upon arrival.',
  };

  try {
    const res = await axios.post(`${BASE_URL}/donations`, validPayload, {
      headers: { Authorization: `Bearer ${verifiedToken}` }
    });
    assert(res.status === 201, 'Status is 201 Created');
    assert(Boolean(res.data.donation?._id), 'Returns created donation ID', res.data.donation?._id);
    assert(res.data.donation.status === 'available', 'Donation initial status is available');
    assert(res.data.donation.quantityMeals === 65, 'Quantity meals matches payload');
    assert(res.data.donation.quantityKg === 26, 'Quantity kg matches payload');
    assert(res.data.donation.storageRequirement === 'hot_insulated', 'Storage requirement matches');
    createdDonationId = res.data.donation._id;
  } catch (err: any) {
    assert(false, 'Valid food listing creation', err.response?.data?.message || err.message);
  }

  // ----------------------------------------------------
  // TEST 2: MongoDB Persistence verification
  // ----------------------------------------------------
  console.log('\n--- TEST 2: MongoDB Persistence ---');
  if (createdDonationId) {
    const dbDonation = await Donation.findById(createdDonationId);
    assert(Boolean(dbDonation), 'Donation document persisted in MongoDB');
    assert(dbDonation?.title === validPayload.title, 'MongoDB title matches');
    assert(dbDonation?.providerId.toString() === verifiedProvider._id.toString(), 'Associated with authenticated provider ID');
    assert(Boolean(dbDonation?.pickupOtp), 'Secure pickup OTP generated');
    assert(Boolean(dbDonation?.pickupOtpHashed), 'Secure hashed pickup OTP persisted');
  }

  // ----------------------------------------------------
  // TEST 3: Visibility to eligible NGOs on NGO Dashboard
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Visibility on NGO Dashboard ---');
  try {
    const res = await axios.get(`${BASE_URL}/donations?status=available`, {
      headers: ngoToken ? { Authorization: `Bearer ${ngoToken}` } : {}
    });
    assert(res.status === 200, 'GET /api/donations?status=available returns 200');
    const found = res.data.donations?.find((d: any) => d._id === createdDonationId);
    assert(Boolean(found), 'Newly published donation is immediately visible in available surplus listing for NGOs');
  } catch (err: any) {
    assert(false, 'NGO available donations query', err.response?.data?.message || err.message);
  }

  // ----------------------------------------------------
  // TEST 4: Missing required fields validation
  // ----------------------------------------------------
  console.log('\n--- TEST 4: Missing required fields validation ---');
  // Missing title
  try {
    await axios.post(`${BASE_URL}/donations`, { ...validPayload, title: '' }, {
      headers: { Authorization: `Bearer ${verifiedToken}` }
    });
    assert(false, 'Missing title should fail');
  } catch (err: any) {
    assert(err.response?.status === 400, 'Missing title returns 400 Bad Request');
    assert(
      err.response?.data?.message?.toLowerCase().includes('title'),
      'Specific message for missing title',
      err.response?.data?.message
    );
  }

  // Missing pickup address
  try {
    await axios.post(`${BASE_URL}/donations`, { ...validPayload, address: '  ' }, {
      headers: { Authorization: `Bearer ${verifiedToken}` }
    });
    assert(false, 'Missing address should fail');
  } catch (err: any) {
    assert(err.response?.status === 400, 'Missing address returns 400 Bad Request');
    assert(
      err.response?.data?.message?.toLowerCase().includes('address'),
      'Specific message for missing address',
      err.response?.data?.message
    );
  }

  // Invalid quantity
  try {
    await axios.post(`${BASE_URL}/donations`, { ...validPayload, quantityMeals: 0 }, {
      headers: { Authorization: `Bearer ${verifiedToken}` }
    });
    assert(false, 'Zero quantity should fail');
  } catch (err: any) {
    assert(err.response?.status === 400, 'Zero quantity returns 400 Bad Request');
    assert(
      err.response?.data?.message?.toLowerCase().includes('quantity'),
      'Specific message for invalid quantity',
      err.response?.data?.message
    );
  }

  // ----------------------------------------------------
  // TEST 5: Invalid preparation time (future prep time)
  // ----------------------------------------------------
  console.log('\n--- TEST 5: Invalid preparation time (future prep time) ---');
  try {
    const futurePrep = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const futureDeadline = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
    await axios.post(`${BASE_URL}/donations`, {
      ...validPayload,
      preparationTime: futurePrep,
      collectionDeadline: futureDeadline
    }, {
      headers: { Authorization: `Bearer ${verifiedToken}` }
    });
    assert(false, 'Future prep time should fail');
  } catch (err: any) {
    assert(err.response?.status === 400, 'Future prep time returns 400 Bad Request');
    assert(
      err.response?.data?.message?.includes('Food preparation time cannot be set in the future'),
      'Specific message: preparation time cannot be in future',
      err.response?.data?.message
    );
  }

  // ----------------------------------------------------
  // TEST 6: Expired collection deadline (past deadline)
  // ----------------------------------------------------
  console.log('\n--- TEST 6: Expired collection deadline (past deadline) ---');
  try {
    const pastDeadline = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 min ago
    await axios.post(`${BASE_URL}/donations`, {
      ...validPayload,
      collectionDeadline: pastDeadline
    }, {
      headers: { Authorization: `Bearer ${verifiedToken}` }
    });
    assert(false, 'Past collection deadline should fail');
  } catch (err: any) {
    assert(err.response?.status === 400, 'Past collection deadline returns 400 Bad Request');
    assert(
      err.response?.data?.message?.includes('Collection deadline must be in the future'),
      'Specific message: collection deadline must be in future',
      err.response?.data?.message
    );
  }

  // ----------------------------------------------------
  // TEST 7: Deadline earlier than preparation time
  // ----------------------------------------------------
  console.log('\n--- TEST 7: Deadline earlier than preparation time ---');
  try {
    const prep = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 min ago
    const earlierDeadline = new Date(Date.now() - 45 * 60 * 1000).toISOString(); // 45 min ago
    await axios.post(`${BASE_URL}/donations`, {
      ...validPayload,
      preparationTime: prep,
      collectionDeadline: earlierDeadline
    }, {
      headers: { Authorization: `Bearer ${verifiedToken}` }
    });
    assert(false, 'Deadline earlier than prep time should fail');
  } catch (err: any) {
    assert(err.response?.status === 400, 'Deadline earlier than prep time returns 400 Bad Request');
    assert(
      err.response?.data?.message?.includes('cannot be earlier than food preparation time') ||
      err.response?.data?.message?.includes('Collection deadline must be in the future'),
      'Food safety rejection message returned',
      err.response?.data?.message
    );
  }

  // ----------------------------------------------------
  // TEST 8: Unsupported storage condition & room temp cooked limit
  // ----------------------------------------------------
  console.log('\n--- TEST 8: Unsupported storage conditions ---');
  try {
    await axios.post(`${BASE_URL}/donations`, {
      ...validPayload,
      storageRequirement: 'solar_powered_hyper_freeze'
    }, {
      headers: { Authorization: `Bearer ${verifiedToken}` }
    });
    assert(false, 'Unsupported storage requirement should fail');
  } catch (err: any) {
    assert(err.response?.status === 400, 'Unsupported storage returns 400 Bad Request');
    assert(
      err.response?.data?.message?.includes('storage requirement'),
      'Specific message for invalid storage requirement',
      err.response?.data?.message
    );
  }

  // Cooked meals at room temperature exceeding 6 hours safety threshold
  try {
    const prep = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hr ago
    const longDeadline = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); // 8 hrs ahead (9 hrs total)
    await axios.post(`${BASE_URL}/donations`, {
      ...validPayload,
      foodCategory: 'cooked_meals',
      storageRequirement: 'room_temperature',
      preparationTime: prep,
      collectionDeadline: longDeadline
    }, {
      headers: { Authorization: `Bearer ${verifiedToken}` }
    });
    assert(false, 'Room temperature cooked meals exceeding 6 hours should fail');
  } catch (err: any) {
    assert(err.response?.status === 400, 'Room temp cooked food exceeding 6h returns 400 Bad Request');
    assert(
      err.response?.data?.message?.includes('Cooked meals stored at room temperature cannot have a collection window exceeding 6 hours'),
      'Food safety constraint message returned for ambient cooked meals',
      err.response?.data?.message
    );
  }

  // ----------------------------------------------------
  // TEST 9: Unauthorized role (NGO trying to list surplus food)
  // ----------------------------------------------------
  console.log('\n--- TEST 9: Unauthorized role (NGO attempting to list donation) ---');
  if (ngoToken) {
    try {
      await axios.post(`${BASE_URL}/donations`, validPayload, {
        headers: { Authorization: `Bearer ${ngoToken}` }
      });
      assert(false, 'NGO role should not be able to list donation');
    } catch (err: any) {
      assert(err.response?.status === 403, 'NGO role returns 403 Forbidden');
      assert(
        err.response?.data?.message?.includes('Only food providers and administrators') ||
        err.response?.data?.message?.includes('Access denied'),
        'Specific role authorization error message',
        err.response?.data?.message
      );
    }
  }

  // ----------------------------------------------------
  // TEST 10: Unauthenticated request
  // ----------------------------------------------------
  console.log('\n--- TEST 10: Unauthenticated request ---');
  try {
    await axios.post(`${BASE_URL}/donations`, validPayload);
    assert(false, 'Unauthenticated request should fail');
  } catch (err: any) {
    assert(err.response?.status === 401, 'Unauthenticated request returns 401 Unauthorized');
    assert(
      err.response?.data?.message?.includes('Authentication token required') ||
      err.response?.data?.message?.includes('Authentication required'),
      'Specific authentication required message',
      err.response?.data?.message
    );
  }

  // ----------------------------------------------------
  // TEST 11: Pending Food Provider verification requirement
  // ----------------------------------------------------
  console.log('\n--- TEST 11: Pending Food Provider verification requirement ---');
  try {
    await axios.post(`${BASE_URL}/donations`, validPayload, {
      headers: { Authorization: `Bearer ${pendingToken}` }
    });
    assert(false, 'Pending provider should not be able to publish food listing');
  } catch (err: any) {
    assert(err.response?.status === 403, 'Pending provider returns 403 Forbidden');
    assert(
      err.response?.data?.message?.includes('pending administrator verification'),
      'Specific message: account pending administrator verification',
      err.response?.data?.message
    );
  }

  // ----------------------------------------------------
  // TEST 12: Rejected Food Provider verification rejection
  // ----------------------------------------------------
  console.log('\n--- TEST 12: Rejected Food Provider rejection ---');
  try {
    await axios.post(`${BASE_URL}/donations`, validPayload, {
      headers: { Authorization: `Bearer ${rejectedToken}` }
    });
    assert(false, 'Rejected provider should not be able to publish food listing');
  } catch (err: any) {
    assert(err.response?.status === 403, 'Rejected provider returns 403 Forbidden');
    assert(
      err.response?.data?.message?.includes('application was not approved'),
      'Specific message: application was not approved',
      err.response?.data?.message
    );
  }

  console.log(`\n========================================`);
  console.log(`TEST SUITE COMPLETE: ${testPassedCount} / ${testTotalCount} assertions passed`);
  console.log(`========================================\n`);

  await mongoose.disconnect();
}

runTestSuite().catch(err => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
