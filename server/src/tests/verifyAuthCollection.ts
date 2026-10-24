import jwt from 'jsonwebtoken';

async function runE2EAuthVerification() {
  const baseURL = 'http://localhost:5000';
  console.log('================================================================');
  console.log('🔍 E2E Authentication & Food Collection Request Verification');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string, details = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message} ${details ? '— ' + details : ''}`);
      failed++;
    }
  }

  // 1. Provider Login
  const provLogin = await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'provider@foodbridge.org', password: 'password123' })
  }).then(r => r.json());
  assert(provLogin.token && provLogin.user.role === 'provider', 'Provider login succeeds with role "provider"');

  // 2. Create a clean surplus donation for this test
  const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const prepTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const newDonationRes = await fetch(`${baseURL}/api/donations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provLogin.token}`
    },
    body: JSON.stringify({
      title: 'Fresh Paneer Curry & Rice Batch (E2E Verification)',
      description: 'Vacuum packed fresh vegetarian dinner.',
      foodCategory: 'cooked_meals',
      dietaryType: 'veg',
      quantityMeals: 50,
      quantityKg: 20,
      preparationTime: prepTime,
      collectionDeadline: deadline,
      storageRequirement: 'hot_insulated',
      contactName: 'Chef Rajesh Sharma',
      contactPhone: '+91 98112 34567',
      address: 'Connaught Place Loading Bay',
      city: 'New Delhi',
    })
  }).then(r => r.json());
  assert(newDonationRes.donation && newDonationRes.donation._id, 'Fresh donation listing created for verification');
  const targetDonation = newDonationRes.donation;
  console.log(`  → Using target donation: "${targetDonation.title}" (ID: ${targetDonation._id}, meals: ${targetDonation.quantityMeals})`);

  // 3. Scenario: Unauthenticated / Missing Token -> 401 Unauthorized
  console.log('\n--- Scenario 1: Request Food Collection WITHOUT Token ---');
  const noTokenRes = await fetch(`${baseURL}/api/donations/${targetDonation._id}/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestNotes: 'Unauthenticated pickup attempt',
      estimatedPickupTime: new Date(Date.now() + 3600000).toISOString()
    })
  });
  const noTokenData = await noTokenRes.json();
  assert(noTokenRes.status === 401, 'Unauthenticated request correctly returns HTTP 401 Unauthorized');
  assert(noTokenData.message === 'Authentication token required', `Correct error message returned: "${noTokenData.message}"`);

  // 4. Scenario: Malformed / Invalid / Expired Token -> 401 Unauthorized
  console.log('\n--- Scenario 2: Request Food Collection with Expired / Invalid Token ---');
  const fakeToken = jwt.sign(
    { userId: '000000000000000000000000', role: 'ngo' },
    'foodbridge_super_secret_jwt_key_hackathon_2025_dev_mode',
    { expiresIn: '0s' } // immediately expired
  );
  const expiredRes = await fetch(`${baseURL}/api/donations/${targetDonation._id}/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${fakeToken}`
    },
    body: JSON.stringify({
      requestNotes: 'Expired token attempt',
      estimatedPickupTime: new Date(Date.now() + 3600000).toISOString()
    })
  });
  const expiredData = await expiredRes.json();
  assert(expiredRes.status === 401, 'Expired token request correctly returns HTTP 401 Unauthorized');
  assert(expiredData.message === 'Invalid or expired authentication token', `Message indicates invalid/expired token: "${expiredData.message}"`);

  // 5. Scenario: Food Provider Account -> NGO-only Request API -> 403 Forbidden
  console.log('\n--- Scenario 3: Food Provider Account calling NGO-only Request API ---');
  const provReqRes = await fetch(`${baseURL}/api/donations/${targetDonation._id}/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provLogin.token}`
    },
    body: JSON.stringify({
      requestNotes: 'Provider trying to claim surplus',
      estimatedPickupTime: new Date(Date.now() + 3600000).toISOString()
    })
  });
  const provReqData = await provReqRes.json();
  assert(provReqRes.status === 403, 'Provider account blocked from NGO request endpoint with HTTP 403 Forbidden');
  assert(provReqData.message.includes('Access denied. Requires one of the following roles: ngo'), `Correct RBAC message returned: "${provReqData.message}"`);

  // 6. Scenario: Unverified NGO Account -> Request Food -> 403 Forbidden
  console.log('\n--- Scenario 4: Unverified NGO Account attempting Food Request ---');
  const unverifiedNgoRes = await fetch(`${baseURL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Unverified Contact',
      email: `unverified_ngo_${Date.now()}@test.org`,
      password: 'password123',
      role: 'ngo',
      phone: '+91 98999 12345',
      organizationName: `Test Unverified Shelter ${Date.now()}`,
      organizationType: 'ngo_shelter',
      address: 'Sector 15, Rohini',
      city: 'New Delhi',
      maxMealsPerDay: 100,
    })
  }).then(r => r.json());
  assert(unverifiedNgoRes.token && unverifiedNgoRes.user.organization.verificationStatus === 'pending', 'New NGO registered with verificationStatus "pending"');

  const unverifiedReqRes = await fetch(`${baseURL}/api/donations/${targetDonation._id}/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${unverifiedNgoRes.token}`
    },
    body: JSON.stringify({
      requestNotes: 'Unverified NGO trying to request',
      estimatedPickupTime: new Date(Date.now() + 3600000).toISOString()
    })
  });
  const unverifiedReqData = await unverifiedReqRes.json();
  assert(unverifiedReqRes.status === 403, 'Unverified NGO blocked with HTTP 403 Forbidden');
  assert(unverifiedReqData.message.includes('must be verified by an administrator'), `Correct verification message: "${unverifiedReqData.message}"`);

  // 7. Scenario: Authenticated, Verified NGO -> Request Food Collection -> SUCCESS
  console.log('\n--- Scenario 5: Authenticated & Verified NGO Request Food Collection ---');
  const ngoLogin = await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ngo@hopekitchen.org', password: 'password123' })
  }).then(r => r.json());
  assert(ngoLogin.token && ngoLogin.user.role === 'ngo', 'Verified NGO login succeeds (Hope Community Shelter)');
  assert(ngoLogin.user.organization.verificationStatus === 'verified', 'NGO organization status is verified');

  // Update capacity to 200 meals
  await fetch(`${baseURL}/api/ngos/capacity`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ngoLogin.token}`
    },
    body: JSON.stringify({
      maxMealsPerDay: 250,
      currentAvailableCapacity: 200,
    })
  });

  // Test session persistence: Fetch /api/auth/me (simulating page refresh)
  const meRes = await fetch(`${baseURL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${ngoLogin.token}` }
  }).then(r => r.json());
  assert(meRes.user && meRes.user.email === 'ngo@hopekitchen.org', 'Session correctly persisted and validated via /api/auth/me');

  // Validate pickup date constraints: Past date should fail with 400
  const pastDateRes = await fetch(`${baseURL}/api/donations/${targetDonation._id}/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ngoLogin.token}`
    },
    body: JSON.stringify({
      requestNotes: 'Testing past pickup time',
      estimatedPickupTime: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    })
  });
  const pastDateData = await pastDateRes.json();
  assert(pastDateRes.status === 400, 'Past pickup time correctly rejected with HTTP 400 Bad Request');
  assert(pastDateData.message.includes('must be in the future'), `Date validation message: "${pastDateData.message}"`);

  // Submit valid request with future pickup time
  const pickupTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const validReqRes = await fetch(`${baseURL}/api/donations/${targetDonation._id}/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ngoLogin.token}`
    },
    body: JSON.stringify({
      requestNotes: 'Refrigerated van #2 dispatched for evening shelter dinner.',
      estimatedPickupTime: pickupTime
    })
  });
  const validReqData = await validReqRes.json();
  assert(validReqRes.status === 201, 'Verified NGO food collection request succeeds with HTTP 201 Created');
  assert(validReqData.message === 'Donation request submitted successfully', `Success confirmation received: "${validReqData.message}"`);
  assert(validReqData.request && validReqData.request._id, 'New DonationRequest record returned with valid MongoDB _id');
  assert(validReqData.request.status === 'pending', 'Request status initialized to "pending"');

  const createdRequestId = validReqData.request._id;

  // 8. Scenario: Duplicate request prevention
  console.log('\n--- Scenario 6: Prevent Duplicate Food Requests ---');
  const dupReqRes = await fetch(`${baseURL}/api/donations/${targetDonation._id}/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ngoLogin.token}`
    },
    body: JSON.stringify({
      requestNotes: 'Duplicate submission attempt',
      estimatedPickupTime: pickupTime
    })
  });
  const dupReqData = await dupReqRes.json();
  assert(dupReqRes.status === 409, 'Duplicate request prevented with HTTP 409 Conflict');
  assert(dupReqData.message.includes('already submitted a request'), `Duplicate message returned: "${dupReqData.message}"`);

  // 9. Scenario: Inspect Donation Lifecycle and Notification in MongoDB
  console.log('\n--- Scenario 7: Verify Database Updates & Provider Notification ---');
  const updatedDonation = await fetch(`${baseURL}/api/donations/${targetDonation._id}`).then(r => r.json());
  assert(updatedDonation.donation.status === 'requested', `Donation status updated from available to "${updatedDonation.donation.status}"`);
  assert(updatedDonation.requests.some((r: any) => r._id === createdRequestId), 'Created request appears in donation requests array');

  // Check Provider Notification
  const provNotifRes = await fetch(`${baseURL}/api/notifications`, {
    headers: { 'Authorization': `Bearer ${provLogin.token}` }
  }).then(r => r.json());
  const incomingReqNotif = provNotifRes.notifications.find((n: any) => n.type === 'request' && n.metadata?.requestId === createdRequestId);
  assert(!!incomingReqNotif, 'Food Provider received incoming collection request notification');
  if (incomingReqNotif) {
    console.log(`  → Provider Notification: "${incomingReqNotif.title}" — "${incomingReqNotif.message}"`);
  }

  // 10. Scenario: Srikant NGO Account (User persona from problem description)
  console.log('\n--- Scenario 8: Srikant NGO Persona Session & Collection Request ---');
  // Register Srikant NGO
  const srikantEmail = `sktsharma_${Date.now()}@gmail.com`;
  const srikantRegRes = await fetch(`${baseURL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Srikant Sharma',
      email: srikantEmail,
      password: 'password123',
      role: 'ngo',
      phone: '+91 89204 65176',
      organizationName: 'Vikas Prayojan',
      organizationType: 'ngo_shelter',
      address: 'Alpha-2, Commercial Belt',
      city: 'Greater Noida',
      maxMealsPerDay: 200,
    })
  }).then(r => r.json());
  assert(srikantRegRes.token && srikantRegRes.user.name === 'Srikant Sharma', 'Srikant NGO registered successfully');
  const srikantOrgId = srikantRegRes.user.organization.id;

  // Admin approves Srikant NGO verification
  const adminLogin = await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@foodbridge.org', password: 'password123' })
  }).then(r => r.json());
  assert(adminLogin.token && adminLogin.user.role === 'admin', 'Admin logged in to review pending NGO verifications');

  const verifyRes = await fetch(`${baseURL}/api/admin/verify-ngo/${srikantOrgId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminLogin.token}`
    },
    body: JSON.stringify({ action: 'approve', notes: 'Verified Food Safety & Storage Audits' })
  }).then(r => r.json());
  assert(verifyRes.organization && verifyRes.organization.verificationStatus === 'verified', 'Vikas Prayojan verified by Administrator');

  // Srikant logs in
  const srikantLogin = await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: srikantEmail, password: 'password123' })
  }).then(r => r.json());
  assert(srikantLogin.token && srikantLogin.user.organization.verificationStatus === 'verified', 'Srikant logged in with verified NGO session');

  // Verify session persistence via /api/auth/me
  const srikantMe = await fetch(`${baseURL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${srikantLogin.token}` }
  }).then(r => r.json());
  assert(srikantMe.user.name === 'Srikant Sharma' && srikantMe.user.role === 'ngo', 'Srikant session successfully persisted across refresh');

  // Create another fresh donation for Srikant to claim
  const srikantDonationRes = await fetch(`${baseURL}/api/donations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provLogin.token}`
    },
    body: JSON.stringify({
      title: 'North Indian Meal (Surplus Thali)',
      description: 'Vegetarian thali surplus from banquet event.',
      foodCategory: 'cooked_meals',
      dietaryType: 'veg',
      quantityMeals: 99,
      quantityKg: 40.1,
      preparationTime: prepTime,
      collectionDeadline: deadline,
      storageRequirement: 'room_temperature',
      contactName: 'Chef Rajesh Sharma',
      contactPhone: '+91 98112 34567',
      address: 'Central Hub Loading Dock',
      city: 'Greater Noida',
    })
  }).then(r => r.json());
  assert(srikantDonationRes.donation && srikantDonationRes.donation._id, 'Donation "North Indian Meal" (99 meals) created by provider');

  // Srikant submits collection request
  const srikantReqRes = await fetch(`${baseURL}/api/donations/${srikantDonationRes.donation._id}/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${srikantLogin.token}`
    },
    body: JSON.stringify({
      requestNotes: 'Vikas Prayojan team arriving at 4:30 PM with insulated food vans.',
      estimatedPickupTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
    })
  });
  const srikantReqData = await srikantReqRes.json();
  assert(srikantReqRes.status === 201, 'Srikant NGO successfully submitted collection request (HTTP 201 Created)');
  assert(srikantReqData.message === 'Donation request submitted successfully', `Confirmation: "${srikantReqData.message}"`);
  assert(srikantReqData.request && srikantReqData.request.ngoId, 'Request linked to Srikant NGO ID in MongoDB');


  console.log('\n================================================================');
  console.log(`📊 FINAL TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2EAuthVerification().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
