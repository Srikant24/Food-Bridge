import { Router } from 'express';
import {
  createDonation,
  getDonations,
  getDonationById,
  getMatchingNgos,
  requestDonation,
  respondToRequest,
  updateDonationStatus,
  getPickupOtp,
  regeneratePickupOtp,
  verifyPickupOtp,
  getProviderIncomingRequests,
  getNgoMyRequests,
} from '../controllers/donationController';
import { authenticateJwt, authenticateOptionalJwt, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Specialized Collection Request Sub-routes (must precede /:id)
router.get('/requests/incoming', authenticateJwt, requireRole(['provider', 'admin']), getProviderIncomingRequests);
router.get('/requests/my-requests', authenticateJwt, requireRole(['ngo', 'admin']), getNgoMyRequests);

// Public / Authenticated listings browsing (with optional JWT so providers see their own pickup OTPs)
router.get('/', authenticateOptionalJwt, getDonations);
router.get('/:id', authenticateOptionalJwt, getDonationById);
router.get('/:id/match', authenticateJwt, getMatchingNgos);

// Protected actions
router.post('/', authenticateJwt, requireRole(['provider', 'admin']), createDonation);
router.post('/:id/request', authenticateJwt, requireRole(['ngo', 'admin']), requestDonation);
router.post('/:id/respond-request', authenticateJwt, requireRole(['provider', 'admin']), respondToRequest);
router.post('/:id/respond', authenticateJwt, requireRole(['provider', 'admin']), respondToRequest);
router.post('/:id/status', authenticateJwt, updateDonationStatus);
router.put('/:id/status', authenticateJwt, updateDonationStatus);

// Pickup OTP specific workflows
router.get('/:id/pickup-otp', authenticateJwt, requireRole(['provider', 'admin']), getPickupOtp);
router.post('/:id/regenerate-otp', authenticateJwt, requireRole(['provider', 'admin']), regeneratePickupOtp);
router.post('/:id/verify-pickup', authenticateJwt, requireRole(['ngo', 'admin', 'provider']), verifyPickupOtp);

export default router;
