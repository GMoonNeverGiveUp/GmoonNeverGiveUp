import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';

/**
 * GET /api/users/:id
 */
export async function getUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: { badges: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
}
