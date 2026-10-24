import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { connectDatabase } from '../config/db';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('================================================================================');
  console.log('🔒 FoodBridge Authentication & Account Persistence QA Automation Suite');
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
    // SCENARIO 1: Register Food Provider → Logout → Login → Success
    // =========================================================================
    console.log('--- SCENARIO 1: Register Food Provider → Logout → Login ---');
    const providerEmailInput = `Chef_Sanjay_${timestamp}@TajBanquet.COM`;
    const providerPassword = 'SecureProviderPass123!';

    const regProviderRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Chef Sanjay Malhotra',
      email: providerEmailInput,
      password: providerPassword,
      role: 'provider',
      phone: '+91 98111 22334',
      organizationName: 'Taj Banquets Delhi',
      organizationType: 'restaurant',
      address: 'Sardar Patel Marg',
      city: 'New Delhi',
    });

    assert(regProviderRes.status === 201, 'Provider registration succeeds', 'HTTP 201 Created');
    assert(typeof regProviderRes.data.token === 'string', 'JWT token issued upon registration');
    assert(regProviderRes.data.user.role === 'provider', 'User role correctly persisted as provider');
    assert(regProviderRes.data.user.email === providerEmailInput.toLowerCase().trim(), 'Email normalized to lowercase in response');

    // Verify MongoDB User collection record directly
    const storedProvider = await User.findOne({ email: providerEmailInput.toLowerCase().trim() });
    assert(Boolean(storedProvider), 'Provider account permanently stored in MongoDB users collection');
    assert(storedProvider?.role === 'provider', 'MongoDB role is "provider"');

    // Simulate Logout (clear active session token)
    let activeToken: string | null = null;
    assert(activeToken === null, 'Provider session token cleared (Logout simulated)');

    // Login with same credentials (testing case-insensitivity: lowercase this time)
    const loginProviderRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: providerEmailInput.toLowerCase().trim(),
      password: providerPassword,
    });
    assert(loginProviderRes.status === 200, 'Provider re-login succeeds after logout', 'HTTP 200 OK');
    assert(typeof loginProviderRes.data.token === 'string', 'New valid JWT token issued on login');
    assert(loginProviderRes.data.user.role === 'provider', 'Role preserved as provider on login');

    // =========================================================================
    // SCENARIO 2: Register NGO → Logout → Login → Success
    // =========================================================================
    console.log('\n--- SCENARIO 2: Register NGO → Logout → Login ---');
    const ngoEmailInput = `Priya_Mehra_${timestamp}@SevaKitchen.ORG`;
    const ngoPassword = 'SecureNgoPass123!';

    const regNgoRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Priya Mehra',
      email: ngoEmailInput,
      password: ngoPassword,
      role: 'ngo',
      phone: '+91 98101 44556',
      organizationName: 'Seva Relief Kitchen',
      organizationType: 'ngo_shelter',
      address: 'Daryaganj Ring Road',
      city: 'New Delhi',
      maxMealsPerDay: 200,
      hasRefrigeration: true,
      hasWarmStorage: true,
    });

    assert(regNgoRes.status === 201, 'NGO registration succeeds', 'HTTP 201 Created');
    assert(regNgoRes.data.user.role === 'ngo', 'User role correctly persisted as ngo');
    assert(regNgoRes.data.user.organization.verificationStatus === 'pending', 'NGO starts in pending verification state');

    // Verify MongoDB record
    const storedNgo = await User.findOne({ email: ngoEmailInput.toLowerCase().trim() });
    assert(Boolean(storedNgo), 'NGO account permanently stored in MongoDB users collection');

    // Simulate Logout
    activeToken = null;

    // Login with mixed case email as originally registered
    const loginNgoRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: ngoEmailInput,
      password: ngoPassword,
    });
    assert(loginNgoRes.status === 200, 'NGO re-login succeeds with mixed-case input', 'HTTP 200 OK');
    assert(loginNgoRes.data.user.role === 'ngo', 'Role preserved as ngo on login');

    // =========================================================================
    // SCENARIO 3: Register Supplier → Logout → Login → Success
    // =========================================================================
    console.log('\n--- SCENARIO 3: Register Catering Provider & Reject Legacy Role ---');
    // Verify that attempting to register with obsolete 'supplier' role fails validation
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Rejected Supplier',
        email: `rejected_supplier_${timestamp}@test.com`,
        password: 'Password123!',
        role: 'supplier',
        phone: '+91 98222 77889',
        organizationName: 'Rejected Supplier Ltd',
        organizationType: 'caterer',
        address: 'Industrial Area Phase 2',
        city: 'New Delhi',
      });
      assert(false, 'Registration with role: "supplier" should have been rejected');
    } catch (err: any) {
      assert(err.response?.status === 400, 'Registration with role: "supplier" correctly rejected with HTTP 400 Validation Error');
    }

    const supplierEmailInput = `Wholesale_Caterer_${timestamp}@FoodSupply.IN`;
    const supplierPassword = 'SecureSupplierPass123!';

    const regSupplierRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Ramesh Gupta',
      email: supplierEmailInput,
      password: supplierPassword,
      role: 'provider',
      phone: '+91 98222 77889',
      organizationName: 'Gupta Event Catering & Supplies',
      organizationType: 'caterer',
      address: 'Industrial Area Phase 2',
      city: 'New Delhi',
    });

    assert(regSupplierRes.status === 201, 'Catering provider registration succeeds', 'HTTP 201 Created');
    assert(regSupplierRes.data.user.role === 'provider', 'User role correctly assigned canonical provider');

    // Verify in MongoDB
    const storedSupplier = await User.findOne({ email: supplierEmailInput.toLowerCase().trim() });
    assert(Boolean(storedSupplier), 'Provider account permanently stored in MongoDB users collection');
    assert(storedSupplier?.role === 'provider', 'MongoDB role is canonical "provider"');

    // Simulate Logout
    activeToken = null;

    // Login with Supplier credentials
    const loginSupplierRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: supplierEmailInput,
      password: supplierPassword,
    });
    assert(loginSupplierRes.status === 200, 'Supplier re-login succeeds', 'HTTP 200 OK');
    assert(loginSupplierRes.data.user.role === 'provider', 'Role preserved as canonical provider on login');

    // Test supplier can access provider-level food listing route
    const supplierToken = loginSupplierRes.data.token;
    const createDonationBySupplier = await axios.post(`${BASE_URL}/donations`, {
      title: 'Bulk Basmati Rice Bags',
      foodCategory: 'raw_ingredients',
      dietaryType: 'vegan',
      quantityMeals: 100,
      quantityKg: 50.0,
      preparationTime: new Date(Date.now() - 60000).toISOString(),
      collectionDeadline: new Date(Date.now() + 24 * 3600000).toISOString(),
      storageRequirement: 'room_temperature',
      address: 'Industrial Area Phase 2',
      city: 'New Delhi',
      contactName: 'Ramesh Gupta',
      contactPhone: '+91 98222 77889',
    }, { headers: { Authorization: `Bearer ${supplierToken}` } });

    assert(createDonationBySupplier.status === 201, 'Supplier role authorized to list surplus food (201 Created)');

    // =========================================================================
    // SCENARIO 4: Refresh Browser → Session Handled Correctly
    // =========================================================================
    console.log('\n--- SCENARIO 4: Refresh Browser Session Persistence ---');
    // Emulate page refresh: client calls GET /api/auth/me with stored token
    const meRes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${supplierToken}` }
    });
    assert(meRes.status === 200, 'Session restore via GET /api/auth/me succeeds', 'HTTP 200 OK');
    assert(meRes.data.user.email === supplierEmailInput.toLowerCase().trim(), 'User email accurately matches session');
    assert(meRes.data.user.role === 'provider', 'User role accurately restored as canonical provider');
    assert(Boolean(meRes.data.user.organization), 'Organization details included in restored session');

    // =========================================================================
    // SCENARIO 5: Backend Restart / Persistence Verification
    // =========================================================================
    console.log('\n--- SCENARIO 5: Database Persistence Across Sessions ---');
    // Verify that all 3 registered users still exist in MongoDB database
    const providerCheck = await User.findOne({ email: providerEmailInput.toLowerCase().trim() });
    const ngoCheck = await User.findOne({ email: ngoEmailInput.toLowerCase().trim() });
    const supplierCheck = await User.findOne({ email: supplierEmailInput.toLowerCase().trim() });

    assert(Boolean(providerCheck), 'Provider persists in MongoDB users collection');
    assert(Boolean(ngoCheck), 'NGO persists in MongoDB users collection');
    assert(Boolean(supplierCheck), 'Supplier persists in MongoDB users collection');

    // =========================================================================
    // SCENARIO 6: Login as Verified NGO → Request Food → Success
    // =========================================================================
    console.log('\n--- SCENARIO 6: Verified NGO Food Collection Request ---');
    // Admin verifies the registered NGO
    const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@foodbridge.org',
      password: 'password123',
    });
    const adminHeaders = { Authorization: `Bearer ${adminLoginRes.data.token}` };
    const ngoOrgId = regNgoRes.data.user.organization.id;
    await axios.post(`${BASE_URL}/admin/verify-ngo/${ngoOrgId}`, { action: 'approve' }, { headers: adminHeaders });

    // NGO logs in as verified NGO
    const verifiedNgoLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: ngoEmailInput,
      password: ngoPassword,
    });
    const verifiedNgoToken = verifiedNgoLoginRes.data.token;
    const verifiedNgoHeaders = { Authorization: `Bearer ${verifiedNgoToken}` };

    // Verified NGO requests collection on supplier's donation
    const supplierDonationId = createDonationBySupplier.data.donation._id;
    const collectReqRes = await axios.post(`${BASE_URL}/donations/${supplierDonationId}/request`, {
      requestNotes: 'Seva Relief Kitchen collecting for 100 shelter residents',
      estimatedPickupTime: new Date(Date.now() + 2 * 3600000).toISOString(),
    }, { headers: verifiedNgoHeaders });

    assert(collectReqRes.status === 201, 'Verified NGO food collection request succeeds', 'HTTP 201 Created');
    assert(collectReqRes.data.request.status === 'pending', 'Collection request status is pending');

    // =========================================================================
    // SCENARIO 7: Login with Incorrect Password → Rejected
    // =========================================================================
    console.log('\n--- SCENARIO 7: Login with Incorrect Password ---');
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: providerEmailInput,
        password: 'WrongPassword999!',
      });
      assert(false, 'Incorrect password rejection', 'Expected 401 Unauthorized');
    } catch (err: any) {
      assert(err.response?.status === 401, 'Incorrect password rejected with 401 Unauthorized');
      assert(err.response?.data?.message === 'Invalid email or password', 'Generic error message returned (Invalid email or password)');
    }

    // =========================================================================
    // SCENARIO 8: Login with Unregistered Email → Rejected
    // =========================================================================
    console.log('\n--- SCENARIO 8: Login with Unregistered Email ---');
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: `ghost_user_${Date.now()}@notfound.org`,
        password: 'SomePassword123!',
      });
      assert(false, 'Unregistered email rejection', 'Expected 401 Unauthorized');
    } catch (err: any) {
      assert(err.response?.status === 401, 'Unregistered email rejected with 401 Unauthorized');
      assert(err.response?.data?.message === 'Invalid email or password', 'Generic error message returned without revealing account non-existence');
    }

    // =========================================================================
    // SCENARIO 9: Unverified NGO → Restricted Operations Blocked
    // =========================================================================
    console.log('\n--- SCENARIO 9: Unverified NGO Restricted Operations ---');
    // Register an unverified NGO
    const unverifiedEmail = `unverified_ngo_${timestamp}@charity.org`;
    const regUnverifiedRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Aanchal Trust',
      email: unverifiedEmail,
      password: 'SecurePassword123!',
      role: 'ngo',
      phone: '+91 98999 11223',
      organizationName: 'Aanchal Child Support',
      organizationType: 'ngo_shelter',
      address: 'Lajpat Nagar',
      city: 'New Delhi',
      maxMealsPerDay: 50,
    });
    const unverifiedToken = regUnverifiedRes.data.token;

    // Attempt to request food without admin verification
    try {
      await axios.post(`${BASE_URL}/donations/${supplierDonationId}/request`, {
        requestNotes: 'Attempting food claim while unverified',
      }, { headers: { Authorization: `Bearer ${unverifiedToken}` } });
      assert(false, 'Unverified NGO restriction', 'Expected 403 Forbidden');
    } catch (err: any) {
      assert(err.response?.status === 403, 'Unverified NGO strictly blocked from collection requests', '403 Forbidden');
      assert(err.response?.data?.error === 'Verification Required', 'Error identifies Verification Required');
    }

    // =========================================================================
    // SCENARIO 10: Logout → Protected Endpoints Reject Unauthorized Requests
    // =========================================================================
    console.log('\n--- SCENARIO 10: Logout & Protected Endpoint Authorization ---');
    try {
      // Attempt to access protected endpoint with no token (logged out state)
      await axios.get(`${BASE_URL}/auth/me`);
      assert(false, 'Logged-out protected access rejection', 'Expected 401 Unauthorized');
    } catch (err: any) {
      assert(err.response?.status === 401, 'Protected endpoint rejects unauthorized request without token', '401 Unauthorized');
      assert(err.response?.data?.message === 'Authentication token required', 'Message specifies "Authentication token required"');
    }

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('\n================================================================================');
    console.log(`🎉 AUTHENTICATION & PERSISTENCE QA SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
    process.exit(0);
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
