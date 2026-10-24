import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function listAll() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const users = await mongoose.connection.collection('users').find({}).toArray();
  const orgs = await mongoose.connection.collection('organizations').find({}).toArray();
  const donations = await mongoose.connection.collection('donations').find({}).toArray();
  const requests = await mongoose.connection.collection('donationrequests').find({}).toArray();

  console.log(`Total users in DB: ${users.length}`);

  const userSummary = users.map(u => {
    const org = orgs.find(o => o._id.toString() === u.organizationId?.toString());
    const dCount = donations.filter(d => d.providerId?.toString() === u._id.toString()).length;
    const rCount = requests.filter(r => r.ngoId?.toString() === u._id.toString()).length;
    return {
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      isDemo: Boolean(u.isDemo),
      orgName: org?.name || 'None',
      donations: dCount,
      requests: rCount
    };
  });

  console.log(JSON.stringify(userSummary, null, 2));
  await mongoose.disconnect();
}

listAll();
