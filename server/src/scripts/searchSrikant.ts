import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const users = await mongoose.connection.collection('users').find({}).toArray();
  const srikants = users.filter(u => 
    (u.name && u.name.toLowerCase().includes('srikant')) ||
    (u.email && u.email.toLowerCase().includes('srikant'))
  );
  console.log('Found Srikant users:', JSON.stringify(srikants, null, 2));

  // Also print all users with role other than 'provider' or 'ngo' or 'admin' or with uppercase roles
  const anomalousUsers = users.filter(u => 
    !['provider', 'ngo', 'admin'].includes(u.role) ||
    u.role !== u.role.toLowerCase()
  );
  console.log('Anomalous role users:', JSON.stringify(anomalousUsers.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role })), null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
