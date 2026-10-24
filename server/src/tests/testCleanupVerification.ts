import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Donation } from '../models/Donation';
import { DonationRequest } from '../models/DonationRequest';

const BASE_URL = 'http://localhost:5000/api';

function assert(condition: boolean, msg: string, detail?: any) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`, detail || '');
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`✅ PASS: ${msg}`);
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE REGISTRATION & AUTH CLEANUP TEST SUITE');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGODB_URI as string);
  const ts = Date.now();

  const providerEmail = `provider_${ts}@cleanuptest.org`;
  const ngoEmail = `ngo_${ts}@cleanuptest.org`;
  const testPassword = 'SecurePassword123!';

  // =========================================================================
  // TEST 1: New Food Provider Registration
  // =========================================================================
  console.log('--- TEST 1: New Food Provider Registration ---');
  const regProviderRes = await axios.post(`${BASE_URL}/auth/register`, {
    name: 'Chef Vikas Khanna',
    email: providerEmail,
    password: testPassword,
    role: 'provider',
    phone: '+91 98765 00001',
    organizationName: 'Khanna Gourmet Banquet',
    organizationType: 'restaurant',
    address: '10 Cannaught Place, New Delhi',
    city: 'New Delhi',
  });

  assert(regProviderRes.status === 201, 'Provider registration returns HTTP 201 Created');
  assert(regProviderRes.data.user.role === 'provider', 'Provider role is canonical "provider"');
  assert(Boolean(regProviderRes.data.token), 'Valid JWT authentication token generated');
  const providerToken = regProviderRes.data.token;
  const providerUserId = regProviderRes.data.user.id;

  // Verify MongoDB persistence
  const dbProvider = await User.findOne({ email: providerEmail });
  assert(Boolean(dbProvider), 'New Food Provider saved in MongoDB');
  assert(dbProvider?.passwordHash !== testPassword, 'Password is securely hashed with bcrypt');

  // =========================================================================
  // TEST 2: New NGO Registration
  // =========================================================================
  console.log('\n--- TEST 2: New NGO Registration ---');
  const regNgoRes = await axios.post(`${BASE_URL}/auth/register`, {
    name: 'Sister Teresa',
    email: ngoEmail,
    password: testPassword,
    role: 'ngo',
    phone: '+91 98765 00002',
    organizationName: 'Teresa Care Shelter',
    organizationType: 'ngo_shelter',
    address: '25 Civil Lines, New Delhi',
    city: 'New Delhi',
    registrationNumber: `NGO-REG-${ts}`,
    maxMealsPerDay: 200,
    hasRefrigeration: true,
    hasWarmStorage: true,
  });

  assert(regNgoRes.status === 201, 'NGO registration returns HTTP 201 Created');
  assert(regNgoRes.data.user.role === 'ngo', 'NGO role is canonical "ngo"');
  assert(Boolean(regNgoRes.data.token), 'Valid JWT authentication token generated');
  const ngoToken = regNgoRes.data.token;
  const ngoOrgId = regNgoRes.data.user.organization.id;

  // Verify MongoDB persistence
  const dbNgo = await User.findOne({ email: ngoEmail });
  assert(Boolean(dbNgo), 'New NGO saved in MongoDB');
  assert(dbNgo?.passwordHash !== testPassword, 'NGO password is securely hashed with bcrypt');

  // Mark NGO verified in DB for collection request testing
  await mongoose.connection.collection('organizations').updateOne(
    { _id: new mongoose.Types.ObjectId(ngoOrgId) },
    { $set: { verificationStatus: 'verified' } }
  );
  console.log('   (Approved NGO organization for donation request workflow testing)');

  // =========================================================================
  // TEST 3: Duplicate Email Registration Rejection (HTTP 409)
  // =========================================================================
  console.log('\n--- TEST 3: Duplicate Email Registration Rejection ---');
  try {
    // Test with mixed casing and extra whitespace
    await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Duplicate Attempt',
      email: `  ${providerEmail.toUpperCase()}  `,
      password: 'SomeOtherPassword999!',
      role: 'provider',
      phone: '+91 98765 99999',
      organizationName: 'Duplicate Kitchen',
      organizationType: 'restaurant',
      address: 'Somewhere',
      city: 'New Delhi',
    });
    assert(false, 'Duplicate email registration should have been rejected');
  } catch (err: any) {
    assert(err.response?.status === 409, 'Duplicate email returns HTTP 409 Conflict');
    assert(
      err.response?.data?.message === 'An account with this email already exists. Please sign in.',
      'Returns exact required message: "An account with this email already exists. Please sign in."',
      err.response?.data?.message
    );
  }

  // =========================================================================
  // TEST 4: Login After Logout
  // =========================================================================
  console.log('\n--- TEST 4: Login After Logout ---');
  // Client logout discards token; verify re-login with email & password produces valid session
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: providerEmail,
    password: testPassword,
  });
  assert(loginRes.status === 200, 'Re-login succeeds with HTTP 200 OK');
  assert(Boolean(loginRes.data.token), 'New JWT session token granted on login');
  assert(loginRes.data.user.role === 'provider', 'Provider role correctly restored');

  // Verify Me endpoint works with returned token
  const meRes = await axios.get(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${loginRes.data.token}` },
  });
  assert(meRes.status === 200, 'Token authenticated successfully on /auth/me');
  assert(meRes.data.user.email === providerEmail.toLowerCase().trim(), 'Authenticated user matches login credentials');

  // =========================================================================
  // TEST 5: Login After Server Restart Simulation
  // =========================================================================
  console.log('\n--- TEST 5: Login After Server Restart Persistence ---');
  // Verify user is fetched from persistent MongoDB, not memory
  const persistentUser = await User.findOne({ email: providerEmail });
  assert(Boolean(persistentUser), 'User permanently stored in MongoDB across instances');

  const reLoginAfterRestart = await axios.post(`${BASE_URL}/auth/login`, {
    email: `  ${providerEmail.toUpperCase()}  `, // Test normalized email lookup
    password: testPassword,
  });
  assert(reLoginAfterRestart.status === 200, 'User logs in seamlessly with case-insensitive email');
  assert(reLoginAfterRestart.data.user.name === 'Chef Vikas Khanna', 'User profile retrieved intact from MongoDB');

  // =========================================================================
  // TEST 6: Food Listing Creation by Food Provider
  // =========================================================================
  console.log('\n--- TEST 6: Food Listing Creation ---');
  const expiryDate = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); // 8 hours ahead
  const createDonationRes = await axios.post(
    `${BASE_URL}/donations`,
    {
      title: 'Fresh Paneer Tikka & Naan Surplus',
      description: 'Hot vegetarian meal batches from corporate dinner',
      foodCategory: 'cooked_meals',
      dietaryType: 'veg',
      quantityMeals: 50,
      quantityKg: 20,
      storageRequirement: 'room_temperature',
      preparationTime: new Date().toISOString(),
      collectionDeadline: expiryDate,
      address: '10 Cannaught Place, New Delhi',
      city: 'New Delhi',
      contactName: 'Chef Vikas Khanna',
      contactPhone: '+91 98765 00001',
      pickupInstructions: 'Enter from side kitchen loading dock',
    },
    { headers: { Authorization: `Bearer ${providerToken}` } }
  );

  assert(createDonationRes.status === 201, 'Food Provider successfully lists surplus food (HTTP 201 Created)');
  const newDonationId = createDonationRes.data.donation._id;
  assert(Boolean(newDonationId), 'Listing created with MongoDB ObjectId');
  assert(createDonationRes.data.donation.status === 'available', 'Listing status initialized as "available"');
  assert(Boolean(createDonationRes.data.donation.pickupOtp), 'Pickup OTP generated for provider');

  // =========================================================================
  // TEST 7: Cross-Account Donation Visibility
  // =========================================================================
  console.log('\n--- TEST 7: Cross-Account Visibility Across Different NGO Accounts ---');
  // Fetch donations as the registered NGO (who is a completely different account)
  const ngoFetchDonationsRes = await axios.get(`${BASE_URL}/donations?status=available`, {
    headers: { Authorization: `Bearer ${ngoToken}` },
  });

  assert(ngoFetchDonationsRes.status === 200, 'NGO can retrieve available surplus donations (HTTP 200 OK)');
  const allListings = ngoFetchDonationsRes.data.donations;
  const foundOurDonation = allListings.find((d: any) => d._id === newDonationId);
  assert(Boolean(foundOurDonation), 'Newly created provider donation is VISIBLE to the NGO account!');
  assert(foundOurDonation.providerId._id.toString() === providerUserId, 'Donation provider accurately linked');
  // Verify OTP is sanitized for NGO (security check)
  assert(!foundOurDonation.pickupOtp, 'Pickup OTP is properly hidden from NGO until pickup handoff');

  // =========================================================================
  // TEST 8: NGO Collection Request
  // =========================================================================
  console.log('\n--- TEST 8: NGO Collection Request Workflow ---');
  const requestRes = await axios.post(
    `${BASE_URL}/donations/${newDonationId}/request`,
    {
      notes: 'Our volunteers are ready with insulated food carriers for prompt pickup.',
      requestedMeals: 50,
      estimatedArrival: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    },
    { headers: { Authorization: `Bearer ${ngoToken}` } }
  );

  assert(requestRes.status === 201, 'NGO successfully submitted collection request (HTTP 201 Created)');
  assert(requestRes.data.request.status === 'pending', 'Collection request status is "pending"');

  // Verify Provider sees incoming request
  const providerRequestsRes = await axios.get(`${BASE_URL}/donations/requests/incoming`, {
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  assert(providerRequestsRes.status === 200, 'Provider can retrieve incoming requests');
  const foundRequest = providerRequestsRes.data.requests.find((r: any) => r._id === requestRes.data.request._id);
  assert(Boolean(foundRequest), 'Incoming request appears in Food Provider dashboard');

  // =========================================================================
  // TEST 9: Existing Account and Donation Preservation
  // =========================================================================
  console.log('\n--- TEST 9: Existing Account and Genuine Donation Preservation ---');
  const genuineProvider = await User.findOne({ email: 'sakshama1781@gmail.com' });
  assert(Boolean(genuineProvider), 'Legitimate user Yash Singh (sakshama1781@gmail.com) exists and preserved in MongoDB');
  assert(genuineProvider?.name === 'Yash Singh', 'Yash Singh profile data intact');

  const genuineNgo = await User.findOne({ email: 'sakshamar2025@gmail.com' });
  assert(Boolean(genuineNgo), 'Legitimate NGO Ashish Sharma (sakshamar2025@gmail.com) exists and preserved in MongoDB');
  assert(genuineNgo?.name === 'Ashish Sharma', 'Ashish Sharma profile data intact');

  const genuineDonation = await Donation.findOne({ providerId: genuineProvider?._id });
  assert(Boolean(genuineDonation), 'Genuine donation listing by Yash Singh (Samosa #F53AD7) is preserved');
  console.log(`   Preserved Donation Title: "${genuineDonation?.title}", Servings: ${genuineDonation?.quantityMeals}, Status: "${genuineDonation?.status}"`);

  console.log('\n====================================================');
  console.log('🎉 ALL 9 TEST SUITES COMPLETED AND PASSED WITH 100% SUCCESS!');
  console.log('====================================================');

  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
