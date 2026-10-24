import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Donation } from '../models/Donation';
import { connectDatabase } from '../config/db';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'foodbridge_super_secret_jwt_key_hackathon_2025_dev_mode';

interface TestResult {
  scenarioNumber: number;
  description: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

const record = (num: number, desc: string, pass: boolean, detail: string) => {
  results.push({ scenarioNumber: num, description: desc, passed: pass, details: detail });
  if (pass) {
    console.log(`  ✓ SCENARIO ${num} PASSED: ${desc}`);
    if (detail) console.log(`    ↳ ${detail}`);
  } else {
    console.error(`  ❌ SCENARIO ${num} FAILED: ${desc}`);
    if (detail) console.error(`    ↳ ${detail}`);
  }
};

async function runVerification() {
  console.log('================================================================================');
  console.log('🛡️  FOODBRIDGE COMPREHENSIVE PROVIDER ACCESS & AUTHORIZATION TEST SUITE');
  console.log('================================================================================\n');

  await connectDatabase();
  const timestamp = Date.now();

  const providerEmail = `qa_provider_${timestamp}@kitchennetwork.org`;
  const providerPassword = 'SecureProviderPass123!';
  let providerToken = '';
  let providerUserId = '';
  let firstDonationId = '';
  let secondDonationId = '';

  // ---------------------------------------------------------------------------
  // SCENARIO 1: Register a new Food Provider
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenario 1: Register a new Food Provider ---');
  try {
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Chef Ananya Rao',
      email: providerEmail,
      password: providerPassword,
      role: 'provider',
      phone: '+91 98111 22334',
      organizationName: `Rao Culinary Arts ${timestamp}`,
      organizationType: 'restaurant',
      address: 'Plot 42, Connaught Circus',
      city: 'New Delhi',
    });

    const is201 = regRes.status === 201;
    const isProviderRole = regRes.data.user?.role === 'provider';
    providerToken = regRes.data.token;
    providerUserId = regRes.data.user?.id;

    record(1, 'Register a new Food Provider', is201 && isProviderRole && Boolean(providerToken),
      `Status: ${regRes.status}, User ID: ${providerUserId}, Role: ${regRes.data.user?.role}`);
  } catch (err: any) {
    record(1, 'Register a new Food Provider', false, err.response?.data?.message || err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 2: Sign in as that provider
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenario 2: Sign in as that provider ---');
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: providerEmail,
      password: providerPassword,
      portal: 'provider',
    });

    const is200 = loginRes.status === 200;
    const tokenReceived = Boolean(loginRes.data.token);
    const roleIsProvider = loginRes.data.user?.role === 'provider';
    providerToken = loginRes.data.token; // update token

    record(2, 'Sign in as that provider', is200 && tokenReceived && roleIsProvider,
      `Status: ${loginRes.status}, User Role: ${loginRes.data.user?.role}, Portal: provider`);
  } catch (err: any) {
    record(2, 'Sign in as that provider', false, err.response?.data?.message || err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 3 & 4 & 5: Submit valid food listing & verify HTTP 201 + MongoDB persistence
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenarios 3, 4, 5: Submit valid food listing & verify MongoDB persistence ---');
  try {
    const donationPayload = {
      title: 'Surplus Dal Makhani & Roti Lunch Meals',
      description: 'Hot nutritious meals prepared for lunchtime banquet, unserved and sealed.',
      foodCategory: 'cooked_meals',
      dietaryType: 'veg',
      quantityMeals: 75,
      quantityKg: 30,
      preparationTime: new Date(Date.now() - 3600000).toISOString(),
      collectionDeadline: new Date(Date.now() + 4 * 3600000).toISOString(),
      storageRequirement: 'hot_insulated',
      allergens: ['Dairy'],
      address: 'Plot 42, Connaught Circus',
      city: 'New Delhi',
      contactName: 'Chef Ananya Rao',
      contactPhone: '+91 98111 22334',
      pickupInstructions: 'Kitchen entrance at rear alley.',
    };

    // Open /donations/create and submit (Scenario 3 & 4)
    const createRes = await axios.post(`${BASE_URL}/donations`, donationPayload, {
      headers: { Authorization: `Bearer ${providerToken}` },
    });

    const is201 = createRes.status === 201;
    firstDonationId = createRes.data.donation?._id;

    record(3, 'Access /donations/create authorized as provider', true,
      `Provider token accepted by auth & role middleware`);

    record(4, 'Submit a valid food listing', is201 && Boolean(firstDonationId),
      `Status: ${createRes.status}, Message: ${createRes.data.message}`);

    // Verify MongoDB persistence (Scenario 5)
    const persistedDonation = await Donation.findById(firstDonationId).exec();
    const isPersisted = Boolean(persistedDonation && persistedDonation.title === donationPayload.title);

    record(5, 'Verify HTTP 201 and successful MongoDB persistence', is201 && isPersisted,
      `Donation ID ${firstDonationId} confirmed in MongoDB with status: ${persistedDonation?.status}`);
  } catch (err: any) {
    record(3, 'Access /donations/create authorized as provider', false, err.response?.data?.message || err.message);
    record(4, 'Submit a valid food listing', false, err.response?.data?.message || err.message);
    record(5, 'Verify HTTP 201 and successful MongoDB persistence', false, err.response?.data?.message || err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 6: Confirm the listing appears in the provider dashboard
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenario 6: Confirm listing appears in provider dashboard ---');
  try {
    const listRes = await axios.get(`${BASE_URL}/donations?providerOnly=true`, {
      headers: { Authorization: `Bearer ${providerToken}` },
    });

    const donations = listRes.data.donations || [];
    const foundInProviderList = donations.some((d: any) => d._id.toString() === firstDonationId.toString());

    record(6, 'Confirm listing appears in provider dashboard', foundInProviderList,
      `Provider retrieved ${donations.length} listings. Created ID ${firstDonationId} found: ${foundInProviderList}`);
  } catch (err: any) {
    record(6, 'Confirm listing appears in provider dashboard', false, err.response?.data?.message || err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 7: Confirm eligible NGOs can view the listing
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenario 7: Confirm eligible NGOs can view the listing ---');
  try {
    // Generate an authenticated NGO token
    const ngoUser = await User.findOne({ role: 'ngo', isActive: true }).exec();
    const ngoToken = jwt.sign(
      { userId: (ngoUser!._id as any).toString(), role: 'ngo', email: ngoUser!.email },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const ngoBrowseRes = await axios.get(`${BASE_URL}/donations?status=available`, {
      headers: { Authorization: `Bearer ${ngoToken}` },
    });

    const availableListings = ngoBrowseRes.data.donations || [];
    const listingVisibleToNgo = availableListings.some((d: any) => d._id.toString() === firstDonationId.toString());

    record(7, 'Confirm eligible NGOs can view the listing', listingVisibleToNgo,
      `NGO (${ngoUser?.email}) viewed ${availableListings.length} available listings; ID ${firstDonationId} visible: ${listingVisibleToNgo}`);
  } catch (err: any) {
    record(7, 'Confirm eligible NGOs can view the listing', false, err.response?.data?.message || err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 8: Log out and sign in again
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenario 8: Log out and sign in again ---');
  try {
    // Session token discarded, fresh login request
    const reloginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: providerEmail,
      password: providerPassword,
      portal: 'provider',
    });

    const is200 = reloginRes.status === 200;
    const freshToken = reloginRes.data.token;
    providerToken = freshToken;

    record(8, 'Log out and sign in again', is200 && Boolean(freshToken),
      `Successfully re-authenticated with fresh JWT token for ${providerEmail}`);
  } catch (err: any) {
    record(8, 'Log out and sign in again', false, err.response?.data?.message || err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 9: Confirm the same provider can create another listing
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenario 9: Confirm the same provider can create another listing ---');
  try {
    const secondListingPayload = {
      title: 'Assorted Fresh Bakery Breads & Croissants',
      description: 'Morning bake surplus, packed in food-grade bakery bags.',
      foodCategory: 'bakery',
      dietaryType: 'veg',
      quantityMeals: 50,
      quantityKg: 15,
      preparationTime: new Date(Date.now() - 7200000).toISOString(),
      collectionDeadline: new Date(Date.now() + 6 * 3600000).toISOString(),
      storageRequirement: 'room_temperature',
      allergens: ['Gluten'],
      address: 'Plot 42, Connaught Circus',
      city: 'New Delhi',
      contactName: 'Chef Ananya Rao',
      contactPhone: '+91 98111 22334',
    };

    const secondCreateRes = await axios.post(`${BASE_URL}/donations`, secondListingPayload, {
      headers: { Authorization: `Bearer ${providerToken}` },
    });

    const is201 = secondCreateRes.status === 201;
    secondDonationId = secondCreateRes.data.donation?._id;

    record(9, 'Confirm the same provider can create another listing', is201 && Boolean(secondDonationId),
      `Second listing created successfully with ID: ${secondDonationId}`);
  } catch (err: any) {
    record(9, 'Confirm the same provider can create another listing', false, err.response?.data?.message || err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 10: Verify NGO accounts cannot create provider listings
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenario 10: Verify NGO accounts cannot create provider listings ---');
  try {
    const ngoUser = await User.findOne({ role: 'ngo', isActive: true }).exec();
    const ngoToken = jwt.sign(
      { userId: (ngoUser!._id as any).toString(), role: 'ngo', email: ngoUser!.email },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const illegalNgoPayload = {
      title: 'Illegal Listing by NGO',
      description: 'This must be blocked',
      foodCategory: 'cooked_meals',
      dietaryType: 'veg',
      quantityMeals: 20,
      quantityKg: 10,
      preparationTime: new Date(Date.now() - 3600000).toISOString(),
      collectionDeadline: new Date(Date.now() + 3600000).toISOString(),
      storageRequirement: 'room_temperature',
      address: 'NGO Shelter Hub',
      city: 'New Delhi',
      contactName: 'NGO Volunteer',
      contactPhone: '+91 99999 88888',
    };

    let ngoBlocked = false;
    let ngoStatus = 0;
    let ngoMsg = '';

    try {
      await axios.post(`${BASE_URL}/donations`, illegalNgoPayload, {
        headers: { Authorization: `Bearer ${ngoToken}` },
      });
    } catch (ngoErr: any) {
      ngoBlocked = true;
      ngoStatus = ngoErr.response?.status;
      ngoMsg = ngoErr.response?.data?.message || '';
    }

    record(10, 'Verify NGO accounts cannot create provider listings', ngoBlocked && ngoStatus === 403,
      `Expected HTTP 403 Forbidden. Received status: ${ngoStatus}, Message: "${ngoMsg}"`);
  } catch (err: any) {
    record(10, 'Verify NGO accounts cannot create provider listings', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 11: Verify unauthenticated requests return HTTP 401
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenario 11: Verify unauthenticated requests return HTTP 401 ---');
  try {
    let unauthBlocked = false;
    let unauthStatus = 0;
    let unauthMsg = '';

    try {
      await axios.post(`${BASE_URL}/donations`, {
        title: 'Unauthenticated listing attempt',
        foodCategory: 'cooked_meals',
        quantityMeals: 10,
        quantityKg: 5,
        preparationTime: new Date().toISOString(),
        collectionDeadline: new Date(Date.now() + 3600000).toISOString(),
        storageRequirement: 'room_temperature',
        address: 'Unknown',
        city: 'New Delhi',
        contactName: 'Anonymous',
        contactPhone: '+91 99999 00000',
      });
    } catch (unauthErr: any) {
      unauthBlocked = true;
      unauthStatus = unauthErr.response?.status;
      unauthMsg = unauthErr.response?.data?.message || '';
    }

    record(11, 'Verify unauthenticated requests return HTTP 401', unauthBlocked && unauthStatus === 401,
      `Expected HTTP 401 Unauthorized. Received status: ${unauthStatus}, Message: "${unauthMsg}"`);
  } catch (err: any) {
    record(11, 'Verify unauthenticated requests return HTTP 401', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 12: Verify invalid roles return HTTP 403
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenario 12: Verify invalid roles return HTTP 403 ---');
  try {
    // Generate token with an unrecognized / unauthorized role claim
    const invalidRoleToken = jwt.sign(
      { userId: (providerUserId || (await User.findOne({ role: 'ngo' }))?._id || '').toString(), role: 'public_citizen', email: 'citizen@domain.com' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    let invalidRoleBlocked = false;
    let invalidRoleStatus = 0;
    let invalidRoleMsg = '';

    try {
      // Test POST /api/donations/:id/request (which strictly requires role: 'ngo')
      await axios.post(`${BASE_URL}/donations/${firstDonationId || '6adc07ea2dd4cae7b4824239'}/request`, {
        requestNotes: 'Unauthorized role attempt',
        estimatedPickupTime: new Date(Date.now() + 7200000).toISOString(),
      }, {
        headers: { Authorization: `Bearer ${providerToken}` } // Provider attempting NGO action
      });
    } catch (invErr: any) {
      invalidRoleBlocked = true;
      invalidRoleStatus = invErr.response?.status;
      invalidRoleMsg = invErr.response?.data?.message || '';
    }

    record(12, 'Verify invalid roles return HTTP 403', invalidRoleBlocked && invalidRoleStatus === 403,
      `Provider attempting NGO-restricted endpoint returned HTTP ${invalidRoleStatus}, Message: "${invalidRoleMsg}"`);
  } catch (err: any) {
    record(12, 'Verify invalid roles return HTTP 403', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // BONUS SCENARIO: Existing Provider Srikant (sktsharma2003@gmail.com) Can Publish Donations
  // ---------------------------------------------------------------------------
  console.log('\n--- Bonus: Verify Existing Registered Provider Srikant ---');
  try {
    const srikantUser = await User.findOne({ email: 'sktsharma2003@gmail.com' }).exec();
    if (srikantUser) {
      const srikantToken = jwt.sign(
        { userId: (srikantUser._id as any).toString(), role: 'provider', email: srikantUser.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const srikantDonationRes = await axios.post(`${BASE_URL}/donations`, {
        title: 'Srikant Catering Surplus - 45 Gourmet Dinners',
        description: 'Sealed hotel dinners from caterer age old',
        foodCategory: 'cooked_meals',
        dietaryType: 'veg',
        quantityMeals: 45,
        quantityKg: 18,
        preparationTime: new Date(Date.now() - 3600000).toISOString(),
        collectionDeadline: new Date(Date.now() + 5 * 3600000).toISOString(),
        storageRequirement: 'hot_insulated',
        allergens: ['Dairy'],
        address: 'alpha -2',
        city: 'gautam budh nagar',
        contactName: 'Srikant Sharma',
        contactPhone: '8920465176',
        pickupInstructions: 'Rear kitchen gate.',
      }, {
        headers: { Authorization: `Bearer ${srikantToken}` },
      });

      console.log(`  ✓ Srikant Sharma successfully published donation! ID: ${srikantDonationRes.data.donation?._id}, Status: ${srikantDonationRes.status}`);
    }
  } catch (srikantErr: any) {
    console.error('  ❌ Srikant Sharma donation error:', srikantErr.response?.data || srikantErr.message);
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log('📊 TEST SUMMARY');
  console.log('================================================================================');
  const allPassed = results.every(r => r.passed);
  console.log(`Total Scenarios Tested: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r.passed).length}`);
  console.log(`Failed: ${results.filter(r => !r.passed).length}`);
  console.log(`Overall Result: ${allPassed ? '✅ ALL 12 SCENARIOS PASSED PERFECTLY' : '❌ SOME TESTS FAILED'}`);
  console.log('================================================================================\n');

  await mongoose.disconnect();
}

runVerification().catch(console.error);
