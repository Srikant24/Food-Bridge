/**
 * FoodBridge Automated Notification & Lifecycle Comprehensive QA Test Suite
 * Tests the 4 Core Notification Workflows + Email/SMS Sandbox Validation + API/Dashboard Verification
 */

import axios from 'axios';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

interface TestStats {
  passed: number;
  failed: number;
  executed: number;
  blocked: number;
}

const stats: TestStats = { passed: 0, failed: 0, executed: 0, blocked: 0 };

function assert(condition: boolean, testName: string, detail: string = ''): void {
  stats.executed++;
  if (condition) {
    stats.passed++;
    console.log(`  ✓ PASS: ${testName} ${detail ? `(${detail})` : ''}`);
  } else {
    stats.failed++;
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
  }
}

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('🔔 FoodBridge Multi-Channel Notification Automation QA Test Suite');
  console.log('='.repeat(80));

  const timestamp = Date.now();

  try {
    // =========================================================================
    // TEST 1 — USER REGISTRATION CONFIRMATION WORKFLOW
    // =========================================================================
    console.log('\n--- TEST 1: User Registration Confirmation Workflow ---');

    // 1.1 Register Food Provider
    const providerEmail = `qa_provider_${timestamp}@kitchen.org`;
    const providerPhone = '+919811234001';
    const regProviderRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Executive Chef Vikram',
      email: providerEmail,
      password: 'Password123!',
      role: 'provider',
      phone: providerPhone,
      organizationName: 'Grand Hyatt Kitchens',
      organizationType: 'hotel',
      address: 'Asset Area 1, Aerocity',
      city: 'New Delhi',
      maxMealsPerDay: 300,
    });

    assert(regProviderRes.status === 201, 'Provider registration succeeds', 'HTTP 201 Created');
    const providerToken = regProviderRes.data.token;
    const providerUserId = regProviderRes.data.user.id;
    assert(regProviderRes.data.user.role === 'provider', 'Provider role correctly assigned', 'provider');
    assert(regProviderRes.data.user.organization.verificationStatus === 'verified', 'Provider is automatically active', 'verified');

    // 1.2 Register NGO (Pending Verification)
    const ngoEmail = `qa_ngo_${timestamp}@shelter.org`;
    const ngoPhone = '+919810123002';
    const regNgoRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Sunita Sharma',
      email: ngoEmail,
      password: 'Password123!',
      role: 'ngo',
      phone: ngoPhone,
      organizationName: 'Pratibha Child Shelter',
      organizationType: 'ngo_shelter',
      address: 'Sector 15, Noida',
      city: 'Noida',
      maxMealsPerDay: 150,
      hasRefrigeration: true,
      hasTransportFleet: true,
    });

    assert(regNgoRes.status === 201, 'NGO registration succeeds', 'HTTP 201 Created');
    const ngoToken = regNgoRes.data.token;
    const ngoUserId = regNgoRes.data.user.id;
    assert(regNgoRes.data.user.role === 'ngo', 'NGO role correctly assigned', 'ngo');
    assert(regNgoRes.data.user.organization.verificationStatus === 'pending', 'NGO awaiting approval is marked pending (not verified)', 'pending');

    // 1.3 Register Supplier (Caterer)
    const supplierEmail = `qa_supplier_${timestamp}@events.in`;
    const supplierPhone = '+919876543003';
    const regSupplierRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Rohan Mehra',
      email: supplierEmail,
      password: 'Password123!',
      role: 'provider',
      phone: supplierPhone,
      organizationName: 'Royal Banquet Caterers',
      organizationType: 'caterer',
      address: 'Laxmi Nagar, Delhi',
      city: 'New Delhi',
      maxMealsPerDay: 400,
    });

    assert(regSupplierRes.status === 201, 'Supplier registration succeeds', 'HTTP 201 Created');
    const supplierToken = regSupplierRes.data.token;

    // 1.4 Check Registration Confirmation Notifications in DB & Dashboard
    const providerNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    assert(providerNotifs.data.notifications.length >= 1, 'Provider received registration notification', `${providerNotifs.data.notifications.length} found`);
    const pWelcome = providerNotifs.data.notifications.find((n: any) => n.type === 'registration');
    assert(Boolean(pWelcome), 'Provider registration notification type is "registration"', pWelcome?.title);
    assert(pWelcome?.message.includes('Grand Hyatt Kitchens'), 'Message contains correct organization name', 'Grand Hyatt Kitchens');

    const ngoNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${ngoToken}` }
    });
    const nWelcome = ngoNotifs.data.notifications.find((n: any) => n.type === 'registration');
    assert(Boolean(nWelcome), 'NGO received registration notification', nWelcome?.title);
    assert(nWelcome?.message.includes('pending administrator verification'), 'NGO notification explicitly notes pending verification status', 'pending notice');

    // 1.5 Check Delivery Logs for Email and SMS
    const logsRes = await axios.get(`${BASE_URL}/notifications/delivery-logs`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    const providerEmailLog = logsRes.data.logs.find((l: any) => l.recipient === providerEmail && l.channel === 'email');
    assert(Boolean(providerEmailLog), 'Registration confirmation email generated in sandbox', providerEmail);
    assert(providerEmailLog?.status === 'delivered', 'Email delivery state is "delivered"', providerEmailLog?.status);

    const providerSmsLog = logsRes.data.logs.find((l: any) => l.recipient === providerPhone && l.channel === 'sms');
    assert(Boolean(providerSmsLog), 'Registration confirmation SMS generated in sandbox', providerPhone);
    assert(providerSmsLog?.status === 'delivered', 'SMS delivery state is "delivered"', providerSmsLog?.status);

    // =========================================================================
    // TEST 2 — FOOD LISTING ALERTS WORKFLOW
    // =========================================================================
    console.log('\n--- TEST 2: Food Listing Alerts Workflow ---');

    // Login as Demo Provider with verified credentials
    const demoProviderLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'provider@foodbridge.org',
      password: 'password123',
    });
    const demoProviderToken = demoProviderLogin.data.token;

    // Login as Verified Demo NGO
    const demoNgoLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'ngo@hopekitchen.org',
      password: 'password123',
    });
    const demoNgoToken = demoNgoLogin.data.token;

    // 2.1 Provider creates test food listing: "Vegetable Rice", 50 meals, New Delhi
    const now = new Date();
    const futureDeadline = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours in future
    const listingRes = await axios.post(`${BASE_URL}/donations`, {
      title: 'Vegetable Rice',
      description: 'Fragrant basmati rice prepared with fresh garden vegetables, peas, carrots, and mild Indian spices.',
      foodCategory: 'cooked_meals',
      dietaryType: 'veg',
      quantityMeals: 50,
      quantityKg: 22.0,
      preparationTime: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
      collectionDeadline: futureDeadline.toISOString(),
      storageRequirement: 'hot_insulated',
      allergens: [],
      address: 'Connaught Place B-Block',
      city: 'New Delhi',
      contactName: 'Chef Rajesh Sharma',
      contactPhone: '+91 98112 34567',
      pickupInstructions: 'Enter via rear kitchen ramp loading dock.',
    }, {
      headers: { Authorization: `Bearer ${demoProviderToken}` }
    });

    assert(listingRes.status === 201, 'Food listing creation succeeds', 'HTTP 201 Created');
    const donation = listingRes.data.donation;
    const donationId = donation._id;
    assert(donation.status === 'available', 'Donation initial status is "available"', donation.status);
    assert(donation.quantityMeals === 50, 'Stored quantity is 50 meals', '50 meals');

    // 2.2 Verify Provider received listing confirmation notification
    const pListNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${demoProviderToken}` }
    });
    const pListConfirm = pListNotifs.data.notifications.find((n: any) => n.metadata?.donationId === donationId && n.title.includes('Listing Confirmed'));
    assert(Boolean(pListConfirm), 'Provider received listing confirmation notification', pListConfirm?.title);
    assert(pListConfirm?.message.includes('Vegetable Rice'), 'Confirmation contains food title', 'Vegetable Rice');
    assert(pListConfirm?.message.includes('50 meals'), 'Confirmation contains meal quantity', '50 meals');

    // 2.3 Verify Eligible Verified NGOs received availability alert
    const verifiedNgoNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${demoNgoToken}` }
    });
    const ngoFoodAlert = verifiedNgoNotifs.data.notifications.find((n: any) => n.metadata?.donationId === donationId && n.type === 'food_alert');
    assert(Boolean(ngoFoodAlert), 'Verified eligible NGO received food availability alert', ngoFoodAlert?.title);
    assert(ngoFoodAlert?.message.includes('Vegetable Rice'), 'Alert contains correct food name', 'Vegetable Rice');
    assert(ngoFoodAlert?.message.includes('50 meals') || ngoFoodAlert?.message.includes('50 Meals'), 'Alert contains correct quantity', '50 meals');

    // 2.4 Verify Unverified NGO received NO alert
    const unverifiedNgoNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${ngoToken}` }
    });
    const unverifiedAlert = unverifiedNgoNotifs.data.notifications.find((n: any) => n.metadata?.donationId === donationId);
    assert(!unverifiedAlert, 'Unverified pending NGO correctly received NO alert for listing', 'Safety boundary enforced');

    // 2.5 Verify Expired Listings are Excluded
    try {
      await axios.post(`${BASE_URL}/donations`, {
        title: 'Expired Food Test',
        foodCategory: 'cooked_meals',
        dietaryType: 'veg',
        quantityMeals: 20,
        quantityKg: 5,
        preparationTime: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
        collectionDeadline: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(), // Past deadline
        storageRequirement: 'room_temp',
        address: 'Delhi',
        city: 'New Delhi',
        contactName: 'Chef',
        contactPhone: '+919999999999',
      }, {
        headers: { Authorization: `Bearer ${demoProviderToken}` }
      });
      assert(false, 'Expired food listing rejection', 'Expected 400 Bad Request');
    } catch (err: any) {
      assert(err.response?.status === 400, 'Expired food listing blocked by safety validation', '400 Bad Request');
    }

    // =========================================================================
    // TEST 3 — NGO FOOD REQUEST & PROVIDER APPROVAL WORKFLOW
    // =========================================================================
    console.log('\n--- TEST 3: NGO Food Request & Provider Approval Workflow ---');

    // 3.1 Verified NGO requests the Vegetable Rice listing
    const requestRes = await axios.post(`${BASE_URL}/donations/${donationId}/request`, {
      requestNotes: 'Hope Community Shelter will distribute these 50 vegetable rice meals tonight.',
      estimatedPickupTime: new Date(now.getTime() + 1.5 * 60 * 60 * 1000).toISOString(),
    }, {
      headers: { Authorization: `Bearer ${demoNgoToken}` }
    });

    assert(requestRes.status === 201, 'NGO food request submitted successfully', 'HTTP 201 Created');
    const donationRequest = requestRes.data.request;
    const requestId = donationRequest._id;
    assert(donationRequest.status === 'pending', 'Initial request status is "pending"', donationRequest.status);

    // 3.2 Verify Provider received request notification
    const pReqNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${demoProviderToken}` }
    });
    const pRequestAlert = pReqNotifs.data.notifications.find((n: any) => n.metadata?.requestId === requestId && n.type === 'request');
    assert(Boolean(pRequestAlert), 'Provider received incoming NGO food request notification', pRequestAlert?.title);
    assert(pRequestAlert?.message.includes('Hope Community Shelter'), 'Request alert names requesting NGO', 'Hope Community Shelter');

    // 3.3 Provider approves the request
    const approveRes = await axios.post(`${BASE_URL}/donations/${donationId}/respond`, {
      requestId,
      action: 'approve',
    }, {
      headers: { Authorization: `Bearer ${demoProviderToken}` }
    });

    assert(approveRes.status === 200, 'Provider approved NGO collection request', 'HTTP 200 OK');
    assert(approveRes.data.donation.status === 'accepted', 'Donation advanced to "accepted" status', 'accepted');

    // 3.4 Verify NGO received approval notification with OTP
    const ngoApproveNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${demoNgoToken}` }
    });
    const ngoApprovalAlert = ngoApproveNotifs.data.notifications.find((n: any) => n.metadata?.requestId === requestId && n.type === 'approval');
    assert(Boolean(ngoApprovalAlert), 'NGO received request approval notification', ngoApprovalAlert?.title);
    assert(Boolean(ngoApprovalAlert?.metadata?.pickupOtp), 'Approval notification contains pickup OTP', `OTP: ${ngoApprovalAlert?.metadata?.pickupOtp}`);

    // 3.5 Test Rejection Workflow Scenario
    // Create secondary listing to test rejection
    const list2Res = await axios.post(`${BASE_URL}/donations`, {
      title: 'Surplus Lentil Soup Batch',
      foodCategory: 'cooked_meals',
      dietaryType: 'veg',
      quantityMeals: 30,
      quantityKg: 15.0,
      preparationTime: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
      collectionDeadline: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      storageRequirement: 'hot_insulated',
      address: 'Connaught Place',
      city: 'New Delhi',
      contactName: 'Chef Rajesh',
      contactPhone: '+919811234567',
    }, {
      headers: { Authorization: `Bearer ${demoProviderToken}` }
    });
    const don2Id = list2Res.data.donation._id;

    // NGO requests listing 2
    const req2Res = await axios.post(`${BASE_URL}/donations/${don2Id}/request`, {
      requestNotes: 'Testing rejection scenario',
    }, {
      headers: { Authorization: `Bearer ${demoNgoToken}` }
    });
    const req2Id = req2Res.data.request._id;

    // Provider rejects listing 2
    const rejectRes = await axios.post(`${BASE_URL}/donations/${don2Id}/respond`, {
      requestId: req2Id,
      action: 'reject',
    }, {
      headers: { Authorization: `Bearer ${demoProviderToken}` }
    });
    assert(rejectRes.status === 200, 'Provider rejected request successfully', 'HTTP 200 OK');

    const ngoRejNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${demoNgoToken}` }
    });
    const ngoRejectionAlert = ngoRejNotifs.data.notifications.find((n: any) => n.metadata?.requestId === req2Id && n.type === 'rejection');
    assert(Boolean(ngoRejectionAlert), 'NGO received polite rejection notification', ngoRejectionAlert?.title);

    // =========================================================================
    // TEST 4 — DELIVERY CONFIRMATION WORKFLOW
    // =========================================================================
    console.log('\n--- TEST 4: Delivery Confirmation Workflow ---');

    // 4.1 Advance donation to pickup_scheduled
    const schedRes = await axios.put(`${BASE_URL}/donations/${donationId}/status`, {
      nextStatus: 'pickup_scheduled',
      note: 'Hope Community Shelter van en route',
    }, {
      headers: { Authorization: `Bearer ${demoProviderToken}` }
    });
    assert(schedRes.status === 200, 'Status advanced to "pickup_scheduled"', schedRes.data.donation.status);

    // 4.2 OTP pickup verification
    const pickupOtp = donation.pickupOtp;

    // Test invalid OTP rejection
    try {
      await axios.put(`${BASE_URL}/donations/${donationId}/status`, {
        nextStatus: 'picked_up',
        otp: '0000', // Invalid OTP
      }, {
        headers: { Authorization: `Bearer ${demoProviderToken}` }
      });
      assert(false, 'Invalid pickup OTP rejection', 'Expected 400 Bad Request');
    } catch (err: any) {
      assert(err.response?.status === 400, 'Incorrect pickup OTP blocked with 400 Verification Failed', '400 Bad Request');
    }

    // Submit valid pickup OTP
    const pickupRes = await axios.put(`${BASE_URL}/donations/${donationId}/status`, {
      nextStatus: 'picked_up',
      otp: pickupOtp,
      note: 'Verified with 4-digit pickup OTP',
    }, {
      headers: { Authorization: `Bearer ${demoProviderToken}` }
    });
    assert(pickupRes.status === 200, 'Status advanced to "picked_up" via valid OTP', pickupRes.data.donation.status);

    // Verify pickup confirmation notifications
    const pPickupNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${demoProviderToken}` }
    });
    const pPickupAlert = pPickupNotifs.data.notifications.find((n: any) => n.type === 'pickup');
    assert(Boolean(pPickupAlert), 'Provider received pickup confirmation notification', pPickupAlert?.title);

    const nPickupNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${demoNgoToken}` }
    });
    const nPickupAlert = nPickupNotifs.data.notifications.find((n: any) => n.type === 'pickup');
    assert(Boolean(nPickupAlert), 'NGO received pickup confirmation with delivery OTP', nPickupAlert?.title);

    // 4.3 Delivery confirmation with OTP
    const deliveryOtp = donation.deliveryOtp;

    // Test invalid delivery OTP
    try {
      await axios.put(`${BASE_URL}/donations/${donationId}/status`, {
        nextStatus: 'delivered',
        otp: '9999', // Invalid
      }, {
        headers: { Authorization: `Bearer ${demoProviderToken}` }
      });
      assert(false, 'Invalid delivery OTP rejection', 'Expected 400 Bad Request');
    } catch (err: any) {
      assert(err.response?.status === 400, 'Incorrect delivery OTP blocked with 400 Verification Failed', '400 Bad Request');
    }

    // Submit valid delivery OTP
    const delivRes = await axios.put(`${BASE_URL}/donations/${donationId}/status`, {
      nextStatus: 'delivered',
      otp: deliveryOtp,
      note: 'Food safely delivered and verified',
    }, {
      headers: { Authorization: `Bearer ${demoProviderToken}` }
    });
    assert(delivRes.status === 200, 'Status advanced to "delivered" via valid OTP', delivRes.data.donation.status);

    // Finalize to completed
    const compRes = await axios.put(`${BASE_URL}/donations/${donationId}/status`, {
      nextStatus: 'completed',
      note: 'Donation lifecycle finalized',
    }, {
      headers: { Authorization: `Bearer ${demoProviderToken}` }
    });
    assert(compRes.status === 200, 'Status finalized to "completed"', compRes.data.donation.status);

    // 4.4 Verify delivery completion notifications
    const pDelivNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${demoProviderToken}` }
    });
    const pDelivAlert = pDelivNotifs.data.notifications.find((n: any) => n.type === 'delivery' && n.metadata?.donationId === donationId);
    assert(Boolean(pDelivAlert), 'Provider received delivery & impact notification', pDelivAlert?.title);
    assert(pDelivAlert?.message.includes('50 meals served'), 'Notification specifies meals served', '50 meals served');
    assert(pDelivAlert?.message.includes('CO2'), 'Notification includes avoided CO2 impact', 'CO2 impact included');

    // 4.5 Check delivered donation no longer appears in available listings
    const availListingsRes = await axios.get(`${BASE_URL}/donations?status=available`);
    const foundDeliveredInAvail = availListingsRes.data.donations.find((d: any) => d._id === donationId);
    assert(!foundDeliveredInAvail, 'Delivered donation no longer appears as available food', 'Available listings filtered');

    // 4.6 Verify impact analytics updated
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@foodbridge.org',
      password: 'password123',
    });
    const adminToken = adminLogin.data.token;
    const analyticsRes = await axios.get(`${BASE_URL}/admin/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(analyticsRes.data.metrics.completedDonations >= 1, 'Platform analytics reflects completed delivery', `${analyticsRes.data.metrics.completedDonations} completed`);
    assert(analyticsRes.data.metrics.mealsRedistributed >= 50, 'Meals redistributed reflects completed deliveries', `${analyticsRes.data.metrics.mealsRedistributed} meals`);

    // =========================================================================
    // TEST 5 — EMAIL AND SMS DELIVERY VALIDATION
    // =========================================================================
    console.log('\n--- TEST 5: Email and SMS Delivery Validation ---');

    // 5.1 Test valid multi-channel dispatch
    const testSandboxRes = await axios.post(`${BASE_URL}/notifications/test-sandbox`, {
      title: 'QA Multi-Channel Test Alert',
      message: 'Testing dynamic placeholder delivery to verified email and phone.',
      emailRecipient: 'test_sandbox_user@example.org',
      phoneRecipient: '+919876543210',
      channels: ['email', 'sms'],
      dedupKey: `qa_multi_${timestamp}`,
    }, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    assert(testSandboxRes.status === 200, 'Sandbox notification dispatch succeeds', 'HTTP 200 OK');
    const sandboxResult = testSandboxRes.data.result;
    assert(sandboxResult.emailLog?.status === 'delivered', 'Email delivery log status is "delivered"', sandboxResult.emailLog?.status);
    assert(sandboxResult.smsLog?.status === 'delivered', 'SMS delivery log status is "delivered"', sandboxResult.smsLog?.status);

    // 5.2 Test invalid email recipient handling
    const invalidEmailRes = await axios.post(`${BASE_URL}/notifications/test-sandbox`, {
      title: 'Invalid Email Test',
      message: 'Testing rejection of malformed email address',
      emailRecipient: 'not-an-email-address',
      channels: ['email'],
      dedupKey: `qa_invemail_${timestamp}`,
    }, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    assert(invalidEmailRes.data.result.emailLog?.status === 'failed', 'Invalid email correctly marked "failed"', invalidEmailRes.data.result.emailLog?.error);

    // 5.3 Test invalid phone number handling
    const invalidPhoneRes = await axios.post(`${BASE_URL}/notifications/test-sandbox`, {
      title: 'Invalid Phone Test',
      message: 'Testing rejection of invalid phone',
      phoneRecipient: '123',
      channels: ['sms'],
      dedupKey: `qa_invphone_${timestamp}`,
    }, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    assert(invalidPhoneRes.data.result.smsLog?.status === 'failed', 'Invalid phone number correctly marked "failed"', invalidPhoneRes.data.result.smsLog?.error);

    // 5.4 Test simulated gateway failure & retry mechanism
    // Simulated transient failure with retry
    const retryRes = await axios.post(`${BASE_URL}/notifications/test-sandbox`, {
      title: 'Transient Failure Retry Test',
      message: 'Testing automatic retry upon gateway timeout',
      emailRecipient: 'retry_test@example.org',
      channels: ['email'],
      simulateGatewayFailure: true,
      forceRetry: true,
      dedupKey: `qa_retry_${timestamp}`,
    }, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    assert(retryRes.data.result.emailLog?.attempts === 2, 'Simulated transient failure attempted 2 times (retried)', `Attempts: ${retryRes.data.result.emailLog?.attempts}`);
    assert(retryRes.data.result.emailLog?.status === 'delivered', 'Transient failure recovered on retry to "delivered"', retryRes.data.result.emailLog?.status);

    // Simulated permanent failure
    const hardFailRes = await axios.post(`${BASE_URL}/notifications/test-sandbox`, {
      title: 'Permanent Gateway Failure Test',
      message: 'Testing permanent failure after max retries',
      emailRecipient: 'hardfail@example.org',
      channels: ['email'],
      simulateGatewayFailure: true,
      forceRetry: false,
      dedupKey: `qa_hardfail_${timestamp}`,
    }, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    assert(hardFailRes.data.result.emailLog?.attempts === 3, 'Permanent failure exhausted 3 attempts', `Attempts: ${hardFailRes.data.result.emailLog?.attempts}`);
    assert(hardFailRes.data.result.emailLog?.status === 'failed', 'Permanent failure correctly marked "failed"', hardFailRes.data.result.emailLog?.error);

    // 5.5 Test Deduplication
    const dedupRes = await axios.post(`${BASE_URL}/notifications/test-sandbox`, {
      title: 'Duplicate Prevention Test',
      message: 'This should be ignored as duplicate',
      emailRecipient: 'duplicate@example.org',
      channels: ['email'],
      dedupKey: `qa_multi_${timestamp}`, // Same dedupKey as test 5.1
    }, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    assert(dedupRes.data.result.isDuplicate === true, 'Duplicate submission blocked by deduplication key', 'dedupKey enforced');

    // =========================================================================
    // TEST 6 — FRONTEND & DASHBOARD API INTERACTION
    // =========================================================================
    console.log('\n--- TEST 6: Frontend & Dashboard API Interaction ---');

    // 6.1 Check unread notifications count
    const initialNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    const initialUnread = initialNotifs.data.unreadCount;
    assert(initialUnread > 0, 'Unread notification count is positive', `${initialUnread} unread`);

    // 6.2 Mark Single Notification as Read
    const firstNotifId = initialNotifs.data.notifications[0]._id;
    const markSingleRes = await axios.put(`${BASE_URL}/notifications/${firstNotifId}/read`, {}, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    assert(markSingleRes.status === 200, 'Mark single notification as read succeeds', 'HTTP 200 OK');

    const afterSingleNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    assert(afterSingleNotifs.data.unreadCount === initialUnread - 1, 'Unread count decremented by 1', `${afterSingleNotifs.data.unreadCount} remaining`);

    // 6.3 Mark All as Read
    const markAllRes = await axios.put(`${BASE_URL}/notifications/read-all`, {}, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    assert(markAllRes.status === 200, 'Mark all notifications as read succeeds', 'HTTP 200 OK');

    const afterAllNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    assert(afterAllNotifs.data.unreadCount === 0, 'Unread count is now 0 after mark-all-read', '0 unread');

    // 6.4 Unauthorized Access Security Check
    try {
      await axios.get(`${BASE_URL}/notifications`); // Missing Auth Header
      assert(false, 'Missing auth header rejection', 'Expected 401 Unauthorized');
    } catch (err: any) {
      assert(err.response?.status === 401, 'Unauthenticated user blocked from notifications', '401 Unauthorized');
    }

  } catch (error: any) {
    console.error('Fatal Test Exception:', error.response?.data || error.message);
    stats.failed++;
  }

  // =========================================================================
  // TEST SUMMARY & MATRIX
  // =========================================================================
  console.log('\n' + '='.repeat(80));
  console.log('📊 NOTIFICATION AUTOMATION QA TEST RESULTS');
  console.log('='.repeat(80));
  console.log(`Total Executed: ${stats.executed}`);
  console.log(`Passed:         ${stats.passed}`);
  console.log(`Failed:         ${stats.failed}`);
  console.log(`Blocked:        ${stats.blocked}`);

  if (stats.failed === 0) {
    console.log('\n🎉 ALL 4 AUTOMATED NOTIFICATION WORKFLOWS & SANDBOX PIPELINES PASSED 100%!');
    process.exit(0);
  } else {
    console.error(`\n❌ ${stats.failed} TEST(S) FAILED!`);
    process.exit(1);
  }
}

runAllTests();
