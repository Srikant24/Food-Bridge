import axios from 'axios';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5000/api';

async function testFlow() {
  console.log('1. Attempting login as Sankalp (sankalpmanchanda_cse24@its.edu.in)...');
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'sankalpmanchanda_cse24@its.edu.in',
      password: '123456',
      portal: 'ngo',
    });
    console.log('Login response status:', loginRes.status);
    console.log('User from login response:', loginRes.data.user);
    const token = loginRes.data.token;
    console.log('Token received:', token ? 'YES' : 'NO');

    const decoded = jwt.decode(token);
    console.log('Decoded JWT payload:', decoded);

    console.log('\n2. Testing GET /auth/me...');
    const meRes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('GET /auth/me status:', meRes.status);
    console.log('User role from /auth/me:', meRes.data.user.role);

    console.log('\n3. Testing GET /donations...');
    const donRes = await axios.get(`${BASE_URL}/donations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Found ${donRes.data.donations?.length} donations.`);
    const available = donRes.data.donations.filter((d: any) => d.status === 'available');
    console.log(`Available donations: ${available.length}`);

    if (available.length > 0) {
      const targetDonation = available[0];
      console.log(`\n4. Testing collection request for donation "${targetDonation.title}" (ID: ${targetDonation._id})...`);
      console.log(`Donation deadline: ${targetDonation.collectionDeadline}`);
      
      // Compute a valid pickup time: 30 minutes from now, but before deadline
      const deadline = new Date(targetDonation.collectionDeadline).getTime();
      const now = Date.now();
      let pickupTime: string;
      if (deadline > now + 15 * 60 * 1000) {
        pickupTime = new Date(now + 10 * 60 * 1000).toISOString();
      } else {
        pickupTime = new Date(now + 2 * 60 * 1000).toISOString();
      }

      try {
        const reqRes = await axios.post(
          `${BASE_URL}/donations/${targetDonation._id}/request`,
          {
            requestNotes: 'Sankalp NGO urgent collection request test',
            estimatedPickupTime: pickupTime,
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        console.log('Request collection status:', reqRes.status);
        console.log('Request collection response:', reqRes.data);
      } catch (reqErr: any) {
        console.error('Request collection FAILED:', reqErr.response?.status, reqErr.response?.data);
      }
    }
  } catch (err: any) {
    console.error('Login or flow failed:', err.response?.status, err.response?.data || err.message);
  }
}

testFlow().catch(console.error);
