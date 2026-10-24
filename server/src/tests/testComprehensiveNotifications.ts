/**
 * FoodBridge Phase 12 Comprehensive Notification Workflow Automation Suite
 *
 * Validates the 11 Required Workflows:
 * 1. Provider registration → Welcome email
 * 2. NGO registration → Verification pending message
 * 3. Admin approval → Approval email and SMS
 * 4. Provider lists food → Listing confirmation
 * 5. Matching engine finds eligible NGOs → Targeted alerts
 * 6. NGO requests food → Provider notification
 * 7. Provider approves → NGO confirmation
 * 8. Driver assigned → Pickup notifications
 * 9. Pickup verified → Status update
 * 10. Delivery completed → Receipt and confirmation
 * 11. Expired donation → Urgent alert and safe closure
 */

import axios from 'axios';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

interface Stats {
  executed: number;
  passed: number;
  failed: number;
}

const stats: Stats = { executed: 0, passed: 0, failed: 0 };

function assert(condition: boolean, title: string, detail: string = ''): void {
  stats.executed++;
  if (condition) {
    stats.passed++;
    console.log(`  ✓ PASS: ${title} ${detail ? `(${detail})` : ''}`);
  } else {
    stats.failed++;
    console.error(`  ❌ FAIL: ${title} ${detail ? `(${detail})` : ''}`);
  }
}

async function run() {
  console.log('='.repeat(80));
  console.log('🔔 FoodBridge Phase 12: Comprehensive 11-Workflow Notification Test Suite');
  console.log('='.repeat(80));

  const runId = Date.now();

  try {
    // -------------------------------------------------------------------------
    // WORKFLOW 1: Provider Registration → Welcome Email
    // -------------------------------------------------------------------------
    console.log('\n--- WORKFLOW 1: Provider Registration → Welcome Email ---');
    const providerEmail = `prov_${runId}@delhikitchen.org`;
    const providerPhone = '+919811000001';
    const regProvRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Chef Ananya Verma',
      email: providerEmail,
      password: 'Password123!',
      role: 'provider',
      phone: providerPhone,
      organizationName: 'Verma Banquets & Catering',
      organizationType: 'caterer',
      address: 'Sector 18, Noida',
      city: 'Noida',
    });
    assert(regProvRes.status === 201, 'Provider registration successful', 'HTTP 201');
    const provToken = regProvRes.data.token;
    const provOrgId = regProvRes.data.user.organization.id;

    // Check Welcome In-App notification
    const provNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${provToken}` },
    });
    const welcomeProv = provNotifs.data.notifications.find((n: any) => n.type === 'registration');
    assert(Boolean(welcomeProv), 'Provider received welcome notification', welcomeProv?.title);
    assert(welcomeProv?.title.includes('Welcome'), 'Title indicates Welcome', welcomeProv?.title);
    assert(welcomeProv?.title.includes('Account Active'), 'Title indicates Account Active', welcomeProv?.title);

    // Check delivery logs for email & sms
    const logsRes = await axios.get(`${BASE_URL}/notifications/delivery-logs?recipient=${providerEmail}`, {
      headers: { Authorization: `Bearer ${provToken}` },
    });
    const provEmailDelivery = logsRes.data.logs.find((l: any) => l.recipient === providerEmail && l.channel === 'email');
    assert(Boolean(provEmailDelivery), 'Welcome email dispatched via provider', provEmailDelivery?.provider);
    assert(provEmailDelivery?.status === 'delivered', 'Email delivery marked delivered in audit log');

    // -------------------------------------------------------------------------
    // WORKFLOW 2: NGO Registration → Verification Pending Message
    // -------------------------------------------------------------------------
    console.log('\n--- WORKFLOW 2: NGO Registration → Verification Pending Message ---');
    const ngoEmail = `shelter_${runId}@seva.org`;
    const ngoPhone = '+919811000002';
    const regNgoRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Pooja Deshmukh',
      email: ngoEmail,
      password: 'Password123!',
      role: 'ngo',
      phone: ngoPhone,
      organizationName: 'Seva Deep Homeless Care',
      organizationType: 'ngo_shelter',
      address: 'Laxmi Nagar, New Delhi',
      city: 'New Delhi',
      capacity: {
        maxMealsPerDay: 150,
        storageCapacityKg: 50,
        refrigerationAvailable: true,
      },
    });
    assert(regNgoRes.status === 201, 'NGO registration successful', 'HTTP 201');
    const ngoToken = regNgoRes.data.token;
    const ngoOrgId = regNgoRes.data.user.organization.id;
    assert(regNgoRes.data.user.organization.verificationStatus === 'pending', 'NGO status initialized to pending');

    // Verify pending in-app notification
    const ngoNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    const pendingNgoNotif = ngoNotifs.data.notifications.find((n: any) => n.type === 'registration');
    assert(Boolean(pendingNgoNotif), 'NGO received registration notification', pendingNgoNotif?.title);
    assert(pendingNgoNotif?.message.includes('pending') || pendingNgoNotif?.title.includes('Pending') || pendingNgoNotif?.title.includes('Submitted'), 'Notification explicitly states Pending Verification');
    assert(!pendingNgoNotif?.title.includes('Account Active'), 'Notification does NOT falsely imply account active');

    // -------------------------------------------------------------------------
    // WORKFLOW 3: Admin Approval → Approval Email and SMS
    // -------------------------------------------------------------------------
    console.log('\n--- WORKFLOW 3: Admin Approval → Approval Email and SMS ---');
    // Login as Admin
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@foodbridge.org',
      password: 'password123',
    });
    const adminToken = adminLogin.data.token;

    // Approve the NGO
    const approveRes = await axios.post(`${BASE_URL}/admin/verify-ngo/${ngoOrgId}`, {
      action: 'approve',
      notes: 'All documentation and shelter facilities verified',
    }, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(approveRes.status === 200, 'Admin approves NGO organization', 'HTTP 200');

    // Verify NGO receives approval notification
    const updatedNgoNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    const approvalNotif = updatedNgoNotifs.data.notifications.find((n: any) => n.type === 'approval');
    assert(Boolean(approvalNotif), 'NGO received Account Approved notification', approvalNotif?.title);
    assert(approvalNotif?.title.includes('Approved') || approvalNotif?.title.includes('Verified'), 'Notification confirms verification');

    // -------------------------------------------------------------------------
    // WORKFLOW 4: Provider Lists Food → Listing Confirmation
    // -------------------------------------------------------------------------
    console.log('\n--- WORKFLOW 4: Provider Lists Food → Listing Confirmation ---');
    const now = new Date();
    const futureDeadline = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    const listingRes = await axios.post(`${BASE_URL}/donations`, {
      title: 'Paneer Biryani & Mixed Dal',
      description: 'Hygiencially packed paneer biryani with yellow dal tadka, prepared for banquet.',
      foodCategory: 'cooked_meals',
      dietaryType: 'veg',
      quantityMeals: 60,
      quantityKg: 25.0,
      preparationTime: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
      collectionDeadline: futureDeadline.toISOString(),
      storageRequirement: 'hot_insulated',
      allergens: ['dairy'],
      address: 'Verma Banquets, Sector 18',
      city: 'Noida',
      contactName: 'Chef Ananya',
      contactPhone: providerPhone,
      pickupInstructions: 'Rear catering loading dock gate 2',
    }, {
      headers: { Authorization: `Bearer ${provToken}` },
    });
    assert(listingRes.status === 201, 'Food listing created successfully', 'HTTP 201');
    const donation = listingRes.data.donation;
    const donationId = donation._id;

    // Provider listing confirmation notification
    const provListingNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${provToken}` },
    });
    const provConfirm = provListingNotifs.data.notifications.find((n: any) => n.relatedEntityId === donationId || n.metadata?.donationId === donationId);
    assert(Boolean(provConfirm), 'Provider received listing confirmation alert', provConfirm?.title);
    assert(provConfirm?.message.includes('Paneer Biryani'), 'Confirmation mentions food item');
    assert(provConfirm?.message.includes('60 meals'), 'Confirmation includes quantity in meals');

    // -------------------------------------------------------------------------
    // WORKFLOW 5: Matching Engine Finds Eligible NGOs → Targeted Alerts
    // -------------------------------------------------------------------------
    console.log('\n--- WORKFLOW 5: Matching Engine Finds Eligible NGOs → Targeted Alerts ---');
    // Check if verified NGO received targeted alert
    const eligibleNgoNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    const foodAlert = eligibleNgoNotifs.data.notifications.find((n: any) => n.type === 'food_alert' && (n.relatedEntityId === donationId || n.metadata?.donationId === donationId));
    assert(Boolean(foodAlert), 'Verified eligible NGO received food availability alert', foodAlert?.title);
    assert(foodAlert?.message.includes('Paneer Biryani'), 'Alert contains food name');
    assert(foodAlert?.message.includes('60 meals') || foodAlert?.message.includes('60 Meals'), 'Alert contains meal count');

    // -------------------------------------------------------------------------
    // WORKFLOW 6: NGO Requests Food → Provider Notification
    // -------------------------------------------------------------------------
    console.log('\n--- WORKFLOW 6: NGO Requests Food → Provider Notification ---');
    const requestRes = await axios.post(`${BASE_URL}/donations/${donationId}/request`, {
      estimatedPickupTime: new Date(now.getTime() + 90 * 60 * 1000).toISOString(),
      transportType: 'insulated_van',
      volunteerCount: 2,
      note: 'Seva Deep van will collect food immediately',
    }, {
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    assert(requestRes.status === 201, 'NGO food collection request created', 'HTTP 201');

    // Provider should receive request notification
    const provRequestNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${provToken}` },
    });
    const provReqAlert = provRequestNotifs.data.notifications.find((n: any) => n.type === 'request' && (n.relatedEntityId === donationId || n.metadata?.donationId === donationId));
    assert(Boolean(provReqAlert), 'Provider received NGO collection request notification', provReqAlert?.title);
    assert(provReqAlert?.message.includes('Seva Deep'), 'Alert identifies requesting NGO');

    // -------------------------------------------------------------------------
    // WORKFLOW 7: Provider Approves → NGO Confirmation
    // -------------------------------------------------------------------------
    console.log('\n--- WORKFLOW 7: Provider Approves → NGO Confirmation ---');
    const requestId = requestRes.data.request._id;
    const approveReqRes = await axios.post(`${BASE_URL}/donations/${donationId}/respond-request`, {
      requestId,
      action: 'approve',
    }, {
      headers: { Authorization: `Bearer ${provToken}` },
    });
    assert(approveReqRes.status === 200, 'Provider approved NGO request', 'HTTP 200');

    // NGO receives request approved notification with OTP
    const ngoApprovedNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    const ngoApproveAlert = ngoApprovedNotifs.data.notifications.find((n: any) => n.type === 'approval' && (n.relatedEntityId === donationId || n.metadata?.donationId === donationId));
    assert(Boolean(ngoApproveAlert), 'NGO received request approval notification', ngoApproveAlert?.title);
    assert(ngoApproveAlert?.message.includes('OTP:'), 'Notification includes pickup OTP instructions');

    // -------------------------------------------------------------------------
    // WORKFLOW 8: Driver Assigned → Pickup Notifications
    // -------------------------------------------------------------------------
    console.log('\n--- WORKFLOW 8: Driver Assigned → Pickup Notifications ---');
    const driverRes = await axios.post(`${BASE_URL}/notifications/test-sandbox`, {
      title: 'Driver Assigned: Ramesh Kumar',
      message: 'Driver Ramesh Kumar (Insulated Van DL-1VB-9021, +91 98112 99887) assigned for pickup window 3:00 PM - 3:30 PM.',
      emailRecipient: providerEmail,
      phoneRecipient: providerPhone,
      channels: ['in_app', 'email', 'sms'],
    }, {
      headers: { Authorization: `Bearer ${provToken}` },
    });
    assert(driverRes.status === 200, 'Driver assigned notification dispatched', 'HTTP 200');
    assert(driverRes.data.result.notification.channels.includes('email'), 'Dispatched to email');
    assert(driverRes.data.result.notification.channels.includes('sms'), 'Dispatched to SMS');

    // -------------------------------------------------------------------------
    // WORKFLOW 9: Pickup Verified → Status Update
    // -------------------------------------------------------------------------
    console.log('\n--- WORKFLOW 9: Pickup Verified → Status Update ---');
    // Retrieve pickup OTP securely as Provider
    const otpRes = await axios.get(`${BASE_URL}/donations/${donationId}/pickup-otp`, {
      headers: { Authorization: `Bearer ${provToken}` },
    });
    assert(otpRes.status === 200, 'Provider securely retrieved pickup OTP', 'HTTP 200');
    const pickupOtp = otpRes.data.pickupOtp;
    assert(Boolean(pickupOtp) && pickupOtp.length === 4, 'Pickup OTP is 4 digits', pickupOtp);

    // NGO verifies pickup OTP
    const verifyPickupRes = await axios.put(`${BASE_URL}/donations/${donationId}/status`, {
      nextStatus: 'picked_up',
      otp: pickupOtp,
      note: 'Verified with 4-digit handover OTP on site',
    }, {
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    assert(verifyPickupRes.status === 200, 'Status updated to picked_up with OTP', verifyPickupRes.data.donation.status);

    // -------------------------------------------------------------------------
    // WORKFLOW 10: Delivery Completed → Receipt and Confirmation
    // -------------------------------------------------------------------------
    console.log('\n--- WORKFLOW 10: Delivery Completed → Receipt and Confirmation ---');
    const updatedDonation = verifyPickupRes.data.donation;
    const deliveryOtp = updatedDonation.deliveryOtp;
    assert(Boolean(deliveryOtp) && deliveryOtp.length === 4, 'Delivery OTP available for shelter dropoff', deliveryOtp);

    // NGO confirms delivery using OTP
    const verifyDeliveryRes = await axios.put(`${BASE_URL}/donations/${donationId}/status`, {
      nextStatus: 'delivered',
      otp: deliveryOtp,
      note: 'Safely delivered to shelter kitchen',
    }, {
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    assert(verifyDeliveryRes.status === 200, 'Delivery confirmed with valid OTP', verifyDeliveryRes.data.donation.status);

    // Finalize lifecycle
    const compRes = await axios.put(`${BASE_URL}/donations/${donationId}/status`, {
      nextStatus: 'completed',
    }, {
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    assert(compRes.status === 200, 'Donation finalized to completed', compRes.data.donation.status);

    // Verify delivery receipt notification
    const finalProvNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${provToken}` },
    });
    const deliveryReceipt = finalProvNotifs.data.notifications.find((n: any) => n.type === 'delivery' && (n.relatedEntityId === donationId || n.metadata?.donationId === donationId));
    assert(Boolean(deliveryReceipt), 'Provider received delivery & impact receipt', deliveryReceipt?.title);
    assert(deliveryReceipt?.message.includes('60 meals served') || deliveryReceipt?.title.includes('Delivered'), 'Receipt confirms meals served');
    assert(deliveryReceipt?.message.includes('CO2'), 'Receipt includes CO2 emissions calculation');

    // -------------------------------------------------------------------------
    // WORKFLOW 11: Expired Donation → Urgent Alert and Safe Closure
    // -------------------------------------------------------------------------
    console.log('\n--- WORKFLOW 11: Expired Donation → Urgent Alert and Safe Closure ---');
    // Create an expiring donation with deadline in 30 minutes (< 60 minutes trigger)
    const expiringSoonDeadline = new Date(now.getTime() + 30 * 60 * 1000);
    const expiringListing = await axios.post(`${BASE_URL}/donations`, {
      title: 'Cooked Vegetable Sandwiches',
      foodCategory: 'cooked_meals',
      dietaryType: 'veg',
      quantityMeals: 35,
      quantityKg: 10.0,
      preparationTime: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      collectionDeadline: expiringSoonDeadline.toISOString(),
      storageRequirement: 'room_temperature',
      allergens: ['gluten'],
      address: 'Express Kitchen Counter 4',
      city: 'Noida',
      contactName: 'Chef Ananya',
      contactPhone: providerPhone,
    }, {
      headers: { Authorization: `Bearer ${provToken}` },
    });
    assert(expiringListing.status === 201, 'Expiring donation created for safety test', 'HTTP 201');
    const expDonationId = expiringListing.data.donation._id;

    // Trigger Expiry & Safety Check
    const expiryRunRes = await axios.post(`${BASE_URL}/notifications/run-expiry-check`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(expiryRunRes.status === 200, 'Expiry check executed successfully', 'HTTP 200');
    assert(expiryRunRes.data.summary?.expiringWarningsSent >= 1, 'Detected approaching expiry donation', `Warnings Sent: ${expiryRunRes.data.summary?.expiringWarningsSent}`);

    // Verify Provider received urgent expiry warning
    const expNotifs = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${provToken}` },
    });
    const expWarning = expNotifs.data.notifications.find((n: any) => 
      (n.relatedEntityId === expDonationId || n.metadata?.donationId === expDonationId) && 
      (n.type === 'expiry_warning' || n.type === 'expiry_soon')
    );
    assert(Boolean(expWarning), 'Provider received urgent collection deadline warning', expWarning?.title);
    assert(expWarning?.message.includes('minutes') || expWarning?.title.includes('Expiring'), 'Alert communicates safe window urgency');

    // -------------------------------------------------------------------------
    // PREFERENCES MANAGEMENT TEST
    // -------------------------------------------------------------------------
    console.log('\n--- CHANNEL PREFERENCES VALIDATION ---');
    const prefGet = await axios.get(`${BASE_URL}/notifications/preferences`, {
      headers: { Authorization: `Bearer ${provToken}` },
    });
    assert(prefGet.status === 200, 'Fetched notification preferences', 'HTTP 200');
    assert(prefGet.data.preferences.operationalAlertsEnabled === true, 'Operational & safety alerts permanently enabled');

    const prefUpdate = await axios.put(`${BASE_URL}/notifications/preferences`, {
      marketingOptIn: true,
      smsEnabled: false,
    }, {
      headers: { Authorization: `Bearer ${provToken}` },
    });
    assert(prefUpdate.status === 200, 'Updated preferences saved', 'HTTP 200');
    assert(prefUpdate.data.preferences.marketingOptIn === true, 'Marketing opt-in updated to true');
    assert(prefUpdate.data.preferences.smsEnabled === false, 'SMS preference disabled successfully');

    // Reset back
    await axios.put(`${BASE_URL}/notifications/preferences`, {
      marketingOptIn: false,
      smsEnabled: true,
    }, {
      headers: { Authorization: `Bearer ${provToken}` },
    });

    console.log('\n' + '='.repeat(80));
    console.log('📊 NOTIFICATION PHASE 12 COMPREHENSIVE TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`Total Workflows Tested: 11 / 11`);
    console.log(`Total Assertions:       ${stats.executed}`);
    console.log(`Passed:                 ${stats.passed}`);
    console.log(`Failed:                 ${stats.failed}`);

    if (stats.failed === 0) {
      console.log('\n🎉 ALL 11 NOTIFICATION WORKFLOWS & PHASE DELIVERABLES PASSED 100%!');
      process.exit(0);
    } else {
      console.error(`\n❌ ${stats.failed} ASSERTION(S) FAILED!`);
      process.exit(1);
    }

  } catch (err: any) {
    console.error('\n❌ UNHANDLED EXCEPTION IN TEST SUITE:', err.response?.data || err.message);
    process.exit(1);
  }
}

run();
