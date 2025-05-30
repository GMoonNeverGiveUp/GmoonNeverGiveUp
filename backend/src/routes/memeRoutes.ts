import { Router } from 'express';
import {
  createMeme,
  voteMeme,
  impulseMeme,
  getFeed,
} from '../controllers/memeController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public feed
router.get('/', getFeed);

// Protected actions
router.post('/', requireAuth, createMeme);
router.post('/:memeId/vote', requireAuth, voteMeme);
router.post('/:memeId/impulse', requireAuth, impulseMeme);

export default router;
