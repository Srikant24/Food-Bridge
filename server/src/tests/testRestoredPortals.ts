import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Donation } from '../models/Donation';
import { ensureAdminProvisioned } from '../scripts/provisionAdmin';

const BASE_URL = 'http://localhost:5000/api';

function assert(condition: boolean, msg: string, detail?: any) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`, detail || '');
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`✅ PASS: ${msg}`);
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING RESTORED ROLE-BASED LOGIN & PORTALS TEST SUITE');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGODB_URI as string);
  await ensureAdminProvisioned();

  const ts = Date.now();
  const providerEmail = `test_prov_${ts}@portaltest.com`;
  const ngoEmail = `test_ngo_${ts}@portaltest.com`;
  const testPassword = 'SecurePassword123!';

  // Create active Provider
  await axios.post(`${BASE_URL}/auth/register`, {
    name: 'Chef Sanjeev',
    email: providerEmail,
    password: testPassword,
    role: 'provider',
    phone: '+91 98111 22233',
    organizationName: 'Sanjeev Royal Kitchen',
    organizationType: 'restaurant',
    address: 'Connaught Place',
    city: 'New Delhi',
  });

  // Create active NGO
  const regNgo = await axios.post(`${BASE_URL}/auth/register`, {
    name: 'Sister Teresa',
    email: ngoEmail,
    password: testPassword,
    role: 'ngo',
    phone: '+91 98111 44455',
    organizationName: 'City Hope Shelter',
    organizationType: 'ngo_shelter',
    address: 'Civil Lines',
    city: 'New Delhi',
  });
  // Approve NGO
  await mongoose.connection.collection('organizations').updateOne(
    { _id: new mongoose.Types.ObjectId(regNgo.data.user.organization.id) },
    { $set: { verificationStatus: 'verified' } }
  );

  // =========================================================================
  // 1. Food Provider Login via Provider Portal
  // =========================================================================
  console.log('--- 1. Food Provider Login via Provider Portal ---');
  const provLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: providerEmail,
    password: testPassword,
    portal: 'provider',
  });
  assert(provLoginRes.status === 200, 'Provider portal login returns HTTP 200 OK');
  assert(provLoginRes.data.user.role === 'provider', 'User role is "provider"');
  assert(Boolean(provLoginRes.data.token), 'Valid JWT token returned');
  const providerToken = provLoginRes.data.token;

  // Verify Provider can access provider routes
  const provIncomingReqs = await axios.get(`${BASE_URL}/donations/requests/incoming`, {
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  assert(provIncomingReqs.status === 200, 'Provider successfully accesses incoming collection requests');

  // =========================================================================
  // 2. NGO Login via NGO Portal
  // =========================================================================
  console.log('\n--- 2. NGO Login via NGO Portal ---');
  const ngoLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: ngoEmail,
    password: testPassword,
    portal: 'ngo',
  });
  assert(ngoLoginRes.status === 200, 'NGO portal login returns HTTP 200 OK');
  assert(ngoLoginRes.data.user.role === 'ngo', 'User role is "ngo"');
  assert(Boolean(ngoLoginRes.data.token), 'Valid JWT token returned');
  const ngoToken = ngoLoginRes.data.token;

  // Verify NGO can browse surplus donations
  const ngoBrowseRes = await axios.get(`${BASE_URL}/donations?status=available`, {
    headers: { Authorization: `Bearer ${ngoToken}` },
  });
  assert(ngoBrowseRes.status === 200, 'NGO successfully browses surplus donations');

  // =========================================================================
  // 3. Administrator Login via Admin Portal
  // =========================================================================
  console.log('\n--- 3. Administrator Login via Administrator Portal ---');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@foodbridge.org';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePass2026!';

  const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: adminEmail,
    password: adminPassword,
    portal: 'admin',
  });
  assert(adminLoginRes.status === 200, 'Administrator portal login returns HTTP 200 OK');
  assert(adminLoginRes.data.user.role === 'admin', 'User role is canonical "admin"');
  assert(Boolean(adminLoginRes.data.token), 'Valid JWT token returned for administrator');
  const adminToken = adminLoginRes.data.token;

  // Verify Admin can access admin analytics and verification routes
  const adminAnalyticsRes = await axios.get(`${BASE_URL}/admin/analytics`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminAnalyticsRes.status === 200, 'Administrator successfully accesses /admin/analytics');

  const pendingNgosRes = await axios.get(`${BASE_URL}/admin/pending-verifications`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(pendingNgosRes.status === 200, 'Administrator successfully accesses /admin/pending-verifications');

  // =========================================================================
  // 4. Session Persistence Across Page Refreshes
  // =========================================================================
  console.log('\n--- 4. Session Persistence Across Page Refreshes ---');
  const sessionMeRes = await axios.get(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(sessionMeRes.status === 200, 'Session token verified on /auth/me endpoint');
  assert(sessionMeRes.data.user.email === adminEmail.toLowerCase().trim(), 'Retrieved user matches authenticated session');

  // =========================================================================
  // 5. Logout & Discarded Session
  // =========================================================================
  console.log('\n--- 5. Logout & Unauthorized Token Rejection ---');
  try {
    await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer invalid_or_discarded_token' },
    });
    assert(false, 'Invalid token should have been rejected');
  } catch (err: any) {
    assert(err.response?.status === 401, 'Request with invalid/discarded token rejected with HTTP 401 Unauthorized');
  }

  // =========================================================================
  // 6. Cross-Role Dashboard & Portal Access Restrictions (Security)
  // =========================================================================
  console.log('\n--- 6. Cross-Role Dashboard & Portal Access Restrictions ---');

  // 6a: NGO attempts to log into Administrator portal -> Rejected with HTTP 403
  try {
    await axios.post(`${BASE_URL}/auth/login`, {
      email: ngoEmail,
      password: testPassword,
      portal: 'admin',
    });
    assert(false, 'NGO should be rejected when accessing Administrator portal');
  } catch (err: any) {
    assert(err.response?.status === 403, 'NGO attempting Administrator portal rejected with HTTP 403 Forbidden');
    assert(
      err.response?.data?.message?.includes('Administrator'),
      'Returned error explicitly states access denied for Administrator portal'
    );
  }

  // 6b: Food Provider attempts to log into Administrator portal -> Rejected with HTTP 403
  try {
    await axios.post(`${BASE_URL}/auth/login`, {
      email: providerEmail,
      password: testPassword,
      portal: 'admin',
    });
    assert(false, 'Provider should be rejected when accessing Administrator portal');
  } catch (err: any) {
    assert(err.response?.status === 403, 'Provider attempting Administrator portal rejected with HTTP 403 Forbidden');
  }

  // 6c: NGO attempts to access protected Admin API endpoint -> Rejected with HTTP 403
  try {
    await axios.get(`${BASE_URL}/admin/analytics`, {
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    assert(false, 'NGO should not be able to call admin endpoints');
  } catch (err: any) {
    assert(err.response?.status === 403, 'NGO calling /admin/analytics rejected with HTTP 403 Forbidden');
  }

  // 6d: Food Provider attempts to access protected Admin API endpoint -> Rejected with HTTP 403
  try {
    await axios.get(`${BASE_URL}/admin/pending-verifications`, {
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    assert(false, 'Provider should not be able to call admin endpoints');
  } catch (err: any) {
    assert(err.response?.status === 403, 'Provider calling /admin/pending-verifications rejected with HTTP 403 Forbidden');
  }

  // =========================================================================
  // 7. Existing Registered Accounts Continue Working
  // =========================================================================
  console.log('\n--- 7. Existing Registered Accounts Preservation ---');
  const yashProvider = await User.findOne({ email: 'sakshama1781@gmail.com' });
  assert(Boolean(yashProvider), 'Provider Yash Singh (sakshama1781@gmail.com) exists in MongoDB');
  assert(yashProvider?.role === 'provider', 'Yash Singh role is canonical provider');

  const ashishNgo = await User.findOne({ email: 'sakshamar2025@gmail.com' });
  assert(Boolean(ashishNgo), 'NGO Ashish Sharma (sakshamar2025@gmail.com) exists in MongoDB');
  assert(ashishNgo?.role === 'ngo', 'Ashish Sharma role is canonical ngo');

  const samosaDonation = await Donation.findOne({ providerId: yashProvider?._id });
  assert(Boolean(samosaDonation), 'Yash Singh donation (Samosa #F53AD7) is preserved and intact');
  assert(samosaDonation?.quantityMeals === 83, 'Samosa quantity is 83 meals');

  // =========================================================================
  // 8. Backend Demo Login Authentication in Dev vs Production
  // =========================================================================
  console.log('\n--- 8. Demo Login Authentication in Development Environment ---');
  
  // 8a: Provider demo login
  const demoProvRes = await axios.post(`${BASE_URL}/auth/demo-login`, { role: 'provider' });
  assert(demoProvRes.status === 200, 'Provider demo login succeeds in dev mode (HTTP 200 OK)');
  assert(demoProvRes.data.user.role === 'provider', 'Demo provider role is "provider"');
  assert(Boolean(demoProvRes.data.token), 'Valid signed JWT issued for demo provider');

  // 8b: NGO demo login
  const demoNgoRes = await axios.post(`${BASE_URL}/auth/demo-login`, { role: 'ngo' });
  assert(demoNgoRes.status === 200, 'NGO demo login succeeds in dev mode (HTTP 200 OK)');
  assert(demoNgoRes.data.user.role === 'ngo', 'Demo NGO role is "ngo"');
  assert(Boolean(demoNgoRes.data.token), 'Valid signed JWT issued for demo NGO');

  // 8c: Admin demo login
  const demoAdminRes = await axios.post(`${BASE_URL}/auth/demo-login`, { role: 'admin' });
  assert(demoAdminRes.status === 200, 'Admin demo login succeeds in dev mode (HTTP 200 OK)');
  assert(demoAdminRes.data.user.role === 'admin', 'Demo Admin role is "admin"');
  assert(Boolean(demoAdminRes.data.token), 'Valid signed JWT issued for demo Admin');

  console.log('\n====================================================');
  console.log('🎉 ALL 8 TEST VERIFICATIONS PASSED WITH 100% SUCCESS!');
  console.log('====================================================');

  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
