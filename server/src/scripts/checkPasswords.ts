import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;
  const users = await db.collection('users').find({
    $or: [{ name: /sankalp/i }, { email: /sankalp/i }]
  }).toArray();
  
  const passwordsToTest = [
    'password', 
    'password123', 
    'Password123!', 
    '123456', 
    '12345678',
    'sankalp', 
    'sankalp123', 
    'admin123', 
    'provider123', 
    'demo1234', 
    'FoodBridge2025!', 
    'Sankalp@123',
    'srikant',
    'srikant123'
  ];
  
  for (const u of users) {
    console.log('User:', u.name, u.email, 'Role:', u.role);
    let found = false;
    for (const p of passwordsToTest) {
      if (await bcrypt.compare(p, u.passwordHash)) {
        console.log(`  -> MATCH FOUND for ${u.email}: password is "${p}"`);
        found = true;
        break;
      }
    }
    if (!found) {
      console.log(`  -> No match in common test list for ${u.email}`);
    }
  }
  await mongoose.disconnect();
}
run().catch(console.error);
