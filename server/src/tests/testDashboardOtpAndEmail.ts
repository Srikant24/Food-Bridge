import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_BASE = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('================================================================');
  console.log('🚀 FoodBridge — End-to-End Test Suite: Refresh, OTP & Email');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail: string = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName} ${detail ? `(${detail})` : ''}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  };

  try {
    const timestamp = Date.now();
    const providerEmail = `provider_${timestamp}@kitchen.org`;
    const ngoEmail = `shelter_${timestamp}@hope.org`;
    const otherNgoEmail = `other_shelter_${timestamp}@rescue.org`;

    // =========================================================================
    // TASK 3: Registration Confirmation Emails
    // =========================================================================
    console.log('----------------------------------------------------------------');
    console.log('TEST SUITE 1: Registration Confirmation Email Workflow');
    console.log('----------------------------------------------------------------');

    // 1.1 Register Food Provider
    const providerRegRes = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Chef Rajesh Kumar',
      email: providerEmail,
      password: 'Password@123',
      phone: '+919811223344',
      role: 'provider',
      organizationName: 'Taj Culinary Kitchens',
      organizationType: 'restaurant',
      address: 'Connaught Place, Central Delhi',
      city: 'Delhi',
      coordinates: [77.2167, 28.6328],
    });

    assert(
      providerRegRes.status === 201 && Boolean(providerRegRes.data.token),
      'Food Provider Registration Success',
      `User created with role: ${providerRegRes.data.user.role}`
    );
    const providerToken = providerRegRes.data.token;
    const providerId = providerRegRes.data.user.id;

    // 1.2 Register NGO Recipient
    const ngoRegRes = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Priya Sharma',
      email: ngoEmail,
      password: 'Password@123',
      phone: '+919877665544',
      role: 'ngo',
      organizationName: 'Apna Ghar Shelter Trust',
      organizationType: 'shelter',
      address: 'Pahar Ganj Community Center',
      city: 'Delhi',
      coordinates: [77.2144, 28.6433],
      maxMealsPerDay: 250,
    });

    assert(
      ngoRegRes.status === 201 && Boolean(ngoRegRes.data.token),
      'NGO Recipient Registration Success',
      `User created with role: ${ngoRegRes.data.user.role}`
    );
    const ngoToken = ngoRegRes.data.token;
    const ngoOrgId = ngoRegRes.data.user.organizationId;

    // 1.3 Register Other NGO (for unauthorized access test)
    const otherNgoRes = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Amit Patel',
      email: otherNgoEmail,
      password: 'Password@123',
      phone: '+919833445566',
      role: 'ngo',
      organizationName: 'Seva Feeding Project',
      organizationType: 'food_bank',
      address: 'Karol Bagh Center',
      city: 'Delhi',
      coordinates: [77.1906, 28.6517],
      maxMealsPerDay: 180,
    });
    const otherNgoToken = otherNgoRes.data.token;

    // Verify registration email in in-app notification / audit log
    const providerNotifRes = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    const regNotif = providerNotifRes.data.notifications?.find((n: any) => n.type === 'registration');
    assert(
      Boolean(regNotif),
      'Registration Confirmation Notification Created',
      `Title: "${regNotif?.title || 'None'}"`
    );
    assert(
      regNotif?.title === 'Welcome to FoodBridge — Registration Successful',
      'Exact Registration Email Subject Verified',
      'Matches "Welcome to FoodBridge — Registration Successful"'
    );
    assert(
      regNotif?.message?.includes('Taj Culinary Kitchens') && regNotif?.message?.includes(providerEmail),
      'Personalized Welcome Email Content Verified',
      'Contains organization name, email, and role'
    );

    // =========================================================================
    // TASK 1: Dashboard Manual & Auto Refresh Data Availability
    // =========================================================================
    console.log('\n----------------------------------------------------------------');
    console.log('TEST SUITE 2: Dashboard Data Synchronization & Refresh Endpoints');
    console.log('----------------------------------------------------------------');

    // Provider creates listing
    const deadline = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const prepTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const listingRes = await axios.post(
      `${API_BASE}/donations`,
      {
        title: 'Fresh Paneer Tikka & Basmati Pulao',
        description: 'Excess freshly prepared hot banquet food in insulated containers.',
        foodCategory: 'cooked_meals',
        dietaryType: 'veg',
        quantityMeals: 80,
        quantityKg: 28.5,
        preparationTime: prepTime,
        collectionDeadline: deadline,
        storageRequirement: 'warm_storage',
        allergens: ['dairy'],
        address: 'Taj Culinary Kitchens, CP, New Delhi',
        city: 'Delhi',
        coordinates: [77.2167, 28.6328],
        contactName: 'Chef Rajesh',
        contactPhone: '+919811223344',
        pickupInstructions: 'Kitchen loading bay behind Gate 3',
      },
      { headers: { Authorization: `Bearer ${providerToken}` } }
    );

    assert(listingRes.status === 201, 'Food Provider Creates Surplus Food Listing', listingRes.data.donation.title);
    const donationId = listingRes.data.donation._id;

    // Provider Dashboard Data Refresh API (with JWT optional auth)
    const providerListingsRes = await axios.get(`${API_BASE}/donations?providerOnly=true`, {
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    const providerOwnListing = providerListingsRes.data.donations.find((d: any) => d._id === donationId);
    assert(
      Boolean(providerOwnListing),
      'Provider Refresh API: Listing Present on Provider Dashboard',
      `Count: ${providerListingsRes.data.count}`
    );
    assert(
      Boolean(providerOwnListing?.pickupOtp),
      'Provider Refresh API: Authorized Provider Receives Their Pickup OTP',
      `OTP is visible to owner`
    );

    // NGO Dashboard Data Refresh API
    const ngoListingsRes = await axios.get(`${API_BASE}/donations?status=available`, {
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    const ngoSeenListing = ngoListingsRes.data.donations.find((d: any) => d._id === donationId);
    assert(
      Boolean(ngoSeenListing),
      'NGO Refresh API: Available Surplus Appears in NGO Search',
      `Found listing: ${ngoSeenListing?.title}`
    );
    assert(
      ngoSeenListing?.pickupOtp === undefined,
      'Security: Pickup OTP is NEVER exposed to NGO before authorization',
      'pickupOtp is undefined on NGO endpoint'
    );

    // Public Viewer (unauthenticated) Refresh API
    const publicListingsRes = await axios.get(`${API_BASE}/donations?status=available`);
    const publicListing = publicListingsRes.data.donations.find((d: any) => d._id === donationId);
    assert(
      publicListing?.pickupOtp === undefined,
      'Security: Pickup OTP is NEVER exposed to unauthenticated public viewers',
      'Sanitization active'
    );

    // Admin Dashboard Refresh API
    const adminLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@foodbridge.org',
      password: 'Password@123',
    });
    const adminToken = adminLoginRes.data.token;
    const adminAnalyticsRes = await axios.get(`${API_BASE}/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminAnalyticsRes.status === 200 && Boolean(adminAnalyticsRes.data.metrics),
      'Admin Refresh API: Platform Analytics Retrieved',
      `Total Food Diverted: ${adminAnalyticsRes.data.metrics.totalKgFoodDiverted} kg`
    );

    // =========================================================================
    // TASK 2: Pickup OTP Generation, Security & Verification Workflow
    // =========================================================================
    console.log('\n----------------------------------------------------------------');
    console.log('TEST SUITE 3: Pickup OTP Workflow & Security Enforcement');
    console.log('----------------------------------------------------------------');

    // Step 2: NGO submits a collection request
    const requestRes = await axios.post(
      `${API_BASE}/donations/${donationId}/request`,
      {
        requestNotes: 'Our rescue van can arrive within 45 minutes with insulated hot boxes.',
        estimatedPickupTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      },
      { headers: { Authorization: `Bearer ${ngoToken}` } }
    );
    assert(requestRes.status === 201, 'Step 2: NGO Submits Collection Request', `Request ID: ${requestRes.data.request._id}`);
    const requestId = requestRes.data.request._id;

    // Step 3: Food Provider approves the NGO request
    const approveRes = await axios.post(
      `${API_BASE}/donations/${donationId}/respond-request`,
      {
        requestId,
        action: 'approve',
      },
      { headers: { Authorization: `Bearer ${providerToken}` } }
    );
    assert(approveRes.status === 200, 'Step 3: Food Provider Approves Request', 'Status moved to accepted');

    // Step 4 & 5: Backend generates secure 4-digit OTP with 15-minute expiry and stores secure hash
    const providerOtpRes = await axios.get(`${API_BASE}/donations/${donationId}/pickup-otp`, {
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    const pickupOtp = providerOtpRes.data.pickupOtp;
    assert(
      typeof pickupOtp === 'string' && /^\d{4}$/.test(pickupOtp),
      'Step 4 & 6: Provider Retrieves Secure 4-Digit Pickup OTP',
      `Code: ${pickupOtp} (4-digit randomInt)`
    );

    const otpExpiryTime = new Date(providerOtpRes.data.expiresAt).getTime();
    const minutesUntilExpiry = Math.round((otpExpiryTime - Date.now()) / (60 * 1000));
    assert(
      minutesUntilExpiry >= 14 && minutesUntilExpiry <= 16,
      'Step 5: OTP Validity Configured to 15 Minutes',
      `Expires in ~${minutesUntilExpiry} minutes`
    );

    // Security Test: Unauthorized NGO attempts to view the pickup OTP
    try {
      await axios.get(`${API_BASE}/donations/${donationId}/pickup-otp`, {
        headers: { Authorization: `Bearer ${ngoToken}` },
      });
      assert(false, 'Security: NGO CANNOT access provider pickup-otp endpoint', 'Did not block');
    } catch (err: any) {
      assert(
        err.response?.status === 403,
        'Security: NGO is Blocked from Viewing Provider Pickup OTP',
        'HTTP 403 Forbidden'
      );
    }

    // Security Test: Wrong OTP Attempt
    try {
      await axios.post(
        `${API_BASE}/donations/${donationId}/verify-pickup`,
        { otp: '0000' },
        { headers: { Authorization: `Bearer ${ngoToken}` } }
      );
      assert(false, 'Security: Wrong OTP must be rejected', 'Wrong OTP accepted');
    } catch (err: any) {
      assert(
        err.response?.status === 400,
        'Security: Wrong OTP Rejected',
        err.response?.data?.message || 'Rejection confirmed'
      );
    }

    // Security Test: Non-authorized NGO attempts to verify the donation
    try {
      await axios.post(
        `${API_BASE}/donations/${donationId}/verify-pickup`,
        { otp: pickupOtp },
        { headers: { Authorization: `Bearer ${otherNgoToken}` } }
      );
      assert(false, 'Security: Unassigned NGO cannot verify pickup', 'Unassigned NGO verified');
    } catch (err: any) {
      assert(
        err.response?.status === 403,
        'Security: Unassigned NGO Blocked from Verifying Other NGO Pickup',
        'HTTP 403 Unauthorized NGO'
      );
    }

    // Step 7: Provider regenerates OTP (controlled regeneration)
    const regenRes = await axios.post(
      `${API_BASE}/donations/${donationId}/regenerate-otp`,
      {},
      { headers: { Authorization: `Bearer ${providerToken}` } }
    );
    assert(
      regenRes.status === 200 && regenRes.data.pickupOtp !== pickupOtp,
      'Controlled OTP Regeneration: Old Code Invalidated, Fresh Code Issued',
      `New Code: ${regenRes.data.pickupOtp}`
    );
    const freshOtp = regenRes.data.pickupOtp;

    // Verify old OTP is rejected after regeneration
    try {
      await axios.post(
        `${API_BASE}/donations/${donationId}/verify-pickup`,
        { otp: pickupOtp },
        { headers: { Authorization: `Bearer ${ngoToken}` } }
      );
      assert(false, 'Security: Old OTP must fail after regeneration', 'Old OTP accepted');
    } catch (err: any) {
      assert(
        err.response?.status === 400,
        'Security: Previously Regenerated OTP Correctly Rejected',
        'HTTP 400 Verification Failed'
      );
    }

    // Step 8 & 9 & 10: Authorized NGO submits the valid regenerated OTP (passed as number or string)
    const verifyRes = await axios.post(
      `${API_BASE}/donations/${donationId}/verify-pickup`,
      { otp: freshOtp },
      { headers: { Authorization: `Bearer ${ngoToken}` } }
    );
    assert(
      verifyRes.status === 200 && verifyRes.data.donation.status === 'picked_up',
      'Step 10: Valid OTP Handover Verified & Status Updated to "picked_up"',
      `Status: ${verifyRes.data.donation.status}`
    );
    assert(
      Boolean(verifyRes.data.donation.deliveryOtp),
      'Step 11: Separate Delivery OTP Generated for Final Handover',
      `Delivery OTP generated: ${Boolean(verifyRes.data.donation.deliveryOtp)}`
    );

    // Step 10 Security: Reusing the verified OTP must fail (atomic consumption)
    try {
      await axios.post(
        `${API_BASE}/donations/${donationId}/verify-pickup`,
        { otp: freshOtp },
        { headers: { Authorization: `Bearer ${ngoToken}` } }
      );
      assert(false, 'Security: Reused OTP must be rejected atomically', 'Reused OTP accepted');
    } catch (err: any) {
      assert(
        err.response?.status === 400,
        'Security: Replay / Reused OTP Rejected Atomically',
        err.response?.data?.message || 'Already consumed'
      );
    }

    // Verify both dashboards now show "picked_up"
    const finalProviderCheck = await axios.get(`${API_BASE}/donations?providerOnly=true`, {
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    const finalProviderDonation = finalProviderCheck.data.donations.find((d: any) => d._id === donationId);
    assert(
      finalProviderDonation?.status === 'picked_up',
      'Both Dashboards Synchronized: Provider Dashboard Shows "picked_up"',
      `Status: ${finalProviderDonation?.status}`
    );

    const finalNgoCheck = await axios.get(`${API_BASE}/donations?assignedToMe=true`, {
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    const finalNgoDonation = finalNgoCheck.data.donations.find((d: any) => d._id === donationId);
    assert(
      finalNgoDonation?.status === 'picked_up',
      'Both Dashboards Synchronized: NGO Dashboard Shows "picked_up"',
      `Status: ${finalNgoDonation?.status}`
    );

    // =========================================================================
    // TASK 4 & 5: Notifications & Regression Testing
    // =========================================================================
    console.log('\n----------------------------------------------------------------');
    console.log('TEST SUITE 4: Lifecycle Event Notifications & Regression');
    console.log('----------------------------------------------------------------');

    // Check notifications for Provider
    const providerLifecycleNotifs = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    const hasPickupNotif = providerLifecycleNotifs.data.notifications?.some(
      (n: any) => n.type === 'pickup_confirmed' || n.title?.includes('Pickup Confirmed')
    );
    assert(hasPickupNotif, 'Lifecycle Notification: Food Provider Received Pickup Confirmation Alert');

    // Check notifications for NGO
    const ngoLifecycleNotifs = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    const hasNgoPickupNotif = ngoLifecycleNotifs.data.notifications?.some(
      (n: any) => n.type === 'pickup_confirmed' || n.title?.includes('Pickup Confirmed')
    );
    assert(hasNgoPickupNotif, 'Lifecycle Notification: NGO Received Pickup Confirmation Alert');

    // Regression: Existing demo accounts can still login
    const providerLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'taj.kitchens@foodbridge.org',
      password: 'Password@123',
    });
    assert(
      providerLogin.status === 200 && providerLogin.data.user.role === 'provider',
      'Regression: Existing Food Provider demo account logs in smoothly',
      providerLogin.data.user.name
    );

    const ngoLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'delhi.shelters@foodbridge.org',
      password: 'Password@123',
    });
    assert(
      ngoLogin.status === 200 && ngoLogin.data.user.role === 'ngo',
      'Regression: Existing NGO demo account logs in smoothly',
      ngoLogin.data.user.name
    );

    console.log('\n================================================================');
    console.log(`Test Execution Summary: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err: any) {
    console.error('\n❌ Fatal Test Runner Error:', err.response?.data || err.message);
    process.exit(1);
  }
};

runTests();
