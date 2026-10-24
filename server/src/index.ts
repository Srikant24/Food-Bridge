import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectDatabase } from './config/db';
import authRoutes from './routes/authRoutes';
import donationRoutes from './routes/donationRoutes';
import ngoRoutes from './routes/ngoRoutes';
import adminRoutes from './routes/adminRoutes';
import demoRoutes from './routes/demoRoutes';
import aiRoutes from './routes/aiRoutes';
import notificationRoutes from './routes/notificationRoutes';
import { seedDatabase } from './services/seedService';
import { User } from './models/User';
import { NotificationService } from './services/notificationService';
import { ensureAdminProvisioned } from './scripts/provisionAdmin';

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', adminRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);

// Health Check API
app.get('/api/health', (req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbStateMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    status: 'online',
    app: 'FoodBridge API',
    tagline: 'Rescue Food. Restore Hope.',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStateMap[dbState] || 'unknown',
      connected: dbState === 1,
      host: mongoose.connection.host || 'local/in-memory',
    },
    services: {
      aiAssistant: process.env.GEMINI_API_KEY ? 'gemini-active' : 'rule-based-fallback',
      maps: 'openstreetmap-ready',
      matchingEngine: '5-factor-weighted-active',
      auth: 'jwt-bcrypt-active',
    }
  });
});

// Root welcome route
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to FoodBridge REST API. Server is running smoothly.',
    documentation: '/api/health',
    endpoints: [
      '/api/auth/login',
      '/api/auth/register',
      '/api/donations',
      '/api/ngos',
      '/api/admin/analytics',
      '/api/demo/seed',
    ]
  });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
  });
});

// Server Initialization
const startServer = async () => {
  try {
    await connectDatabase();

    // Ensure authoritative administrator account exists from secure environment configuration
    await ensureAdminProvisioned();

    app.listen(PORT, () => {
      console.log(`\n==================================================`);
      console.log(`🚀 FoodBridge Backend Server running on port ${PORT}`);
      console.log(`📡 Health Check URL: http://localhost:${PORT}/api/health`);
      console.log(`==================================================\n`);

      // Start proactive expiry & food safety monitoring
      NotificationService.startExpiryScheduler();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
