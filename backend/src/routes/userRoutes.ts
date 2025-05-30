import { Router } from 'express';
import { loginWithWallet } from '../controllers/authController';

const router = Router();
router.post('/wallet', loginWithWallet);

export default router;