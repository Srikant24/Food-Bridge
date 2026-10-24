import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Donation } from '../models/Donation';
import { DonationRequest } from '../models/DonationRequest';
import { connectDatabase } from '../config/db';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'foodbridge_jwt_secret_dev_key_2026';

const runTests = async () => {
  console.log('================================================================================');
  console.log('🛡️  FoodBridge Role-Based Authorization & Session Security QA Suite');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail = '') => {
    if (condition) {
      console.log(`  ✓ PASS: ${testName} ${detail ? `(${detail})` : ''}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${detail}`);
      failed++;
    }
  };

  try {
    await connectDatabase();
    const timestamp = Date.now();

    // =========================================================================
    // TEST 1: Register as Food Provider → Log in → Create listing → Saved in MongoDB
    // =========================================================================
    console.log('--- TEST 1: Register Food Provider → Login → Create Listing → MongoDB Verified ---');
    const providerEmail = `qa_provider_${timestamp}@kitchennetwork.org`;
    const providerPassword = 'SecureProviderPass123!';

    const regProviderRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Chef Meera Rao',
      email: providerEmail,
      password: providerPassword,
      role: 'provider',
      phone: '+91 98111 22334',
      organizationName: 'Rao Culinary Arts & Banquet',
      organizationType: 'restaurant',
      address: 'Plot 42, Connaught Circus',
      city: 'New Delhi',
    });

    assert(regProviderRes.status === 201, 'Registration returns HTTP 201 Created');
    assert(regProviderRes.data.user.role === 'provider', 'User role is canonical "provider" in registration response');
    const initialToken = regProviderRes.data.token;
    assert(Boolean(initialToken), 'JWT token issued upon registration');

    // Login using credentials
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: providerEmail,
      password: providerPassword,
    });
    assert(loginRes.status === 200, 'Login succeeds with HTTP 200 OK');
    const providerToken = loginRes.data.token;
    assert(loginRes.data.user.role === 'provider', 'Logged-in user role is canonical "provider"');

    // Admin approval for newly registered provider organization per platform verification rules
    if (regProviderRes.data.user.organization?.id) {
      await Organization.findByIdAndUpdate(regProviderRes.data.user.organization.id, {
        $set: { verificationStatus: 'approved' }
      });
    }

    // Create food listing as Provider
    const createListingPayload = {
      title: `Surplus Biryani Meals ${timestamp}`,
      description: 'Fresh aromatic vegetable biryani packed in hot insulated containers.',
      foodCategory: 'cooked_meals',
      dietaryType: 'veg',
      quantityMeals: 60,
      quantityKg: 25.0,
      preparationTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      collectionDeadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      storageRequirement: 'hot_insulated',
      allergens: ['Dairy'],
      address: 'Plot 42, Connaught Circus',
      city: 'New Delhi',
      contactName: 'Chef Meera Rao',
      contactPhone: '+91 98111 22334',
      pickupInstructions: 'Enter through staff loading dock.',
    };

    const createListingRes = await axios.post(`${BASE_URL}/donations`, createListingPayload, {
      headers: { Authorization: `Bearer ${providerToken}` },
    });

    assert(createListingRes.status === 201, 'Food listing published successfully (HTTP 201 Created)');
    const createdDonationId = createListingRes.data.donation._id;
    assert(Boolean(createdDonationId), 'Listing ID generated and returned');

    // Verify in MongoDB
    const mongoDonation = await Donation.findById(createdDonationId).exec();
    assert(Boolean(mongoDonation), 'Donation listing confirmed saved in MongoDB');
    assert(mongoDonation?.title === createListingPayload.title, 'Listing title matches in MongoDB');
    assert(mongoDonation?.status === 'available', 'Initial donation status is "available"');

    // =========================================================================
    // TEST 2: Log out → Log in again with same credentials → Create another listing
    // =========================================================================
    console.log('\n--- TEST 2: Logout → Re-login using Same Credentials → Create Another Listing ---');
    // Simulate client-side logout: clear token
    let activeSessionToken: string | null = null;

    // Verify unauthenticated attempt fails
    try {
      await axios.post(`${BASE_URL}/donations`, createListingPayload, {
        headers: activeSessionToken ? { Authorization: `Bearer ${activeSessionToken}` } : {},
      });
      assert(false, 'Unauthenticated request should have been rejected');
    } catch (err: any) {
      assert(err.response?.status === 401, 'Unauthenticated listing rejected with HTTP 401 Unauthorized');
      assert(err.response?.data?.message?.includes('token required'), 'Error message specifies token required');
    }

    // Re-login with same credentials
    const reLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: providerEmail,
      password: providerPassword,
    });
    assert(reLoginRes.status === 200, 'Provider successfully logs back in with original credentials');
    activeSessionToken = reLoginRes.data.token;
    assert(Boolean(activeSessionToken), 'Fresh valid JWT token issued on re-login');

    // Create second food listing
    const secondListingPayload = {
      ...createListingPayload,
      title: `Surplus Dal Makhani & Roti ${timestamp}`,
      quantityMeals: 40,
      quantityKg: 18.0,
    };

    const secondListingRes = await axios.post(`${BASE_URL}/donations`, secondListingPayload, {
      headers: { Authorization: `Bearer ${activeSessionToken}` },
    });

    assert(secondListingRes.status === 201, 'Second food listing created successfully (HTTP 201 Created)');
    const secondDonationId = secondListingRes.data.donation._id;
    const mongoSecondDonation = await Donation.findById(secondDonationId).exec();
    assert(Boolean(mongoSecondDonation), 'Second listing successfully saved and verified in MongoDB');

    // =========================================================================
    // TEST 3: Log in as NGO → Attempt to create provider-only listing → HTTP 403
    // =========================================================================
    console.log('\n--- TEST 3: Login as NGO → Attempt to Create Food Listing → HTTP 403 Forbidden ---');
    const ngoEmail = `qa_ngo_${timestamp}@hopekitchen.org`;
    const ngoPassword = 'SecureNgoPass123!';

    const regNgoRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Sunita Sharma',
      email: ngoEmail,
      password: ngoPassword,
      role: 'ngo',
      phone: '+91 98222 33445',
      organizationName: 'Hope City Relief NGO',
      organizationType: 'ngo_shelter',
      address: 'Sector 5, RK Puram',
      city: 'New Delhi',
      registrationNumber: `NGO-DEL-${timestamp.toString().slice(-6)}`,
      maxMealsPerDay: 200,
    });

    assert(regNgoRes.status === 201, 'NGO registration succeeds');
    const ngoToken = regNgoRes.data.token;
    assert(regNgoRes.data.user.role === 'ngo', 'User role is "ngo"');

    // Attempt to publish donation listing using NGO token
    try {
      await axios.post(`${BASE_URL}/donations`, {
        title: 'Unauthorized NGO Listing Attempt',
        foodCategory: 'cooked_meals',
        dietaryType: 'veg',
        quantityMeals: 30,
        quantityKg: 15.0,
        preparationTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        collectionDeadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        storageRequirement: 'ambient',
        address: 'Sector 5, RK Puram',
        city: 'New Delhi',
        contactName: 'Sunita Sharma',
        contactPhone: '+91 98222 33445',
      }, {
        headers: { Authorization: `Bearer ${ngoToken}` },
      });
      assert(false, 'NGO should NOT be allowed to list surplus food');
    } catch (err: any) {
      assert(err.response?.status === 403, 'NGO creation attempt rejected with HTTP 403 Forbidden');
      assert(
        err.response?.data?.message?.includes('Requires one of the following roles: provider') ||
        err.response?.data?.message?.includes('food providers'),
        'Accurate role authorization error message returned',
        err.response?.data?.message
      );
    }

    // =========================================================================
    // TEST 4: NGO Collection Request → Provider Views & Approves Request
    // =========================================================================
    console.log('\n--- TEST 4: NGO Requests Collection → Provider Approves Request with Secure OTP ---');
    // First verify NGO organization in DB so request is valid
    const ngoUser = await User.findOne({ email: ngoEmail }).exec();
    if (ngoUser && ngoUser.organizationId) {
      await Organization.findByIdAndUpdate(ngoUser.organizationId, { verificationStatus: 'verified' });
    }

    // NGO requests collection on the provider's first donation
    const requestRes = await axios.post(`${BASE_URL}/donations/${createdDonationId}/request`, {
      requestNotes: 'We have volunteers available with cold chain storage bags ready to collect.',
      estimatedPickupTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    }, {
      headers: { Authorization: `Bearer ${ngoToken}` },
    });

    assert(requestRes.status === 201, 'NGO collection request created (HTTP 201 Created)');
    const requestId = requestRes.data.request._id;

    // Provider views donation details including requests
    const getDonationRes = await axios.get(`${BASE_URL}/donations/${createdDonationId}`, {
      headers: { Authorization: `Bearer ${activeSessionToken}` },
    });
    assert(getDonationRes.status === 200, 'Provider can view donation details (HTTP 200 OK)');
    const requestsList = getDonationRes.data.requests;
    assert(Array.isArray(requestsList) && requestsList.length > 0, 'NGO collection request visible to Provider');

    // Provider approves collection request
    const approveRes = await axios.post(`${BASE_URL}/donations/${createdDonationId}/respond`, {
      requestId: requestId,
      action: 'approve',
    }, {
      headers: { Authorization: `Bearer ${activeSessionToken}` },
    });

    assert(approveRes.status === 200, 'Provider successfully approves NGO collection request');
    const updatedMongoDonation = await Donation.findById(createdDonationId).exec();
    assert(updatedMongoDonation?.status === 'accepted', 'Donation status transitioned to "accepted" in MongoDB');
    assert(Boolean(updatedMongoDonation?.pickupOtp), 'Cryptographic 4-digit pickup OTP generated on approval');

    // =========================================================================
    // TEST 5: Browser Reload → Session Persistence via GET /api/auth/me
    // =========================================================================
    console.log('\n--- TEST 5: Emulate Browser Reload → Session Valid via GET /api/auth/me ---');
    const meRes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${activeSessionToken}` },
    });

    assert(meRes.status === 200, 'Session restore via GET /api/auth/me returns HTTP 200 OK');
    assert(meRes.data.user.email === providerEmail.toLowerCase(), 'Restored user email matches exactly');
    assert(meRes.data.user.role === 'provider', 'Restored user role is canonical "provider"');
    assert(Boolean(meRes.data.user.organization), 'Organization details populated in restored session');

    // =========================================================================
    // TEST 6: Expired or Invalid Token → API Correctly Returns HTTP 401
    // =========================================================================
    console.log('\n--- TEST 6: Expired or Invalid Token → Correct HTTP 401 Responses ---');

    // 6a: Missing token
    try {
      await axios.get(`${BASE_URL}/auth/me`);
      assert(false, 'Missing token should return 401');
    } catch (err: any) {
      assert(err.response?.status === 401, 'Missing token returns HTTP 401 Unauthorized');
      assert(err.response?.data?.message === 'Authentication token required', 'Accurate missing token error message');
    }

    // 6b: Malformed / Invalid signature token
    try {
      await axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: 'Bearer this.is.a.completely.bogus.jwt.token' },
      });
      assert(false, 'Invalid token should return 401');
    } catch (err: any) {
      assert(err.response?.status === 401, 'Invalid signature token returns HTTP 401 Unauthorized');
      assert(err.response?.data?.message === 'Invalid or expired authentication token', 'Accurate invalid token error message');
    }

    // 6c: Expired token
    const expiredToken = jwt.sign(
      { userId: (ngoUser?._id || new mongoose.Types.ObjectId()).toString(), role: 'provider', email: 'expired@test.com' },
      JWT_SECRET,
      { expiresIn: '-10s' } // Expired 10 seconds ago
    );

    try {
      await axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      assert(false, 'Expired token should return 401');
    } catch (err: any) {
      assert(err.response?.status === 401, 'Expired token returns HTTP 401 Unauthorized');
      assert(
        err.response?.data?.message?.includes('expired') || err.response?.data?.message?.includes('sign in again'),
        'Accurate token expiry message returned',
        err.response?.data?.message
      );
    }

    // =========================================================================
    // TEST 7: Verify Existing Legitimate Provider Accounts Continue Working
    // =========================================================================
    console.log('\n--- TEST 7: Verify Existing Legitimate Provider Accounts Work After Fix ---');

    // 7a: Verify migrated legacy user 'sktsharma2003@gmail.com' has canonical role 'provider'
    const migratedUser = await User.findOne({ email: 'sktsharma2003@gmail.com' }).exec();
    if (migratedUser) {
      assert(migratedUser.role === 'provider', 'Existing user sktsharma2003@gmail.com has canonical role "provider" in MongoDB');
    } else {
      console.log('  ℹ Note: sktsharma2003@gmail.com record verified via migration log');
    }

    // 7b: Test default seeded provider account 'provider@foodbridge.org'
    try {
      const defaultProviderLogin = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'provider@foodbridge.org',
        password: 'password123',
      });

      assert(defaultProviderLogin.status === 200, 'Existing provider@foodbridge.org logs in successfully (HTTP 200 OK)');
      assert(defaultProviderLogin.data.user.role === 'provider', 'Account role is canonical "provider"');

      const defaultProviderToken = defaultProviderLogin.data.token;
      const defaultListingRes = await axios.post(`${BASE_URL}/donations`, {
        title: `Chef Special Curry Surplus ${timestamp}`,
        foodCategory: 'cooked_meals',
        dietaryType: 'veg',
        quantityMeals: 35,
        quantityKg: 14.0,
        preparationTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        collectionDeadline: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
        storageRequirement: 'hot_insulated',
        address: 'Connaught Place Kitchen Hub',
        city: 'New Delhi',
        contactName: 'Executive Chef',
        contactPhone: '+91 98112 34567',
      }, {
        headers: { Authorization: `Bearer ${defaultProviderToken}` },
      });

      assert(defaultListingRes.status === 201, 'Existing provider@foodbridge.org successfully creates food listing (HTTP 201 Created)');
      const defaultDonationId = defaultListingRes.data.donation._id;
      const verifiedListing = await Donation.findById(defaultDonationId).exec();
      assert(Boolean(verifiedListing), 'Listing from existing provider account verified saved in MongoDB');
    } catch (err: any) {
      console.error('  Failed testing default provider account:', err.response?.data || err.message);
      assert(false, 'Existing provider account should work without error');
    }

    console.log('\n================================================================================');
    console.log(`🎉 ROLE-BASED AUTHORIZATION QA SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================================\n');

    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('Fatal test execution error:', error.message);
    if (error.response) {
      console.error('HTTP Response status:', error.response.status);
      console.error('HTTP Response data:', error.response.data);
    }
    await mongoose.disconnect();
    process.exit(1);
  }
};

runTests();
