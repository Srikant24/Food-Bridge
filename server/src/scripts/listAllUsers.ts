import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import mongoose from 'mongoose';

async function listUsers() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;
  const users = await db.collection('users').find({}).toArray();
  const orgs = await db.collection('organizations').find({}).toArray();
  const orgMap = new Map(orgs.map(o => [o._id.toString(), o]));

  console.log(`\n================ ALL USERS IN MONGODB (${users.length}) ================`);
  for (const u of users) {
    const org = u.organizationId ? orgMap.get(u.organizationId.toString()) : null;
    console.log(`ID: ${u._id} | Name: "${u.name}" | Email: "${u.email}" | Role: "${u.role}" | Org: "${org?.name}" (Status: ${org?.verificationStatus})`);
  }
  await mongoose.disconnect();
}

listUsers().catch(console.error);
