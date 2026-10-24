import { Router } from 'express';
import {
  getPendingVerifications,
  verifyNgo,
  getPlatformAnalytics,
  getAdminUsers,
  getAdminAllDonations,
  getAdminAllRequests,
  getAdminProviders,
  verifyProvider,
} from '../controllers/adminController';
import { authenticateJwt, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJwt, requireRole(['admin']));

router.get('/pending-verifications', getPendingVerifications);
router.post('/verify-ngo/:id', verifyNgo);
router.get('/providers', getAdminProviders);
router.post('/verify-provider/:id', verifyProvider);
router.get('/analytics', getPlatformAnalytics);
router.get('/users', getAdminUsers);
router.get('/donations', getAdminAllDonations);
router.get('/requests', getAdminAllRequests);
router.get('/', getPlatformAnalytics);

export default router;
