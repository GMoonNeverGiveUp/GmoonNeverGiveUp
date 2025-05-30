import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';

/**

Middleware to require a valid JWT in the Authorization header
*/
export function requireAuth(
req: Request,
res: Response,
next: NextFunction
): void {
const authHeader = req.headers.authorization;
if (!authHeader?.startsWith('Bearer ')) {
res.status(401).json({ error: 'Unauthorized' });
return;
}

const token = authHeader.slice(7);
try {
const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
(req as any).userId = payload.userId;
next();
} catch {
res.status(401).json({ error: 'Invalid token' });
}
}