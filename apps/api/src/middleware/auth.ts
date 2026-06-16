import { auth } from '../auth';
import { Request, Response, NextFunction } from 'express';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: new Headers(req.headers as Record<string, string>) });
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  (req as any).session = session;
  next();
}
