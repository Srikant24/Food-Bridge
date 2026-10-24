import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateJwt } from '../middleware/authMiddleware';
import { Notification } from '../models/Notification';

const router = Router();

router.use(authenticateJwt);

// Get current user's notifications
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .exec();

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });

    res.json({
      unreadCount,
      notifications,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// Mark single notification as read
router.put('/:id/read', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await Notification.findOneAndUpdate(
      { _id: id, userId: req.user?._id },
      { $set: { isRead: true } }
    );
    res.json({ message: 'Marked as read' });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// Mark all as read
router.put('/read-all', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await Notification.updateMany(
      { userId: req.user?._id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// Inspection endpoint for multi-channel email/SMS delivery logs (QA and Admin audit)
router.get('/delivery-logs', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { channel, recipient, status } = req.query;
    const { NotificationService } = await import('../services/notificationService');
    const logs = NotificationService.getDeliveryLogs({
      channel: channel as any,
      recipient: recipient as any,
      status: status as any,
    });

    res.json({
      count: logs.length,
      logs,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// QA / Testing endpoint for validating sandbox failures, retries, and invalid recipient handling
router.post('/test-sandbox', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { 
      title = 'QA Test Notification', 
      message = 'This is an automated test message', 
      emailRecipient, 
      phoneRecipient, 
      channels = ['email', 'sms'], 
      simulateGatewayFailure = false, 
      forceRetry = false,
      dedupKey 
    } = req.body;

    const { NotificationService } = await import('../services/notificationService');
    const result = await NotificationService.dispatchNotification({
      userId: (req.user._id as any).toString(),
      title,
      message,
      type: 'system',
      channels,
      emailRecipient,
      phoneRecipient,
      dedupKey,
      simulateGatewayFailure,
      forceRetry,
    });

    res.json({
      message: 'Sandbox notification test completed',
      result,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// User Notification Preferences
router.get('/preferences', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { NotificationPreference } = await import('../models/NotificationPreference');
    let pref = await NotificationPreference.findOne({ userId: req.user._id }).exec();
    if (!pref) {
      pref = await NotificationPreference.create({ userId: req.user._id });
    }

    res.json({ preferences: pref });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

router.put('/preferences', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { emailEnabled, smsEnabled, inAppEnabled, marketingOptIn } = req.body;
    const { NotificationPreference } = await import('../models/NotificationPreference');

    const updated = await NotificationPreference.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          ...(emailEnabled !== undefined && { emailEnabled }),
          ...(smsEnabled !== undefined && { smsEnabled }),
          ...(inAppEnabled !== undefined && { inAppEnabled }),
          ...(marketingOptIn !== undefined && { marketingOptIn }),
        },
      },
      { new: true, upsert: true }
    );

    res.json({ message: 'Notification preferences updated', preferences: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// Manual trigger for expiry monitoring & food safety checks (Admin & QA automation)
router.post('/run-expiry-check', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { NotificationService } = await import('../services/notificationService');
    const summary = await NotificationService.runExpiryMonitoring();
    res.json({
      message: 'Expiry check completed successfully',
      summary,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

export default router;

