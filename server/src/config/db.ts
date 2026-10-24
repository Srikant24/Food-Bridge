import mongoose from 'mongoose';

let mongoMemoryServerInstance: any = null;

export const connectDatabase = async (): Promise<string> => {
  let uri = process.env.MONGODB_URI;

  if (uri && uri.trim() !== '') {
    // Strip template angle brackets (e.g., <username>:<password>) if accidentally retained
    uri = uri.replace(/<([^>]+)>/g, '$1').trim();
    try {
      console.log(`Connecting to MongoDB at configured URI...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
      });
      console.log(`✓ Successfully connected to MongoDB Database: ${mongoose.connection.name || 'foodbridge'} (${mongoose.connection.host})`);
      return uri;
    } catch (error: any) {
      console.warn(`⚠️ Could not connect to configured MONGODB_URI (${error.message}). Falling back to in-memory database for seamless local demo.`);
    }
  }

  // Fallback to in-memory MongoDB for instant zero-config hackathon demo
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongoMemoryServerInstance = await MongoMemoryServer.create();
    const memoryUri = mongoMemoryServerInstance.getUri();
    await mongoose.connect(memoryUri);
    console.log(`✓ Connected to Local In-Memory MongoDB (${memoryUri})`);
    return memoryUri;
  } catch (memErr) {
    console.error('❌ Failed to initialize database connection:', memErr);
    throw memErr;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  if (mongoMemoryServerInstance) {
    await mongoMemoryServerInstance.stop();
  }
};
