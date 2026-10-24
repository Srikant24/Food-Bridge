import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_URL = process.env.API_URL || 'http://localhost:5000';
import { connectDatabase } from '../config/db';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Donation } from '../models/Donation';
import { Notification } from '../models/Notification';

async function runTest() {
  console.log('\n================================================================');
  console.log('   FOODBRIDGE PROVIDER VERIFICATION WORKFLOW END-TO-END TEST    ');
  console.log('================================================================\n');

  await connectDatabase();
  console.log('✓ Connected to MongoDB for authoritative database verification.');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] #${totalTests}: ${testName}${detail ? ` -> ${detail}` : ''}`);
    } else {
      console.error(`  [FAIL] #${totalTests}: ${testName}${detail ? ` -> ${detail}` : ''}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  const timestamp = Date.now();
  const testProviderAlphaEmail = `test_chef_${timestamp}@foodbridge.test`;
  const testProviderBetaEmail = `test_baker_${timestamp}@foodbridge.test`;
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@foodbridge.org';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@1234';

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Provider Registration defaults to 'pending'
    // ------------------------------------------------------------------------
    console.log('\n--- Step 1: Testing Food Provider Registration ---');
    const regPayload = {
      name: 'Chef Arjun Mehra',
      email: testProviderAlphaEmail,
      password: 'Password@1234',
      role: 'provider',
      phone: '+91 98765 43210',
      organizationName: 'The Grand Heritage Banquet Hall',
      organizationType: 'restaurant',
      address: '42 Ring Road, Lajpat Nagar III',
      city: 'New Delhi',
    };

    const regRes = await axios.post(`${API_URL}/api/auth/register`, regPayload);
    assert(regRes.status === 201, 'Registration returns HTTP 201 Created');
    assert(regRes.data.user.role === 'provider', 'User role is canonically "provider"');
    assert(
      regRes.data.user.organization.verificationStatus === 'pending',
      'Registered organization verificationStatus defaults to "pending"',
      regRes.data.user.organization.verificationStatus
    );

    const alphaUserDb = await User.findOne({ email: testProviderAlphaEmail });
    assert(Boolean(alphaUserDb), 'Provider user persisted in MongoDB');
    assert(alphaUserDb?.role === 'provider', 'User model retains role="provider"');

    const alphaOrgDb = await Organization.findById(alphaUserDb?.organizationId);
    assert(Boolean(alphaOrgDb), 'Organization persisted in MongoDB');
    assert(alphaOrgDb?.verificationStatus === 'pending', 'Organization verificationStatus in DB is "pending"');

    const providerToken = regRes.data.token;

    // Check registration notification
    const regNotification = await Notification.findOne({
      userId: alphaUserDb?._id,
      type: 'registration',
    }).sort({ createdAt: -1 });
    assert(Boolean(regNotification), 'Registration welcome notification was enqueued/delivered');

    // ------------------------------------------------------------------------
    // TEST 2: Pending Provider Login & Access Barrier on Create Donation
    // ------------------------------------------------------------------------
    console.log('\n--- Step 2: Testing Pending Provider Login & Donation Creation Barrier ---');
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: testProviderAlphaEmail,
      password: 'Password@1234',
      portal: 'provider',
    });
    assert(loginRes.status === 200, 'Pending provider can sign in successfully');
    assert(loginRes.data.user.organization.verificationStatus === 'pending', 'Session retains verificationStatus: pending');

    // Attempt to publish donation while pending
    let donationBlocked = false;
    let blockReason = '';
    try {
      await axios.post(
        `${API_URL}/api/donations`,
        {
          title: '50 Fresh Biryani Meals',
          description: 'Excess banquet meals prepared under 2 hours ago.',
          foodCategory: 'cooked_meals',
          dietaryType: 'non_veg',
          quantityMeals: 50,
          quantityKg: 22.5,
          storageRequirement: 'hot_insulated',
          preparationTime: new Date(Date.now() - 3600000).toISOString(),
          collectionDeadline: new Date(Date.now() + 10800000).toISOString(),
        },
        {
          headers: { Authorization: `Bearer ${providerToken}` },
        }
      );
    } catch (err: any) {
      if (err.response?.status === 403) {
        donationBlocked = true;
        blockReason = err.response.data?.message || err.response.data?.error;
      }
    }
    assert(donationBlocked, 'Pending provider blocked from publishing food listing with HTTP 403 Forbidden', blockReason);

    // Verify no donation was saved
    const createdDonation = await Donation.findOne({ title: '50 Fresh Biryani Meals' });
    assert(!createdDonation, 'No donation listing created in database for unverified provider');

    // ------------------------------------------------------------------------
    // TEST 3: Admin Auth & Provider Verification Dashboard
    // ------------------------------------------------------------------------
    console.log('\n--- Step 3: Testing Administrator Endpoints & Role Protection ---');
    const adminLoginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: adminEmail,
      password: adminPassword,
      portal: 'admin',
    });
    assert(adminLoginRes.status === 200, 'Administrator logged in successfully');
    const adminToken = adminLoginRes.data.token;
    const adminUser = adminLoginRes.data.user;

    // Unauthorized attempt by provider to call admin verification endpoint
    let unauthorizedBlocked = false;
    try {
      await axios.post(
        `${API_URL}/api/admin/verify-provider/${alphaOrgDb?._id}`,
        { action: 'approve' },
        { headers: { Authorization: `Bearer ${providerToken}` } }
      );
    } catch (err: any) {
      if (err.response?.status === 403) {
        unauthorizedBlocked = true;
      }
    }
    assert(unauthorizedBlocked, 'Non-admin provider blocked from admin verification endpoint (HTTP 403)');

    // Query pending providers
    const pendingListRes = await axios.get(`${API_URL}/api/admin/providers?status=pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(pendingListRes.status === 200, 'Admin can fetch providers filtered by status=pending');
    const foundPendingAlpha = pendingListRes.data.providers.find((p: any) => p._id.toString() === alphaOrgDb?._id.toString());
    assert(Boolean(foundPendingAlpha), 'New provider appears in admin pending verification queue');
    assert(foundPendingAlpha.organizationName === 'The Grand Heritage Banquet Hall', 'Organization name matches');
    assert(foundPendingAlpha.email === testProviderAlphaEmail, 'Email matches');
    assert(foundPendingAlpha.phone === '+91 98765 43210', 'Phone number matches');
    assert(foundPendingAlpha.address === '42 Ring Road, Lajpat Nagar III', 'Facility address matches');

    // ------------------------------------------------------------------------
    // TEST 4: Administrator Approval Workflow
    // ------------------------------------------------------------------------
    console.log('\n--- Step 4: Testing Administrator Approval Action & Notification ---');
    const approveRes = await axios.post(
      `${API_URL}/api/admin/verify-provider/${alphaOrgDb?._id}`,
      { action: 'approve', notes: 'FSSAI hygiene license verified by administrative team.' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(approveRes.status === 200, 'Admin approval endpoint returned HTTP 200 OK');
    assert(
      approveRes.data.organization.verificationStatus === 'approved',
      'API confirms organization verificationStatus updated to "approved"'
    );

    // Verify in MongoDB
    const approvedOrgDb = await Organization.findById(alphaOrgDb?._id);
    assert(approvedOrgDb?.verificationStatus === 'approved', 'MongoDB status is "approved"');
    assert(Boolean(approvedOrgDb?.verifiedAt), 'MongoDB verifiedAt timestamp is set', approvedOrgDb?.verifiedAt?.toISOString());
    assert(
      approvedOrgDb?.verifiedBy?.toString() === adminUser.id.toString(),
      'MongoDB verifiedBy references the approving Administrator ID',
      approvedOrgDb?.verifiedBy?.toString()
    );

    // Verify provider role preserved
    const providerUserDbAfter = await User.findById(alphaUserDb?._id);
    assert(providerUserDbAfter?.role === 'provider', 'Provider user retains canonical "provider" role');

    // Verify approval notification in queue/logs
    const approvalNotif = await Notification.findOne({
      userId: alphaUserDb?._id,
      title: { $regex: /approved/i },
    }).sort({ createdAt: -1 });
    assert(Boolean(approvalNotif), 'Account approval notification enqueued/dispatched to provider');

    // ------------------------------------------------------------------------
    // TEST 5: Approved Provider Successful Food Listing Creation
    // ------------------------------------------------------------------------
    console.log('\n--- Step 5: Testing Approved Provider Food Listing Creation ---');
    // Fetch refreshed token/session
    const freshProviderLogin = await axios.post(`${API_URL}/api/auth/login`, {
      email: testProviderAlphaEmail,
      password: 'Password@1234',
      portal: 'provider',
    });
    assert(
      freshProviderLogin.data.user.organization.verificationStatus === 'approved',
      'Fresh login reflects approved status'
    );
    const freshToken = freshProviderLogin.data.token;

    const donationRes = await axios.post(
      `${API_URL}/api/donations`,
      {
        title: '50 Fresh Biryani Meals',
        description: 'Excess banquet meals prepared under 2 hours ago.',
        foodCategory: 'cooked_meals',
        dietaryType: 'non_veg',
        quantityMeals: 50,
        quantityKg: 22.5,
        storageRequirement: 'hot_insulated',
        preparationTime: new Date(Date.now() - 3600000).toISOString(),
        collectionDeadline: new Date(Date.now() + 10800000).toISOString(),
        address: '42 Ring Road, Lajpat Nagar III',
        city: 'New Delhi',
        contactName: 'Chef Arjun Mehra',
        contactPhone: '+91 98765 43210',
        pickupInstructions: 'Enter through banquet kitchen back gate.',
      },
      {
        headers: { Authorization: `Bearer ${freshToken}` },
      }
    );
    assert(donationRes.status === 201, 'Approved provider successfully created donation listing (HTTP 201)');
    assert(donationRes.data.donation.status === 'available', 'Donation listing is AVAILABLE for NGO pickup');

    const verifiedDonationInDb = await Donation.findById(donationRes.data.donation._id);
    assert(Boolean(verifiedDonationInDb), 'Donation listing successfully persisted in MongoDB');

    // ------------------------------------------------------------------------
    // TEST 6: Rejection Workflow & Reason Capture
    // ------------------------------------------------------------------------
    console.log('\n--- Step 6: Testing Provider Rejection Workflow ---');
    const betaRegRes = await axios.post(`${API_URL}/api/auth/register`, {
      name: 'Pooja Bhatia',
      email: testProviderBetaEmail,
      password: 'Password@1234',
      role: 'provider',
      phone: '+91 98111 22334',
      organizationName: 'Daily Crust Bakery',
      organizationType: 'restaurant',
      address: '12 Defence Colony Market',
      city: 'New Delhi',
    });
    assert(betaRegRes.status === 201, 'Second provider registered successfully');
    const betaOrgId = betaRegRes.data.user.organization.id;

    // Reject provider as admin
    const rejectNotes = 'Unable to verify commercial food establishment license. Please submit FSSAI certificate.';
    const rejectRes = await axios.post(
      `${API_URL}/api/admin/verify-provider/${betaOrgId}`,
      { action: 'reject', notes: rejectNotes },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(rejectRes.status === 200, 'Admin rejection returned HTTP 200');
    assert(rejectRes.data.organization.verificationStatus === 'rejected', 'Verification status set to "rejected"');

    const betaOrgDb = await Organization.findById(betaOrgId);
    assert(betaOrgDb?.verificationStatus === 'rejected', 'MongoDB reflects verificationStatus: rejected');
    assert(betaOrgDb?.verificationNotes === rejectNotes, 'MongoDB recorded rejection notes');

    // Verify rejection notification
    const betaUserDb = await User.findOne({ email: testProviderBetaEmail });
    const rejectNotif = await Notification.findOne({
      userId: betaUserDb?._id,
      title: { $regex: /verification|update/i },
    }).sort({ createdAt: -1 });
    assert(Boolean(rejectNotif), 'Rejection notification enqueued/dispatched to provider');

    // Rejected provider cannot create listings
    let betaListingBlocked = false;
    try {
      await axios.post(
        `${API_URL}/api/donations`,
        {
          title: '30 Surplus Pastries',
          description: 'Freshly baked croissants and muffins.',
          foodCategory: 'bakery',
          dietaryType: 'veg',
          quantityMeals: 30,
          quantityKg: 6,
          storageRequirement: 'room_temperature',
          preparationTime: new Date(Date.now() - 3600000).toISOString(),
          collectionDeadline: new Date(Date.now() + 18000000).toISOString(),
          address: '12 Defence Colony Market',
          city: 'New Delhi',
          contactName: 'Pooja Bhatia',
          contactPhone: '+91 98111 22334',
        },
        {
          headers: { Authorization: `Bearer ${betaRegRes.data.token}` },
        }
      );
    } catch (err: any) {
      if (err.response?.status === 403) betaListingBlocked = true;
    }
    assert(betaListingBlocked, 'Rejected provider blocked from creating listings (HTTP 403 Forbidden)');

    // ------------------------------------------------------------------------
    // TEST 7: Existing Accounts Preservation Check
    // ------------------------------------------------------------------------
    console.log('\n--- Step 7: Verifying Existing Database Accounts Are Unchanged ---');
    const existingUsers = await User.find({ role: 'provider' }).populate('organizationId').exec();
    assert(existingUsers.length >= 1, `Found ${existingUsers.length} provider accounts in database`);

    // Srikant Sharma's account check
    const srikantUser = await User.findOne({ email: 'sktsharma2003@gmail.com' }).populate('organizationId').exec();
    if (srikantUser) {
      assert(srikantUser.role === 'provider', 'Existing user sktsharma2003@gmail.com retains role="provider"');
      const org: any = srikantUser.organizationId;
      assert(Boolean(org), 'Existing user organization linked and intact');
      console.log(`  Existing provider organization status: ${org?.verificationStatus} (verified/approved)`);
    }

    console.log('\n================================================================');
    console.log(`✓ ALL ${passedTests} TEST ASSERTIONS PASSED SUCCESSFULLY!`);
    console.log('================================================================\n');

  } catch (error: any) {
    console.error('\n❌ TEST RUN FAILED:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runTest();
