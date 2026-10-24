import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function audit() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to MongoDB:', mongoose.connection.name);

  const users = await mongoose.connection.collection('users').find({}).toArray();
  const orgs = await mongoose.connection.collection('organizations').find({}).toArray();
  const donations = await mongoose.connection.collection('donations').find({}).toArray();
  const requests = await mongoose.connection.collection('donationrequests').find({}).toArray();

  console.log(`\n=== TOTAL COUNTS ===`);
  console.log(`Users: ${users.length}`);
  console.log(`Organizations: ${orgs.length}`);
  console.log(`Donations: ${donations.length}`);
  console.log(`Donation Requests: ${requests.length}`);

  // Map donations count per user and per organization
  const donationsByUser = new Map<string, number>();
  const donationsByOrg = new Map<string, number>();
  for (const d of donations) {
    if (d.providerId) {
      const uId = d.providerId.toString();
      donationsByUser.set(uId, (donationsByUser.get(uId) || 0) + 1);
    }
    if (d.organizationId) {
      const oId = d.organizationId.toString();
      donationsByOrg.set(oId, (donationsByOrg.get(oId) || 0) + 1);
    }
  }

  // Map requests count per user and per organization
  const requestsByUser = new Map<string, number>();
  const requestsByOrg = new Map<string, number>();
  for (const r of requests) {
    if (r.ngoId) {
      const uId = r.ngoId.toString();
      requestsByUser.set(uId, (requestsByUser.get(uId) || 0) + 1);
    }
    if (r.ngoOrganizationId) {
      const oId = r.ngoOrganizationId.toString();
      requestsByOrg.set(oId, (requestsByOrg.get(oId) || 0) + 1);
    }
  }

  // Analyze emails for duplicates (normalized trim + lowercase)
  const emailMap = new Map<string, any[]>();
  for (const u of users) {
    const rawEmail = u.email || '';
    const normalized = rawEmail.trim().toLowerCase();
    if (!emailMap.has(normalized)) {
      emailMap.set(normalized, []);
    }
    emailMap.get(normalized)!.push(u);
  }

  console.log(`\n=== USERS AUDIT ===`);
  for (const u of users) {
    const uId = u._id.toString();
    const donationCount = donationsByUser.get(uId) || 0;
    const requestCount = requestsByUser.get(uId) || 0;
    const org = orgs.find(o => o._id.toString() === u.organizationId?.toString());

    console.log({
      id: uId,
      name: u.name,
      email: u.email,
      role: u.role,
      isDemo: u.isDemo,
      orgName: org?.name || 'NO ORG',
      orgType: org?.type,
      orgStatus: org?.verificationStatus,
      donationsLinked: donationCount,
      requestsLinked: requestCount,
      createdAt: u.createdAt
    });
  }

  console.log(`\n=== DUPLICATE EMAIL CHECK ===`);
  let duplicateCount = 0;
  for (const [email, userList] of emailMap.entries()) {
    if (userList.length > 1) {
      duplicateCount++;
      console.log(`⚠️ DUPLICATE EMAIL FOUND: "${email}" (${userList.length} accounts):`);
      for (const u of userList) {
        const uId = u._id.toString();
        console.log(`   - ID: ${uId}, Name: ${u.name}, Role: ${u.role}, isDemo: ${u.isDemo}, OrgId: ${u.organizationId}, Donations: ${donationsByUser.get(uId) || 0}, Requests: ${requestsByUser.get(uId) || 0}`);
      }
    }
  }
  if (duplicateCount === 0) {
    console.log('No duplicate emails found in users collection.');
  }

  // Check unique index on users collection
  const userIndexes = await mongoose.connection.collection('users').indexes();
  console.log(`\n=== USERS COLLECTION INDEXES ===`);
  console.log(userIndexes.map(idx => ({ name: idx.name, key: idx.key, unique: idx.unique })));

  await mongoose.disconnect();
}

audit().catch(console.error);
