import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Donation } from '../models/Donation';
import { DonationRequest } from '../models/DonationRequest';
import { connectDatabase } from '../config/db';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('================================================================================');
  console.log('🧪 FoodBridge Simplified Registration Workflow QA Automation Suite');
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
    // TEST 1: Register a new Food Provider (role: "provider")
    // =========================================================================
    console.log('--- TEST 1: Register New Food Provider ---');
    const providerEmail = `kitchen_head_${timestamp}@delhihospitality.com`;
    const providerPassword = 'HospitalityPass123!';

    const regProviderRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Chef Ananya Verma',
      email: providerEmail,
      password: providerPassword,
      role: 'provider',
      phone: '+91 98100 55443',
      organizationName: 'Verma Gourmet Kitchens',
      organizationType: 'restaurant',
      address: 'Shop 14, Defence Colony Market',
      city: 'New Delhi',
    });

    assert(regProviderRes.status === 201, 'Food Provider registration succeeds', 'HTTP 201 Created');
    assert(regProviderRes.data.user.role === 'provider', 'User role assigned canonical "provider"');
    assert(Boolean(regProviderRes.data.token), 'JWT token returned on registration');

    const providerInDb = await User.findOne({ email: providerEmail.toLowerCase() }).exec();
    assert(Boolean(providerInDb), 'Provider account saved in MongoDB users collection');
    assert(providerInDb?.role === 'provider', 'MongoDB user record role is "provider"');

    // =========================================================================
    // TEST 2: Log out and log in again
    // =========================================================================
    console.log('\n--- TEST 2: Log Out and Re-Login with Food Provider Credentials ---');
    // Emulate logout by clearing token
    let activeToken: string | null = null;

    // Login with same credentials
    const loginProviderRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: providerEmail,
      password: providerPassword,
    });

    assert(loginProviderRes.status === 200, 'Re-login succeeds with HTTP 200 OK');
    activeToken = loginProviderRes.data.token;
    assert(Boolean(activeToken), 'Fresh valid JWT token issued on re-login');
    assert(loginProviderRes.data.user.role === 'provider', 'Session role preserved as "provider"');

    // =========================================================================
    // TEST 3: Create a food donation successfully
    // =========================================================================
    console.log('\n--- TEST 3: Create Food Donation Successfully ---');
    const donationPayload = {
      title: `Nutritious Khichdi & Sabzi Batch ${timestamp}`,
      description: 'Hot, freshly cooked wholesome lentils and rice batch packed in sealed containers.',
      foodCategory: 'cooked_meals',
      dietaryType: 'veg',
      quantityMeals: 50,
      quantityKg: 22.0,
      preparationTime: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      collectionDeadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      storageRequirement: 'hot_insulated',
      allergens: ['Dairy'],
      address: 'Shop 14, Defence Colony Market',
      city: 'New Delhi',
      contactName: 'Chef Ananya Verma',
      contactPhone: '+91 98100 55443',
      pickupInstructions: 'Kitchen loading bay accessible via rear lane.',
    };

    const createDonationRes = await axios.post(`${BASE_URL}/donations`, donationPayload, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });

    assert(createDonationRes.status === 201, 'Food donation created successfully (HTTP 201 Created)');
    const donationId = createDonationRes.data.donation._id;
    assert(Boolean(donationId), 'Donation ID returned in response');

    const donationInDb = await Donation.findById(donationId).exec();
    assert(Boolean(donationInDb), 'Donation confirmed saved in MongoDB');
    assert(donationInDb?.status === 'available', 'Donation initial status is "available"');

    // =========================================================================
    // TEST 4: Register a new NGO (role: "ngo")
    // =========================================================================
    console.log('\n--- TEST 4: Register New NGO / Shelter ---');
    const ngoEmail = `director_hope_${timestamp}@delhicares.ngo`;
    const ngoPassword = 'NgoDirectorPass123!';

    const regNgoRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Kavita Deshmukh',
      email: ngoEmail,
      password: ngoPassword,
      role: 'ngo',
      phone: '+91 98711 88990',
      organizationName: 'Delhi Cares Foundation Shelter',
      organizationType: 'ngo_shelter',
      address: 'Plot 8, Jangpura Extension',
      city: 'New Delhi',
      registrationNumber: `NGO-DEL-${timestamp.toString().slice(-6)}`,
      maxMealsPerDay: 250,
      hasRefrigeration: true,
      hasWarmStorage: true,
      hasTransportFleet: true,
    });

    assert(regNgoRes.status === 201, 'NGO registration succeeds', 'HTTP 201 Created');
    assert(regNgoRes.data.user.role === 'ngo', 'User role assigned canonical "ngo"');

    const ngoInDb = await User.findOne({ email: ngoEmail.toLowerCase() }).exec();
    assert(Boolean(ngoInDb), 'NGO account saved in MongoDB users collection');
    assert(ngoInDb?.role === 'ngo', 'MongoDB user record role is "ngo"');

    // =========================================================================
    // TEST 5: Log out and log in again (NGO)
    // =========================================================================
    console.log('\n--- TEST 5: Log Out and Re-Login with NGO Credentials ---');
    let activeNgoToken: string | null = null;

    const loginNgoRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: ngoEmail,
      password: ngoPassword,
    });

    assert(loginNgoRes.status === 200, 'NGO re-login succeeds with HTTP 200 OK');
    activeNgoToken = loginNgoRes.data.token;
    assert(Boolean(activeNgoToken), 'Fresh valid JWT token issued to NGO');
    assert(loginNgoRes.data.user.role === 'ngo', 'Session role preserved as "ngo"');

    // =========================================================================
    // TEST 6: Request food collection successfully
    // =========================================================================
    console.log('\n--- TEST 6: NGO Requests Food Collection Successfully ---');
    // Ensure NGO organization is verified for claim
    if (ngoInDb && ngoInDb.organizationId) {
      await Organization.findByIdAndUpdate(ngoInDb.organizationId, { verificationStatus: 'verified' });
    }

    const requestRes = await axios.post(`${BASE_URL}/donations/${donationId}/request`, {
      requestNotes: 'We have 2 delivery vans equipped with insulated containers ready for pickup.',
      estimatedPickupTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    }, {
      headers: { Authorization: `Bearer ${activeNgoToken}` },
    });

    assert(requestRes.status === 201, 'NGO food collection request created (HTTP 201 Created)');
    const reqId = requestRes.data.request._id;
    assert(Boolean(reqId), 'Collection request ID returned');

    const requestInDb = await DonationRequest.findById(reqId).exec();
    assert(Boolean(requestInDb), 'Collection request saved in MongoDB');
    assert(requestInDb?.status === 'pending', 'Collection request status is "pending"');

    // =========================================================================
    // TEST 7: Verify Supplier is no longer displayed anywhere in public registration
    // =========================================================================
    console.log('\n--- TEST 7: Verify Supplier is Completely Removed from Public Registration ---');
    
    // Check Registration Page source file: ensure no Supplier tab or option exists
    const registerPageSource = fs.readFileSync(path.resolve(__dirname, '../../../client/src/pages/RegisterPage.tsx'), 'utf-8');
    const hasSupplierTab = registerPageSource.includes('Supplier</span>') || 
                           registerPageSource.includes("setRole('supplier')") || 
                           registerPageSource.includes('role === \'supplier\'');
    assert(!hasSupplierTab, 'Supplier tab and role selection completely removed from RegisterPage.tsx');

    // Check that RegisterPage only offers 2 tabs
    const hasProviderTab = registerPageSource.includes('Food Provider</span>');
    const hasNgoTab = registerPageSource.includes('NGO / Shelter</span>');
    assert(hasProviderTab && hasNgoTab, 'RegisterPage displays only Food Provider and NGO / Shelter tabs');

    // Test API rejection of public registration with role: "supplier"
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Obsolete Supplier Registration Attempt',
        email: `supplier_reject_${timestamp}@test.com`,
        password: 'Password123!',
        role: 'supplier',
        phone: '+91 98111 22334',
        organizationName: 'Obsolete Wholesale Supplier',
        organizationType: 'caterer',
        address: 'Phase 1, Industrial Area',
        city: 'New Delhi',
      });
      assert(false, 'Registration API should have rejected role: "supplier"');
    } catch (err: any) {
      assert(err.response?.status === 400, 'Registration API rejects role "supplier" with HTTP 400 Validation Error');
      assert(
        JSON.stringify(err.response?.data).includes('provider') && JSON.stringify(err.response?.data).includes('ngo'),
        'API error message specifies only provider or ngo are permitted'
      );
    }

    // =========================================================================
    // TEST 8: Verify existing accounts and authentication still work
    // =========================================================================
    console.log('\n--- TEST 8: Verify Existing Accounts & Role-Based Auth Still Work ---');

    // 8a: Verify existing default provider account works
    const defaultProviderLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'provider@foodbridge.org',
      password: 'password123',
    });
    assert(defaultProviderLogin.status === 200, 'Existing provider@foodbridge.org logs in successfully');
    assert(defaultProviderLogin.data.user.role === 'provider', 'Provider role is canonical "provider"');

    // 8b: Verify existing default NGO account works
    const defaultNgoLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'ngo@hopekitchen.org',
      password: 'password123',
    });
    assert(defaultNgoLogin.status === 200, 'Existing ngo@hopekitchen.org logs in successfully');
    assert(defaultNgoLogin.data.user.role === 'ngo', 'NGO role is canonical "ngo"');

    // 8c: Verify existing default Admin account works & remains protected
    const defaultAdminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@foodbridge.org',
      password: 'password123',
    });
    assert(defaultAdminLogin.status === 200, 'Existing admin@foodbridge.org logs in successfully');
    assert(defaultAdminLogin.data.user.role === 'admin', 'Admin role is canonical "admin"');

    // Admin can access protected admin metrics
    const adminMetrics = await axios.get(`${BASE_URL}/admin/analytics`, {
      headers: { Authorization: `Bearer ${defaultAdminLogin.data.token}` },
    });
    assert(adminMetrics.status === 200, 'Admin can access protected platform analytics');

    // Non-admin (Provider) cannot access admin endpoint
    try {
      await axios.get(`${BASE_URL}/admin/analytics`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      assert(false, 'Provider should NOT be allowed to access admin analytics');
    } catch (err: any) {
      assert(err.response?.status === 403, 'Provider blocked from admin analytics with HTTP 403 Forbidden');
    }

    console.log('\n================================================================================');
    console.log(`🎉 SIMPLIFIED REGISTRATION QA SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================================\n');

    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('Fatal test error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    await mongoose.disconnect();
    process.exit(1);
  }
};

runTests();
