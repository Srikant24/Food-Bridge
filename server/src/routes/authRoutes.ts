import { Router } from 'express';
import { register, login, demoLogin, getMe } from '../controllers/authController';
import { authenticateJwt } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/demo-login', demoLogin);
router.get('/me', authenticateJwt, getMe);

export default router;
