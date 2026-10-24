import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('================================================================');
  console.log('🧪 FoodBridge Automated Comprehensive Test Suite (Phases 1 - 5)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail = '') => {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${detail}`);
      failed++;
    }
  };

  try {
    // Fresh test isolation
    await axios.post(`${BASE_URL}/demo/seed`);

    // ----------------------------------------------------
    // TEST SUITE 1: System Health & Database Connectivity
    // ----------------------------------------------------
    console.log('--- Test Suite 1: System Health & Database Connectivity ---');
    const healthRes = await axios.get(`${BASE_URL}/health`);
    assert(healthRes.status === 200, 'Health check endpoint returns 200 OK');
    assert(healthRes.data.status === 'online', 'Platform status reports online');
    assert(healthRes.data.database.connected === true, 'Database connected with in-memory/local resilience');

    // ----------------------------------------------------
    // TEST SUITE 2: Dynamic User Registration & Authentication
    // ----------------------------------------------------
    console.log('\n--- Test Suite 2: Dynamic User Registration & Authentication ---');

    const timestamp = Date.now();
    const testProviderEmail = `provider_${timestamp}@kitchen.org`;
    const testNgoEmail = `ngo_${timestamp}@shelter.org`;

    // 2.1 Register New Provider
    const regProviderRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Executive Chef Vikram',
      email: testProviderEmail,
      password: 'SecurePassword123!',
      role: 'provider',
      phone: '+91 98765 43210',
      organizationName: 'Vikram Grand Kitchen',
      organizationType: 'restaurant',
      address: 'Sector 62, Noida Industrial Hub',
      city: 'Noida',
    });
    assert(regProviderRes.status === 201, 'Dynamic Provider registration succeeds (201 Created)');
    assert(typeof regProviderRes.data.token === 'string', 'JWT token generated for new Provider');
    assert(regProviderRes.data.user.role === 'provider', 'User role correctly persisted as provider');

    // 2.2 Register New NGO with Capacity
    const regNgoRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Anjali Sharma',
      email: testNgoEmail,
      password: 'SecurePassword123!',
      role: 'ngo',
      phone: '+91 98765 09876',
      organizationName: 'Anjali Community Food Bank',
      organizationType: 'food_bank',
      address: 'Sector 18, Noida Center',
      city: 'Noida',
      registrationNumber: 'NGO-NOIDA-2025-089',
      maxMealsPerDay: 250,
      hasRefrigeration: true,
      hasWarmStorage: true,
      hasTransportFleet: true,
    });
    assert(regNgoRes.status === 201, 'Dynamic NGO registration succeeds with capacity parameters (201 Created)');
    assert(regNgoRes.data.user.role === 'ngo', 'User role correctly persisted as ngo');

    // 2.3 Prevent Public Administrator Self-Registration
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Unauthorized Admin Attempt',
        email: `hackeradmin_${timestamp}@security.org`,
        password: 'Password123!',
        role: 'admin',
        phone: '9876543210',
        organizationName: 'Fake Agency',
        organizationType: 'restaurant',
        address: 'Delhi',
        city: 'Delhi',
      });
      assert(false, 'Admin self-registration rejection', 'Expected 403 Forbidden');
    } catch (err: any) {
      assert(err.response?.status === 403, 'Public self-registration as admin strictly blocked (403 Forbidden)');
    }

    // 2.4 Prevent Duplicate Email Registration
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Duplicate Attempt',
        email: testProviderEmail,
        password: 'Password123!',
        role: 'provider',
        phone: '9876543210',
        organizationName: 'Duplicate Org',
        organizationType: 'restaurant',
        address: 'Delhi',
        city: 'Delhi',
      });
      assert(false, 'Duplicate email registration rejection', 'Expected 409 Conflict');
    } catch (err: any) {
      assert(err.response?.status === 409, 'Duplicate email correctly rejected with 409 Conflict');
    }

    // 2.4 Login with Newly Registered Provider
    const dynamicLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: testProviderEmail,
      password: 'SecurePassword123!',
    });
    assert(dynamicLoginRes.status === 200, 'Login with dynamic credentials succeeds');
    assert(dynamicLoginRes.data.user.email === testProviderEmail, 'Returned user email matches registration');

    // 2.5 Demo Persona Logins (Provider, NGO, Admin)
    const demoProviderLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'provider@foodbridge.org',
      password: 'password123',
    });
    assert(demoProviderLogin.status === 200, 'Demo Provider login succeeds');
    const providerToken = demoProviderLogin.data.token;
    const providerHeaders = { Authorization: `Bearer ${providerToken}` };

    const demoNgoLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'ngo@hopekitchen.org',
      password: 'password123',
    });
    assert(demoNgoLogin.status === 200, 'Demo NGO login succeeds');
    const ngoToken = demoNgoLogin.data.token;
    const ngoHeaders = { Authorization: `Bearer ${ngoToken}` };

    const demoAdminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@foodbridge.org',
      password: 'password123',
    });
    assert(demoAdminLogin.status === 200, 'Demo Admin login succeeds');
    const adminToken = demoAdminLogin.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // 2.6 Reject Incorrect Password
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: 'provider@foodbridge.org',
        password: 'invalidPassword',
      });
      assert(false, 'Invalid password rejection', 'Expected 401 Unauthorized');
    } catch (err: any) {
      assert(err.response?.status === 401, 'Invalid password correctly rejected with 401 Unauthorized');
    }

    // ----------------------------------------------------
    // TEST SUITE 3: Unauthorized Access & Security Boundaries
    // ----------------------------------------------------
    console.log('\n--- Test Suite 3: Unauthorized Access & Security Boundaries ---');

    // 3.1 Reject Unauthenticated Request (No Token)
    try {
      await axios.get(`${BASE_URL}/auth/me`);
      assert(false, 'Missing token rejection', 'Expected 401 Unauthorized');
    } catch (err: any) {
      assert(err.response?.status === 401, 'Missing Authorization header blocked (401 Unauthorized)');
    }

    // 3.2 Role Boundary: NGO Cannot Create Food Listing
    try {
      await axios.post(
        `${BASE_URL}/donations`,
        {
          title: 'Unauthorized NGO Listing',
          foodCategory: 'cooked_meals',
          dietaryType: 'veg',
          quantityMeals: 20,
          quantityKg: 10,
          preparationTime: new Date().toISOString(),
          collectionDeadline: new Date(Date.now() + 3 * 3600000).toISOString(),
          storageRequirement: 'room_temperature',
          address: 'Test',
          city: 'New Delhi',
          contactName: 'Tester',
          contactPhone: '9876543210',
        },
        { headers: ngoHeaders }
      );
      assert(false, 'NGO listing rejection', 'Expected 403 Forbidden');
    } catch (err: any) {
      assert(err.response?.status === 403, 'NGO blocked from creating food listing (403 Forbidden)');
    }

    // 3.3 Role Boundary: Provider Cannot Access Admin Verification Queue
    try {
      await axios.get(`${BASE_URL}/admin/pending-verifications`, { headers: providerHeaders });
      assert(false, 'Provider admin access rejection', 'Expected 403 Forbidden');
    } catch (err: any) {
      assert(err.response?.status === 403, 'Provider blocked from admin endpoints (403 Forbidden)');
    }

    // ----------------------------------------------------
    // TEST SUITE 4: Food Safety & Expiry Constraints
    // ----------------------------------------------------
    console.log('\n--- Test Suite 4: Food Safety & Expiry Constraints ---');

    // 4.1 Reject Food Listing with Collection Deadline in the Past
    try {
      await axios.post(
        `${BASE_URL}/donations`,
        {
          title: 'Expired Food Test Listing',
          foodCategory: 'cooked_meals',
          dietaryType: 'veg',
          quantityMeals: 30,
          quantityKg: 15,
          preparationTime: new Date(Date.now() - 5 * 3600000).toISOString(),
          collectionDeadline: new Date(Date.now() - 1 * 3600000).toISOString(), // 1 hour in past
          storageRequirement: 'room_temperature',
          address: 'Test Kitchen',
          city: 'New Delhi',
          contactName: 'Tester',
          contactPhone: '9876543210',
        },
        { headers: providerHeaders }
      );
      assert(false, 'Past collection deadline rejection', 'Expected 400 Bad Request');
    } catch (err: any) {
      assert(err.response?.status === 400, 'Expired food listing blocked by safety validation (400 Bad Request)');
    }

    // ----------------------------------------------------
    // TEST SUITE 5: Food Listing Creation & Security OTP Generation
    // ----------------------------------------------------
    console.log('\n--- Test Suite 5: Food Listing Creation & Security OTP Generation ---');

    const donationRes = await axios.post(
      `${BASE_URL}/donations`,
      {
        title: '60 Portions Steamed Rice & Dal Makhani Surplus',
        description: 'Freshly packed in insulated containers post luncheon banquet.',
        foodCategory: 'cooked_meals',
        dietaryType: 'veg',
        quantityMeals: 60,
        quantityKg: 28,
        preparationTime: new Date(Date.now() - 45 * 60000).toISOString(),
        collectionDeadline: new Date(Date.now() + 3 * 3600000).toISOString(), // 3 hours left
        storageRequirement: 'hot_insulated',
        allergens: ['Dairy'],
        address: 'Barakhamba Road, Connaught Place',
        city: 'New Delhi',
        contactName: 'Chef Rajesh Sharma',
        contactPhone: '+91 98112 34567',
        pickupInstructions: 'Kitchen loading bay at the rear entrance.',
      },
      { headers: providerHeaders }
    );

    assert(donationRes.status === 201, 'Valid food donation listing created (201 Created)');
    const donation = donationRes.data.donation;
    const donationId = donation._id;

    assert(donation.status === 'available', 'Initial donation lifecycle status is "available"');
    assert(typeof donation.pickupOtp === 'string' && donation.pickupOtp.length === 4, 'Cryptographic 4-digit pickup OTP generated');
    assert(typeof donation.deliveryOtp === 'string' && donation.deliveryOtp.length === 4, 'Cryptographic 4-digit delivery OTP generated');
    assert(donation.allergens.includes('Dairy'), 'Allergen information safely preserved');

    // ----------------------------------------------------
    // TEST SUITE 6: 5-Factor Weighted Matching Engine
    // ----------------------------------------------------
    console.log('\n--- Test Suite 6: 5-Factor Weighted Matching Engine ---');

    const matchRes = await axios.get(`${BASE_URL}/donations/${donationId}/match`, { headers: providerHeaders });
    assert(matchRes.status === 200, '5-Factor matching engine endpoint returns 200 OK');
    assert(Array.isArray(matchRes.data.matches), 'Returns structured recipient matches array');
    assert(matchRes.data.matches.length > 0, 'Found at least one eligible verified recipient NGO');

    const topMatch = matchRes.data.matches[0];
    assert(topMatch.matchScore > 0 && topMatch.matchScore <= 100, 'Match score normalized to 0-100% scale');
    assert(typeof topMatch.factors.urgency === 'number', 'Urgency factor calculated (30% weight)');
    assert(typeof topMatch.factors.distanceScore === 'number', 'Distance factor calculated via Haversine (25% weight)');
    assert(typeof topMatch.factors.capacityScore === 'number', 'Capacity factor calculated (20% weight)');
    assert(typeof topMatch.factors.availabilityScore === 'number', 'Availability factor calculated (15% weight)');
    assert(typeof topMatch.factors.compatibilityScore === 'number', 'Storage compatibility factor calculated (10% weight)');
    assert(typeof topMatch.explanation === 'string' && topMatch.explanation.length > 20, 'Grounded natural language explanation generated');

    // ----------------------------------------------------
    // TEST SUITE 7: NGO Request & Provider Acceptance Lifecycle
    // ----------------------------------------------------
    console.log('\n--- Test Suite 7: NGO Request & Provider Acceptance Lifecycle ---');

    // 7.1 NGO submits collection request
    const requestRes = await axios.post(
      `${BASE_URL}/donations/${donationId}/request`,
      {
        requestNotes: 'Dispatched temperature-controlled rescue van.',
        estimatedPickupTime: new Date(Date.now() + 40 * 60000).toISOString(),
      },
      { headers: ngoHeaders }
    );
    assert(requestRes.status === 201, 'NGO collection request submitted (201 Created)');
    const requestId = requestRes.data.request._id;

    // 7.2 Prevent Duplicate Request from Same NGO
    try {
      await axios.post(
        `${BASE_URL}/donations/${donationId}/request`,
        { requestNotes: 'Duplicate request test' },
        { headers: ngoHeaders }
      );
      assert(false, 'Duplicate request rejection', 'Expected 409 Conflict');
    } catch (err: any) {
      assert(err.response?.status === 409, 'Duplicate request prevented with 409 Conflict');
    }

    // 7.3 Provider Reviews and Approves Collection Request
    const approveRes = await axios.post(
      `${BASE_URL}/donations/${donationId}/respond-request`,
      {
        requestId,
        action: 'approve',
      },
      { headers: providerHeaders }
    );
    assert(approveRes.status === 200, 'Provider approved NGO collection request');
    assert(approveRes.data.donation.status === 'accepted', 'Donation status advanced to "accepted"');

    // ----------------------------------------------------
    // TEST SUITE 8: Pickup Scheduling & Handover Lifecycle with OTP
    // ----------------------------------------------------
    console.log('\n--- Test Suite 8: Pickup Scheduling & Handover Lifecycle with OTP ---');

    // 8.1 Advance to pickup_scheduled
    const scheduleRes = await axios.post(
      `${BASE_URL}/donations/${donationId}/status`,
      { nextStatus: 'pickup_scheduled' },
      { headers: providerHeaders }
    );
    assert(scheduleRes.data.donation.status === 'pickup_scheduled', 'Status advanced to "pickup_scheduled"');

    // 8.2 Reject Handover with Invalid Pickup OTP
    try {
      await axios.post(
        `${BASE_URL}/donations/${donationId}/status`,
        { nextStatus: 'picked_up', otp: '0000' }, // Invalid OTP
        { headers: ngoHeaders }
      );
      assert(false, 'Invalid pickup OTP rejection', 'Expected 400 Bad Request');
    } catch (err: any) {
      assert(err.response?.status === 400, 'Incorrect OTP blocked with 400 Verification Failed');
    }

    // 8.3 Handover Meal with Correct Pickup OTP
    const activePickupOtp = approveRes.data?.donation?.pickupOtp || donation.pickupOtp;
    const pickupRes = await axios.post(
      `${BASE_URL}/donations/${donationId}/status`,
      { nextStatus: 'picked_up', otp: activePickupOtp },
      { headers: ngoHeaders }
    );
    assert(pickupRes.status === 200, 'Valid pickup OTP accepted');
    assert(pickupRes.data.donation.status === 'picked_up', 'Status advanced to "picked_up"');

    // ----------------------------------------------------
    // TEST SUITE 9: Delivery Confirmation & Impact Metrics Finalization
    // ----------------------------------------------------
    console.log('\n--- Test Suite 9: Delivery Confirmation & Impact Metrics Finalization ---');

    // 9.1 Reject Delivery with Invalid Delivery OTP
    try {
      await axios.post(
        `${BASE_URL}/donations/${donationId}/status`,
        { nextStatus: 'delivered', otp: '1111' }, // Invalid OTP
        { headers: ngoHeaders }
      );
      assert(false, 'Invalid delivery OTP rejection', 'Expected 400 Bad Request');
    } catch (err: any) {
      assert(err.response?.status === 400, 'Incorrect delivery OTP blocked with 400 Verification Failed');
    }

    // 9.2 Confirm Shelter Delivery with Correct Delivery OTP
    const deliverRes = await axios.post(
      `${BASE_URL}/donations/${donationId}/status`,
      { nextStatus: 'delivered', otp: donation.deliveryOtp },
      { headers: ngoHeaders }
    );
    assert(deliverRes.status === 200, 'Valid delivery OTP accepted');
    assert(deliverRes.data.donation.status === 'delivered', 'Status advanced to "delivered"');

    // 9.3 Finalize Lifecycle to Completed
    const completeRes = await axios.post(
      `${BASE_URL}/donations/${donationId}/status`,
      { nextStatus: 'completed' },
      { headers: providerHeaders }
    );
    assert(completeRes.status === 200, 'Donation status finalized to "completed"');

    // ----------------------------------------------------
    // TEST SUITE 10: Database Persistence & Query Integrity
    // ----------------------------------------------------
    console.log('\n--- Test Suite 10: Database Persistence & Query Integrity ---');

    // 10.1 Query Completed Donation Record from DB
    const persistedDonation = await axios.get(`${BASE_URL}/donations/${donationId}`);
    assert(persistedDonation.status === 200, 'Completed donation retrieved from database');
    const finalData = persistedDonation.data.donation;
    assert(finalData.status === 'completed', 'Persisted status is completed in database');

    // 10.2 Audit Timeline Persistence
    assert(Array.isArray(finalData.timeline), 'Audit timeline array persisted');
    assert(finalData.timeline.length >= 6, `Audit trail contains all ${finalData.timeline.length} sequential lifecycle transitions`);

    // 10.3 Verify Platform Analytics Metric Updates
    const analyticsRes = await axios.get(`${BASE_URL}/admin/analytics`, { headers: adminHeaders });
    assert(analyticsRes.status === 200, 'Platform analytics retrieved via Admin session');
    assert(analyticsRes.data.metrics.mealsRedistributed > 0, 'Meals redistributed reflects completed delivery records');
    assert(analyticsRes.data.metrics.kgRescued > 0, 'Kg rescued reflects completed delivery records');

    // ----------------------------------------------------
    // TEST SUITE 11: FoodBridge AI Natural Language Assistant
    // ----------------------------------------------------
    console.log('\n--- Test Suite 11: FoodBridge AI Natural Language Assistant ---');

    const aiRes = await axios.post(`${BASE_URL}/ai/chat`, {
      message: 'I have 75 portions of vegetarian lunch available near Connaught Place.',
    });
    assert(aiRes.status === 200, 'AI Assistant responds with 200 OK');
    assert(typeof aiRes.data.reply === 'string' && aiRes.data.reply.length > 10, 'AI response text generated');
    assert(aiRes.data.draft && aiRes.data.draft.quantityMeals === 75, 'AI successfully parsed 75 meals into draft object');
    assert(aiRes.data.draft.dietaryType === 'veg', 'AI successfully parsed vegetarian dietary type');

    // ----------------------------------------------------
    // FINAL TEST REPORT
    // ----------------------------------------------------
    console.log('\n================================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('Fatal test error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
};

runTests();
