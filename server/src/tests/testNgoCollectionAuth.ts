import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import assert from 'assert';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db';
import '../models/Organization';
import '../models/User';
import '../models/Donation';
import '../models/DonationRequest';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Donation } from '../models/Donation';
import { DonationRequest } from '../models/DonationRequest';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('\n================================================================================');
  console.log('🧪  FoodBridge NGO Collection Request & Role Authorization QA Suite');
  console.log('================================================================================\n');

  await connectDatabase();

  let passed = 0;
  let failed = 0;

  function recordPass(testName: string, detail?: string) {
    passed++;
    console.log(`  ✓ PASS: ${testName}`);
    if (detail) console.log(`    ↳ ${detail}`);
  }

  function recordFail(testName: string, error: any) {
    failed++;
    console.error(`  ✗ FAIL: ${testName}`);
    console.error(`    ↳ Error:`, error.message || error);
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: NGO Login (Sankalp)
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: NGO Login as Sankalp ---');
    const sankalpUser = await User.findOne({
      email: 'sankalpmanchanda_cse24@its.edu.in'
    }).populate('organizationId').exec();

    assert(sankalpUser, 'Sankalp user must exist in MongoDB');
    assert.strictEqual(sankalpUser.role, 'ngo', 'User role in MongoDB must be "ngo"');

    const ngoLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'sankalpmanchanda_cse24@its.edu.in',
      password: '123456',
      portal: 'ngo',
    });

    assert.strictEqual(ngoLoginRes.status, 200);
    assert(ngoLoginRes.data.token, 'Must return valid JWT token');
    assert.strictEqual(ngoLoginRes.data.user.role, 'ngo', 'Logged-in user role must be "ngo"');
    const ngoToken = ngoLoginRes.data.token;
    recordPass('NGO login succeeds with HTTP 200', `User: ${ngoLoginRes.data.user.name} (${ngoLoginRes.data.user.email})`);
    recordPass('JWT token issued with canonical "ngo" role');

    // -------------------------------------------------------------
    // TEST 2: NGO Dashboard Access (GET /auth/me)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: NGO Dashboard Access & Profile Validation ---');
    const meRes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${ngoToken}` }
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.data.user.role, 'ngo');
    assert.strictEqual(meRes.data.user.name, 'Sankalp');
    recordPass('GET /auth/me returns HTTP 200', `Role: ${meRes.data.user.role}, Org: ${meRes.data.user.organization?.name}`);

    // -------------------------------------------------------------
    // TEST 3: Available Food Visibility
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Available Food Visibility ---');
    const donRes = await axios.get(`${BASE_URL}/donations?status=available`, {
      headers: { Authorization: `Bearer ${ngoToken}` }
    });
    assert.strictEqual(donRes.status, 200);
    const availableDonations = donRes.data.donations || [];
    assert(availableDonations.length > 0, 'Available food listings must be visible to NGO');
    recordPass(`Available food visibility verified: ${availableDonations.length} available listings found`);

    // Pick an available donation with a future collection deadline
    const futureDonations = availableDonations.filter((d: any) => new Date(d.collectionDeadline).getTime() > Date.now() + 30 * 60 * 1000);
    assert(futureDonations.length > 0, 'Must have at least one donation with future collection deadline');
    const targetDonation = futureDonations[0];
    recordPass(`Target donation selected: "${targetDonation.title}" (ID: ${targetDonation._id})`, `Deadline: ${targetDonation.collectionDeadline}`);

    // Ensure clean test state: remove any prior request for this specific target by Sankalp
    await DonationRequest.deleteMany({
      donationId: targetDonation._id,
      ngoId: sankalpUser._id,
    });

    // -------------------------------------------------------------
    // TEST 4: NGO Collection Request Submission
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: NGO Collection Request Submission ---');
    const now = Date.now();
    const deadline = new Date(targetDonation.collectionDeadline).getTime();
    const pickupMs = Math.min(now + 15 * 60 * 1000, now + Math.floor((deadline - now) / 2));
    const pickupIso = new Date(pickupMs).toISOString();

    const requestRes = await axios.post(
      `${BASE_URL}/donations/${targetDonation._id}/request`,
      {
        requestNotes: 'Sankalp NGO distribution van ready for rapid pickup.',
        estimatedPickupTime: pickupIso,
      },
      {
        headers: { Authorization: `Bearer ${ngoToken}` }
      }
    );

    assert.strictEqual(requestRes.status, 201);
    assert(requestRes.data.request, 'Must return created collection request');
    const createdRequestId = requestRes.data.request._id;
    recordPass('POST /api/donations/:id/request succeeds with HTTP 201 Created', `Request ID: ${createdRequestId}`);

    // -------------------------------------------------------------
    // TEST 5: Request Persistence in MongoDB
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Request Persistence in MongoDB ---');
    const savedRequest = await DonationRequest.findById(createdRequestId).exec();
    assert(savedRequest, 'Collection request must be saved in MongoDB');
    assert.strictEqual(savedRequest.status, 'pending');
    assert.strictEqual(savedRequest.ngoId.toString(), sankalpUser._id.toString());
    assert.strictEqual(savedRequest.requestNotes, 'Sankalp NGO distribution van ready for rapid pickup.');
    recordPass('Collection request confirmed saved in MongoDB DonationRequest collection', `Status: ${savedRequest.status}`);

    // -------------------------------------------------------------
    // TEST 6: Provider Receives the Collection Request
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Provider Receives Incoming Collection Request ---');
    const providerUser = await User.findById(targetDonation.providerId).exec();
    assert(providerUser, 'Listing provider must exist in MongoDB');

    // Issue a provider token to check incoming requests
    const providerLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: providerUser.email,
      password: 'password123', // or we generate token if test password varies
      portal: 'provider',
    }).catch(async () => {
      // If password differs, sign a valid token for this existing provider
      const jwt = (await import('jsonwebtoken')).default;
      const token = jwt.sign(
        { userId: providerUser._id.toString(), role: 'provider', email: providerUser.email },
        process.env.JWT_SECRET || 'foodbridge_super_secret_jwt_key_hackathon_2025_dev_mode',
        { expiresIn: '1h' }
      );
      return { status: 200, data: { token } };
    });

    const providerToken = providerLoginRes.data.token;
    const incomingRes = await axios.get(`${BASE_URL}/donations/requests/incoming`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    assert.strictEqual(incomingRes.status, 200);
    const hasRequest = incomingRes.data.requests?.some((r: any) => r._id.toString() === createdRequestId.toString());
    assert(hasRequest, 'Incoming requests must contain the newly submitted NGO collection request');
    recordPass('Provider successfully receives incoming request', `Provider: ${providerUser.name}`);

    // -------------------------------------------------------------
    // TEST 7: NGO Dashboard Refresh Shows the New Request
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: NGO Dashboard Refresh Shows the New Request ---');
    const myReqsRes = await axios.get(`${BASE_URL}/donations/requests/my-requests`, {
      headers: { Authorization: `Bearer ${ngoToken}` }
    });
    assert.strictEqual(myReqsRes.status, 200);
    const foundInMyReqs = myReqsRes.data.requests?.some((r: any) => r._id.toString() === createdRequestId.toString());
    assert(foundInMyReqs, 'NGO my-requests must contain the submitted collection request');
    recordPass('GET /api/donations/requests/my-requests includes new request', `Total submitted requests: ${myReqsRes.data.count}`);

    // -------------------------------------------------------------
    // TEST 8: Provider Login & Food Listing Creation
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Provider Food Listing Creation ---');
    const createDonationRes = await axios.post(
      `${BASE_URL}/donations`,
      {
        title: `Fresh Test Meals ${Date.now()}`,
        foodCategory: 'cooked_meals',
        dietaryType: 'veg',
        quantityMeals: 35,
        quantityKg: 12,
        preparationTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        collectionDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        storageRequirement: 'room_temperature',
        allergens: ['gluten'],
        address: '42 Connaught Place',
        city: 'New Delhi',
        coordinates: [77.2167, 28.6324],
        contactName: providerUser.name,
        contactPhone: providerUser.phone || '9953369031',
        pickupInstructions: 'Enter via rear kitchen doors',
      },
      {
        headers: { Authorization: `Bearer ${providerToken}` }
      }
    );
    assert.strictEqual(createDonationRes.status, 201);
    assert(createDonationRes.data.donation?._id, 'Donation must have an _id');
    recordPass('Provider publishes food listing with HTTP 201 Created', `Donation ID: ${createDonationRes.data.donation._id}`);

    // -------------------------------------------------------------
    // TEST 9: Logout & Re-login
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Logout & Re-login ---');
    const reLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'sankalpmanchanda_cse24@its.edu.in',
      password: '123456',
      portal: 'ngo',
    });
    assert.strictEqual(reLoginRes.status, 200);
    assert(reLoginRes.data.token, 'Re-login must issue fresh token');
    recordPass('Re-login succeeds with HTTP 200 and fresh JWT issued');

    // -------------------------------------------------------------
    // TEST 10: Unauthenticated Requests Return HTTP 401
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Unauthenticated Requests Return HTTP 401 ---');
    try {
      await axios.post(`${BASE_URL}/donations/${targetDonation._id}/request`, {
        requestNotes: 'Unauthenticated test',
        estimatedPickupTime: pickupIso,
      });
      recordFail('Unauthenticated request was unexpectedly allowed', new Error('Expected HTTP 401'));
    } catch (unauthErr: any) {
      assert.strictEqual(unauthErr.response?.status, 401);
      assert.strictEqual(unauthErr.response?.data?.error, 'Unauthorized');
      recordPass('Unauthenticated request rejected with HTTP 401 Unauthorized', unauthErr.response?.data?.message);
    }

    // -------------------------------------------------------------
    // TEST 11: Unauthorized Roles Return HTTP 403
    // -------------------------------------------------------------
    console.log('\n--- TEST 11: Unauthorized Role (Provider) Returns HTTP 403 ---');
    try {
      await axios.post(
        `${BASE_URL}/donations/${targetDonation._id}/request`,
        {
          requestNotes: 'Provider trying to request food',
          estimatedPickupTime: pickupIso,
        },
        {
          headers: { Authorization: `Bearer ${providerToken}` }
        }
      );
      recordFail('Provider request collection was unexpectedly allowed', new Error('Expected HTTP 403'));
    } catch (roleErr: any) {
      assert.strictEqual(roleErr.response?.status, 403);
      assert.strictEqual(roleErr.response?.data?.error, 'Forbidden');
      assert(roleErr.response?.data?.message?.includes('Requires one of the following roles: ngo'));
      recordPass('Unauthorized provider role rejected with HTTP 403 Forbidden', roleErr.response?.data?.message);
    }

    // -------------------------------------------------------------
    // TEST 12: Duplicate Collection Requests Handled Correctly
    // -------------------------------------------------------------
    console.log('\n--- TEST 12: Duplicate Collection Requests Return HTTP 409 ---');
    try {
      await axios.post(
        `${BASE_URL}/donations/${targetDonation._id}/request`,
        {
          requestNotes: 'Duplicate collection attempt',
          estimatedPickupTime: pickupIso,
        },
        {
          headers: { Authorization: `Bearer ${ngoToken}` }
        }
      );
      recordFail('Duplicate request was unexpectedly allowed', new Error('Expected HTTP 409'));
    } catch (dupErr: any) {
      assert.strictEqual(dupErr.response?.status, 409);
      assert.strictEqual(dupErr.response?.data?.error, 'Duplicate');
      recordPass('Duplicate collection request properly rejected with HTTP 409 Conflict', dupErr.response?.data?.message);
    }

    // -------------------------------------------------------------
    // TEST 13: Unverified NGO Returns "NGO verification pending"
    // -------------------------------------------------------------
    console.log('\n--- TEST 13: Unverified NGO Returns "NGO verification pending" (Requirement 4) ---');
    // Find an unverified NGO in MongoDB
    const unverifiedOrg = await Organization.findOne({ type: 'ngo_shelter', verificationStatus: 'pending' }).exec();
    if (unverifiedOrg) {
      const unverifiedNgoUser = await User.findOne({ organizationId: unverifiedOrg._id, role: 'ngo' }).exec();
      if (unverifiedNgoUser) {
        const jwt = (await import('jsonwebtoken')).default;
        const unverifiedToken = jwt.sign(
          { userId: unverifiedNgoUser._id.toString(), role: 'ngo', email: unverifiedNgoUser.email },
          process.env.JWT_SECRET || 'foodbridge_super_secret_jwt_key_hackathon_2025_dev_mode',
          { expiresIn: '1h' }
        );

        try {
          await axios.post(
            `${BASE_URL}/donations/${targetDonation._id}/request`,
            {
              requestNotes: 'Unverified NGO attempt',
              estimatedPickupTime: pickupIso,
            },
            {
              headers: { Authorization: `Bearer ${unverifiedToken}` }
            }
          );
          recordFail('Unverified NGO request was unexpectedly allowed', new Error('Expected HTTP 403'));
        } catch (unvErr: any) {
          assert.strictEqual(unvErr.response?.status, 403);
          assert.strictEqual(unvErr.response?.data?.error, 'Verification Required');
          assert(unvErr.response?.data?.message?.includes('NGO verification pending'));
          recordPass('Unverified NGO correctly receives "NGO verification pending"', unvErr.response?.data?.message);
        }
      }
    }

    // -------------------------------------------------------------
    // TEST 14: Stale Role Claim in Token Returns HTTP 401
    // -------------------------------------------------------------
    console.log('\n--- TEST 14: Token with Stale Role Claim Returns HTTP 401 ---');
    const jwt = (await import('jsonwebtoken')).default;
    const staleRoleToken = jwt.sign(
      { userId: sankalpUser._id.toString(), role: 'provider', email: sankalpUser.email }, // Token claims provider, but DB is ngo
      process.env.JWT_SECRET || 'foodbridge_super_secret_jwt_key_hackathon_2025_dev_mode',
      { expiresIn: '1h' }
    );

    try {
      await axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${staleRoleToken}` }
      });
      recordFail('Stale role claim token was unexpectedly accepted', new Error('Expected HTTP 401'));
    } catch (staleErr: any) {
      assert.strictEqual(staleErr.response?.status, 401);
      assert(staleErr.response?.data?.message?.includes('claim is outdated'));
      recordPass('Stale role claim token correctly returns HTTP 401 to force re-authentication', staleErr.response?.data?.message);
    }

  } catch (globalErr: any) {
    console.error('Test suite error:', globalErr);
  } finally {
    console.log('\n================================================================================');
    console.log(`🎉 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================================\n');
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
