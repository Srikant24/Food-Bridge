import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('================================================================================');
  console.log('🔐 FoodBridge Pickup OTP Verification & Security QA Automation Suite');
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
    // 0. Reset & Seed DB for clean test run
    await axios.post(`${BASE_URL}/demo/seed`);

    // Log in Provider
    const provLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'provider@foodbridge.org',
      password: 'password123',
    });
    const providerToken = provLoginRes.data.token;
    const providerHeaders = { Authorization: `Bearer ${providerToken}` };

    // Log in Authorized NGO (Hope Community Shelter)
    const ngoLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'ngo@hopekitchen.org',
      password: 'password123',
    });
    const ngoToken = ngoLoginRes.data.token;
    const ngoHeaders = { Authorization: `Bearer ${ngoToken}` };

    // Register a Second NGO (Unauthorized NGO for isolation testing)
    const secondNgoEmail = `ngo_second_${Date.now()}@shelter.org`;
    const regSecondNgoRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Sister Mary Care Foundation',
      email: secondNgoEmail,
      password: 'Password123!',
      role: 'ngo',
      phone: '+91 98119 87654',
      organizationName: 'Sister Mary Food Mission',
      organizationType: 'ngo_shelter',
      address: 'Karol Bagh, New Delhi',
      city: 'New Delhi',
      capacityMeals: 150,
      maxCapacityMeals: 300,
    });
    const secondNgoToken = regSecondNgoRes.data.token;
    const secondNgoHeaders = { Authorization: `Bearer ${secondNgoToken}` };

    // Admin verify second NGO so they can participate in tests
    const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@foodbridge.org',
      password: 'password123',
    });
    const adminHeaders = { Authorization: `Bearer ${adminLoginRes.data.token}` };
    const secondNgoOrgId = regSecondNgoRes.data.user.organization.id;
    await axios.post(`${BASE_URL}/admin/verify-ngo/${secondNgoOrgId}`, { action: 'approve' }, { headers: adminHeaders });

    // =========================================================================
    // TASK 7 — SCENARIOS 1 & 2: Provider Approves Request & OTP Generation / Access
    // =========================================================================
    console.log('--- TEST 1 & 2: OTP Generation on Request Approval & Access Control ---');

    // Create listing
    const list1Res = await axios.post(`${BASE_URL}/donations`, {
      title: 'Fresh Dal Khichdi & Mixed Vegetables',
      foodCategory: 'cooked_meals',
      dietaryType: 'veg',
      quantityMeals: 60,
      quantityKg: 25.0,
      preparationTime: new Date(Date.now() - 30 * 60000).toISOString(),
      collectionDeadline: new Date(Date.now() + 4 * 3600000).toISOString(),
      storageRequirement: 'hot_insulated',
      address: 'Barakhamba Road',
      city: 'New Delhi',
      contactName: 'Chef Sanjay',
      contactPhone: '+91 98111 22233',
    }, { headers: providerHeaders });
    const don1Id = list1Res.data.donation._id;

    // NGO requests collection
    const req1Res = await axios.post(`${BASE_URL}/donations/${don1Id}/request`, {
      requestNotes: 'Hope Shelter evening dinner relief',
      estimatedPickupTime: new Date(Date.now() + 60 * 60000).toISOString(),
    }, { headers: ngoHeaders });
    const req1Id = req1Res.data.request._id;

    // Provider approves NGO request
    const approve1Res = await axios.post(`${BASE_URL}/donations/${don1Id}/respond-request`, {
      requestId: req1Id,
      action: 'approve',
    }, { headers: providerHeaders });

    assert(approve1Res.status === 200, 'Provider approved NGO request', 'HTTP 200 OK');
    assert(approve1Res.data.donation.status === 'accepted', 'Donation advanced to "accepted"');
    assert(
      typeof approve1Res.data.donation.pickupOtp === 'string' && /^\d{4}$/.test(approve1Res.data.donation.pickupOtp),
      'Cryptographically secure 4-digit pickup OTP generated on approval',
      `OTP: ${approve1Res.data.donation.pickupOtp}`
    );

    const generatedOtp = approve1Res.data.donation.pickupOtp;

    // Test 2: Provider can securely access the OTP via dedicated endpoint
    const provOtpRes = await axios.get(`${BASE_URL}/donations/${don1Id}/pickup-otp`, { headers: providerHeaders });
    assert(provOtpRes.status === 200, 'Provider successfully accessed secure pickup OTP endpoint');
    assert(provOtpRes.data.pickupOtp === generatedOtp, 'Retrieved OTP matches generated code', provOtpRes.data.pickupOtp);
    assert(provOtpRes.data.attemptsRemaining === 5, 'Initial attempts remaining is 5');
    assert(Boolean(provOtpRes.data.instructions), 'Includes collector handover instructions');

    // Test 2b: Unauthorized NGO blocked from reading provider secret OTP
    try {
      await axios.get(`${BASE_URL}/donations/${don1Id}/pickup-otp`, { headers: ngoHeaders });
      assert(false, 'NGO access to provider pickup OTP endpoint', 'Expected 403 Forbidden');
    } catch (err: any) {
      assert(err.response?.status === 403, 'NGO strictly blocked from pickup-otp endpoint', '403 Forbidden');
    }

    // Test 2c: Plaintext OTP never exposed to NGO in getDonationById
    const ngoViewRes = await axios.get(`${BASE_URL}/donations/${don1Id}`, { headers: ngoHeaders });
    assert(ngoViewRes.data.donation.pickupOtp === undefined, 'Plaintext pickup OTP strictly stripped from NGO donation details');

    // =========================================================================
    // TASK 7 — SCENARIO 4: NGO Enters Incorrect OTP → Rejected
    // =========================================================================
    console.log('\n--- TEST 4: NGO Enters Incorrect OTP → Rejected ---');

    // Move to pickup_scheduled
    await axios.post(`${BASE_URL}/donations/${don1Id}/status`, { nextStatus: 'pickup_scheduled' }, { headers: providerHeaders });

    // NGO submits incorrect OTP (0000)
    try {
      await axios.post(`${BASE_URL}/donations/${don1Id}/verify-pickup`, { otp: '0000' }, { headers: ngoHeaders });
      assert(false, 'Incorrect OTP rejection', 'Expected 400 Bad Request');
    } catch (err: any) {
      assert(err.response?.status === 400, 'Incorrect OTP blocked with 400 Verification Failed', err.response?.data?.message);
      assert(err.response?.data?.message.includes('Invalid pickup OTP'), 'Error message instructs provider must share code');
    }

    // Check donation status did not advance
    const checkDon1 = await axios.get(`${BASE_URL}/donations/${don1Id}`, { headers: providerHeaders });
    assert(checkDon1.data.donation.status === 'pickup_scheduled', 'Incorrect OTP did NOT advance donation status');

    // =========================================================================
    // TASK 7 — SCENARIO 3: NGO Enters Correct OTP → Pickup Confirmed
    // =========================================================================
    console.log('\n--- TEST 3: NGO Enters Correct OTP → Pickup Confirmed ---');

    const verifySuccessRes = await axios.post(`${BASE_URL}/donations/${don1Id}/verify-pickup`, {
      otp: generatedOtp,
      note: 'Driver verified Rajma Rice containers on-site',
    }, { headers: ngoHeaders });

    assert(verifySuccessRes.status === 200, 'Valid pickup OTP accepted by backend', 'HTTP 200 OK');
    assert(verifySuccessRes.data.donation.status === 'picked_up', 'Donation lifecycle status successfully changed to "picked_up"');

    // =========================================================================
    // TASK 7 — SCENARIO 7: Reusing Consumed OTP → Rejected
    // =========================================================================
    console.log('\n--- TEST 7: NGO Reuses Consumed OTP → Rejected ---');

    try {
      await axios.post(`${BASE_URL}/donations/${don1Id}/verify-pickup`, { otp: generatedOtp }, { headers: ngoHeaders });
      assert(false, 'Consumed OTP rejection', 'Expected 400 Bad Request');
    } catch (err: any) {
      assert(err.response?.status === 400, 'Consumed OTP strictly rejected', err.response?.data?.message);
      assert(err.response?.data?.error === 'OTP Already Used', 'Error specifies OTP Already Used');
    }

    // =========================================================================
    // TASK 7 — SCENARIO 9: Provider Regenerates OTP → Old OTP Invalidated
    // =========================================================================
    console.log('\n--- TEST 9: Provider Regenerates OTP → Old OTP Invalidated ---');

    // Create listing 2
    const list2Res = await axios.post(`${BASE_URL}/donations`, {
      title: 'Paneer Butter Masala Surplus',
      foodCategory: 'cooked_meals',
      dietaryType: 'veg',
      quantityMeals: 40,
      quantityKg: 18.0,
      preparationTime: new Date(Date.now() - 20 * 60000).toISOString(),
      collectionDeadline: new Date(Date.now() + 5 * 3600000).toISOString(),
      storageRequirement: 'hot_insulated',
      address: 'Connaught Place',
      city: 'New Delhi',
      contactName: 'Chef Rahul',
      contactPhone: '+91 98111 55566',
    }, { headers: providerHeaders });
    const don2Id = list2Res.data.donation._id;

    // NGO requests listing 2
    const req2Res = await axios.post(`${BASE_URL}/donations/${don2Id}/request`, {
      requestNotes: 'Hope Shelter pickup request for paneer',
      estimatedPickupTime: new Date(Date.now() + 45 * 60000).toISOString(),
    }, { headers: ngoHeaders });
    const req2Id = req2Res.data.request._id;

    // Provider approves
    const approve2Res = await axios.post(`${BASE_URL}/donations/${don2Id}/respond-request`, {
      requestId: req2Id,
      action: 'approve',
    }, { headers: providerHeaders });
    const initialOtp2 = approve2Res.data.donation.pickupOtp;

    // Provider regenerates OTP
    const regenRes = await axios.post(`${BASE_URL}/donations/${don2Id}/regenerate-otp`, {}, { headers: providerHeaders });
    assert(regenRes.status === 200, 'Provider regenerated pickup OTP', 'HTTP 200 OK');
    const newOtp2 = regenRes.data.pickupOtp;
    assert(typeof newOtp2 === 'string' && /^\d{4}$/.test(newOtp2), 'New 4-digit OTP generated', `New: ${newOtp2}`);
    assert(newOtp2 !== initialOtp2, 'New OTP is different from old OTP', `${initialOtp2} -> ${newOtp2}`);

    // NGO attempts using old OTP
    try {
      await axios.post(`${BASE_URL}/donations/${don2Id}/verify-pickup`, { otp: initialOtp2 }, { headers: ngoHeaders });
      assert(false, 'Old invalidated OTP rejection', 'Expected 400 Bad Request');
    } catch (err: any) {
      assert(err.response?.status === 400, 'Old invalidated OTP rejected with 400 Verification Failed');
    }

    // NGO submits new regenerated OTP
    const regenVerifyRes = await axios.post(`${BASE_URL}/donations/${don2Id}/verify-pickup`, { otp: newOtp2 }, { headers: ngoHeaders });
    assert(regenVerifyRes.status === 200, 'New regenerated OTP successfully verified', 'HTTP 200 OK');
    assert(regenVerifyRes.data.donation.status === 'picked_up', 'Donation advanced to "picked_up" via new OTP');

    // =========================================================================
    // TASK 7 — SCENARIO 8: Unauthorized NGO Attempts Pickup → Rejected
    // =========================================================================
    console.log('\n--- TEST 8: Unauthorized NGO Attempts Pickup → Rejected ---');

    // Create listing 3 assigned to Hope Shelter
    const list3Res = await axios.post(`${BASE_URL}/donations`, {
      title: 'Vegetable Biryani Trays',
      foodCategory: 'cooked_meals',
      dietaryType: 'veg',
      quantityMeals: 50,
      quantityKg: 20.0,
      preparationTime: new Date(Date.now() - 10 * 60000).toISOString(),
      collectionDeadline: new Date(Date.now() + 6 * 3600000).toISOString(),
      storageRequirement: 'hot_insulated',
      address: 'Aerocity, New Delhi',
      city: 'New Delhi',
      contactName: 'Chef Neha',
      contactPhone: '+91 98111 77788',
    }, { headers: providerHeaders });
    const don3Id = list3Res.data.donation._id;

    const req3Res = await axios.post(`${BASE_URL}/donations/${don3Id}/request`, {
      requestNotes: 'Hope Shelter biryani claim',
      estimatedPickupTime: new Date(Date.now() + 50 * 60000).toISOString(),
    }, { headers: ngoHeaders });
    const req3Id = req3Res.data.request._id;

    const approve3Res = await axios.post(`${BASE_URL}/donations/${don3Id}/respond-request`, {
      requestId: req3Id,
      action: 'approve',
    }, { headers: providerHeaders });
    const otp3 = approve3Res.data.donation.pickupOtp;

    // Second (unauthorized) NGO attempts to verify pickup using the correct OTP
    try {
      await axios.post(`${BASE_URL}/donations/${don3Id}/verify-pickup`, { otp: otp3 }, { headers: secondNgoHeaders });
      assert(false, 'Unauthorized NGO rejection', 'Expected 403 Forbidden');
    } catch (err: any) {
      assert(err.response?.status === 403, 'Unauthorized NGO blocked from pickup verification', '403 Forbidden');
      assert(err.response?.data?.error === 'Unauthorized NGO', 'Error identifies Unauthorized NGO');
    }

    // =========================================================================
    // TASK 7 — SCENARIO 6: Using OTP for Another Donation → Rejected
    // =========================================================================
    console.log('\n--- TEST 6: Using OTP from Donation A on Donation B → Rejected ---');

    // Create listing 4 assigned to Hope Shelter
    const list4Res = await axios.post(`${BASE_URL}/donations`, {
      title: 'Assorted Sandwich Box',
      foodCategory: 'bakery',
      dietaryType: 'veg',
      quantityMeals: 25,
      quantityKg: 8.0,
      preparationTime: new Date(Date.now() - 15 * 60000).toISOString(),
      collectionDeadline: new Date(Date.now() + 3 * 3600000).toISOString(),
      storageRequirement: 'room_temperature',
      address: 'Lajpat Nagar',
      city: 'New Delhi',
      contactName: 'Bakery Manager',
      contactPhone: '+91 98111 99900',
    }, { headers: providerHeaders });
    const don4Id = list4Res.data.donation._id;

    const req4Res = await axios.post(`${BASE_URL}/donations/${don4Id}/request`, {
      requestNotes: 'Hope Shelter sandwich claim',
      estimatedPickupTime: new Date(Date.now() + 30 * 60000).toISOString(),
    }, { headers: ngoHeaders });
    const req4Id = req4Res.data.request._id;

    const approve4Res = await axios.post(`${BASE_URL}/donations/${don4Id}/respond-request`, {
      requestId: req4Id,
      action: 'approve',
    }, { headers: providerHeaders });
    const otp4 = approve4Res.data.donation.pickupOtp;

    // Hope Shelter attempts to use otp3 (from Donation 3) on Donation 4
    try {
      await axios.post(`${BASE_URL}/donations/${don4Id}/verify-pickup`, { otp: otp3 }, { headers: ngoHeaders });
      assert(false, 'Cross-donation OTP rejection', 'Expected 400 Bad Request');
    } catch (err: any) {
      assert(err.response?.status === 400, 'Cross-donation OTP strictly rejected', '400 Bad Request');
    }

    // =========================================================================
    // TASK 7 — SCENARIO 5: Expired OTP → Rejected
    // =========================================================================
    console.log('\n--- TEST 5: Expired OTP → Rejected ---');

    // Simulate expired OTP on Donation 4 via demo helper
    await axios.post(`${BASE_URL}/demo/simulate-otp-expiry/${don4Id}`);

    try {
      await axios.post(`${BASE_URL}/donations/${don4Id}/verify-pickup`, {
        otp: otp4,
      }, { headers: ngoHeaders });
      assert(false, 'Expired OTP rejection', 'Expected 400 Bad Request');
    } catch (err: any) {
      assert(err.response?.status === 400, 'Expired OTP rejected with 400 Bad Request', err.response?.data?.message);
      assert(err.response?.data?.error === 'OTP Expired', 'Error identifies OTP Expired');
    }

    // =========================================================================
    // TASK 7 — SCENARIO 10: State Persistence & Consistency Verification
    // =========================================================================
    console.log('\n--- TEST 10: Persistence & Consistency ---');

    const provDon1Fetch = await axios.get(`${BASE_URL}/donations/${don1Id}`, { headers: providerHeaders });
    const don1Details = provDon1Fetch.data.donation;
    assert(don1Details.status === 'picked_up', 'Donation 1 persisted status is "picked_up"');
    
    // Verify public listings never leak pickupOtp
    const publicListingsRes = await axios.get(`${BASE_URL}/donations`);
    const publicDon1 = publicListingsRes.data.donations.find((d: any) => d._id === don1Id);
    assert(publicDon1?.pickupOtp === undefined, 'Public listings never leak pickupOtp');
    assert(publicDon1?.pickupOtpHashed === undefined, 'Public listings never leak pickupOtpHashed');

    const timelineEvents = don1Details.timeline.map((t: any) => t.status) || [];
    assert(timelineEvents.includes('picked_up'), 'Timeline contains "picked_up" event');

    // =========================================================================
    // FINAL VERIFICATION: End-to-End "Rajma Rice" Complete Lifecycle Test
    // =========================================================================
    console.log('\n================================================================================');
    console.log('🍛 FINAL VERIFICATION: End-to-End "Rajma Rice" Complete Lifecycle Test');
    console.log('================================================================================');

    // Step 1: Food Provider lists Rajma Rice
    const rajmaRes = await axios.post(`${BASE_URL}/donations`, {
      title: 'Rajma Rice Deluxe Meal Boxes',
      foodCategory: 'cooked_meals',
      dietaryType: 'veg',
      quantityMeals: 75,
      quantityKg: 35.0,
      preparationTime: new Date(Date.now() - 45 * 60000).toISOString(),
      collectionDeadline: new Date(Date.now() + 4 * 3600000).toISOString(),
      storageRequirement: 'hot_insulated',
      allergens: ['Dairy'],
      address: 'Main Banquet Kitchen, Taj Palace, SP Marg',
      city: 'New Delhi',
      contactName: 'Executive Chef Anand',
      contactPhone: '+91 98100 11223',
    }, { headers: providerHeaders });

    assert(rajmaRes.status === 201, 'Step 1: Food Provider lists Rajma Rice', 'HTTP 201 Created');
    const rajmaDonationId = rajmaRes.data.donation._id;
    assert(rajmaRes.data.donation.status === 'available', 'Step 1: Initial status is "available"');

    // Step 2: NGO requests collection
    const rajmaReqRes = await axios.post(`${BASE_URL}/donations/${rajmaDonationId}/request`, {
      requestNotes: 'Hope Shelter volunteer van arriving in 45 minutes.',
      estimatedPickupTime: new Date(Date.now() + 45 * 60000).toISOString(),
    }, { headers: ngoHeaders });

    assert(rajmaReqRes.status === 201, 'Step 2: NGO requests collection', 'HTTP 201 Created');
    const rajmaReqId = rajmaReqRes.data.request._id;

    // Step 3: Provider approves request
    const rajmaApproveRes = await axios.post(`${BASE_URL}/donations/${rajmaDonationId}/respond-request`, {
      requestId: rajmaReqId,
      action: 'approve',
    }, { headers: providerHeaders });

    assert(rajmaApproveRes.status === 200, 'Step 3: Provider approves collection request', 'HTTP 200 OK');
    assert(rajmaApproveRes.data.donation.status === 'accepted', 'Step 3: Status advanced to "accepted"');

    // Step 4: Pickup OTP generated
    const rajmaOtp = rajmaApproveRes.data.donation.pickupOtp;
    assert(typeof rajmaOtp === 'string' && /^\d{4}$/.test(rajmaOtp), 'Step 4: Cryptographic 4-digit pickup OTP generated', `Code: ${rajmaOtp}`);

    // Step 5: Provider accesses OTP
    const provGetOtpRes = await axios.get(`${BASE_URL}/donations/${rajmaDonationId}/pickup-otp`, { headers: providerHeaders });
    assert(provGetOtpRes.data.pickupOtp === rajmaOtp, 'Step 5: Provider securely accesses OTP from provider dashboard', provGetOtpRes.data.pickupOtp);
    assert(provGetOtpRes.data.attemptsRemaining === 5, 'Step 5: Attempts remaining is 5');

    // Step 6: Advance to pickup_scheduled
    const schedRes = await axios.post(`${BASE_URL}/donations/${rajmaDonationId}/status`, {
      nextStatus: 'pickup_scheduled',
      note: 'Driver dispatched to Taj Palace kitchen',
    }, { headers: ngoHeaders });
    assert(schedRes.data.donation.status === 'pickup_scheduled', 'Step 6: Status advanced to "pickup_scheduled"');

    // Step 7 & 8: NGO enters OTP & Backend verifies
    const rajmaVerifyRes = await axios.post(`${BASE_URL}/donations/${rajmaDonationId}/verify-pickup`, {
      otp: rajmaOtp,
      note: 'Driver arrived, temperature checked at 65°C, containers loaded',
    }, { headers: ngoHeaders });

    assert(rajmaVerifyRes.status === 200, 'Step 7 & 8: Backend verifies OTP securely', 'HTTP 200 OK');
    assert(rajmaVerifyRes.data.donation.status === 'picked_up', 'Step 9: Status changes to "picked_up"');

    // Step 10: NGO confirms delivery to shelter
    const deliveryOtp = rajmaRes.data.donation.deliveryOtp;
    const deliverRes = await axios.post(`${BASE_URL}/donations/${rajmaDonationId}/status`, {
      nextStatus: 'delivered',
      otp: deliveryOtp,
      note: 'Arrived at Hope Community Shelter, distributed to 75 residents',
    }, { headers: ngoHeaders });

    assert(deliverRes.status === 200, 'Step 10: Status changes to "delivered" via delivery confirmation', 'HTTP 200 OK');

    // Step 11: Mark completed
    const completeRes = await axios.post(`${BASE_URL}/donations/${rajmaDonationId}/status`, {
      nextStatus: 'completed',
      note: 'Rescue cycle 100% completed',
    }, { headers: providerHeaders });

    assert(completeRes.status === 200, 'Step 11: Delivery workflow continues to "completed" status', 'HTTP 200 OK');

    // Step 12: Verify full audit trail and state sequence
    const finalDonationRes = await axios.get(`${BASE_URL}/donations/${rajmaDonationId}`, { headers: providerHeaders });
    const timelineSequence = finalDonationRes.data.donation.timeline.map((t: any) => t.status) || [];
    assert(timelineSequence.includes('available'), 'Lifecycle: available verified');
    assert(timelineSequence.includes('requested'), 'Lifecycle: requested verified');
    assert(timelineSequence.includes('accepted'), 'Lifecycle: accepted verified');
    assert(timelineSequence.includes('pickup_scheduled'), 'Lifecycle: pickup_scheduled verified');
    assert(timelineSequence.includes('picked_up'), 'Lifecycle: picked_up verified');
    assert(timelineSequence.includes('delivered'), 'Lifecycle: delivered verified');
    assert(timelineSequence.includes('completed'), 'Lifecycle: completed verified');

    // =========================================================================
    // FINAL TEST REPORT
    // =========================================================================
    console.log('\n================================================================================');
    console.log(`🎉 PICKUP OTP AUTOMATION QA SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================================\n');

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
