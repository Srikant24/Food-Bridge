import { Router } from 'express';
import { getNgos, getNgoById, updateNgoCapacity } from '../controllers/ngoController';
import { authenticateJwt, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getNgos);
router.get('/:id', getNgoById);
router.put('/capacity', authenticateJwt, requireRole(['ngo']), updateNgoCapacity);

export default router;
