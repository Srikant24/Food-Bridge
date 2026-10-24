import { Router, Request, Response } from 'express';
import { seedDatabase } from '../services/seedService';
import { Donation } from '../models/Donation';

const router = Router();

router.post('/seed', async (req: Request, res: Response) => {
  try {
    const result = await seedDatabase();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Seed Error', message: error.message });
  }
});

// Demo/QA route to simulate OTP expiration for test suites
router.post('/simulate-otp-expiry/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const donation = await Donation.findByIdAndUpdate(
      id,
      { $set: { pickupOtpExpiresAt: new Date(Date.now() - 3600000) } },
      { new: true }
    );
    res.json({ message: 'OTP expiry simulated', donation });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
