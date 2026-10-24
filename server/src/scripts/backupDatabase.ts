import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

export async function backupDatabase(): Promise<string> {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', '..', 'backups', `backup_${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const collections = ['users', 'organizations', 'donations', 'donationrequests'];
  const summary: Record<string, number> = {};

  for (const colName of collections) {
    const docs = await mongoose.connection.collection(colName).find({}).toArray();
    fs.writeFileSync(path.join(backupDir, `${colName}.json`), JSON.stringify(docs, null, 2), 'utf8');
    summary[colName] = docs.length;
  }

  console.log(`[BACKUP SUCCESS] Saved to ${backupDir}`);
  console.log('Collection counts backed up:', summary);
  await mongoose.disconnect();
  return backupDir;
}

if (require.main === module) {
  backupDatabase()
    .then(dir => console.log('Backup completed at:', dir))
    .catch(err => {
      console.error('Backup error:', err);
      process.exit(1);
    });
}
