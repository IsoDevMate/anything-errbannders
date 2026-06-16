import { Router, Request, Response } from 'express';
import { auth } from '../auth';

const router = Router();

// GET /api/session — returns the current user from Bearer token or cookie
router.get('/', async (req: Request, res: Response) => {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });

  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.json({ user: session.user, session: session.session });
});

export default router;
