import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { verifyMessage } from 'ethers';

/**
 * POST /api/auth/wallet
 */
export async function loginWithWallet(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { address, signature } = req.body as {
      address: string;
      signature: string;
    };

    const userRecord = await prisma.user.findUnique({
      where: { address },
    });
    const nonce = userRecord?.id ?? '';

    // Ethers v6: verifyMessage is a named export
    const signer = verifyMessage(nonce, signature);
    if (signer.toLowerCase() !== address.toLowerCase()) {
      res.status(400).json({ error: 'Signature verification failed' });
      return;
    }

    const user = await prisma.user.upsert({
      where: { address },
      create: { address },
      update: {},
    });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: '7d',
    });
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
}
