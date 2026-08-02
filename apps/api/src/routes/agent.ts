import { Router, Request, Response } from 'express';
import sql from '../db';

const router = Router();

// POST /api/agent/apply — submit agent application
router.post('/apply', async (req: Request, res: Response) => {
  const { userId, idImageUrl, selfieImageUrl, mpesaNumber } = req.body;

  if (!userId || !idImageUrl || !selfieImageUrl || !mpesaNumber) {
    res.status(400).json({ error: 'userId, idImageUrl, selfieImageUrl and mpesaNumber are required' });
    return;
  }

  if (!/^0[17]\d{8}$/.test(mpesaNumber)) {
    res.status(400).json({ error: 'Invalid M-Pesa number' });
    return;
  }

  try {
    await sql`
      INSERT INTO agent_applications (user_id, id_image_url, selfie_image_url, mpesa_number, status)
      VALUES (${userId}, ${idImageUrl}, ${selfieImageUrl}, ${mpesaNumber}, 'pending')
      ON CONFLICT (user_id) DO UPDATE
        SET id_image_url     = ${idImageUrl},
            selfie_image_url = ${selfieImageUrl},
            mpesa_number     = ${mpesaNumber},
            status           = 'pending',
            updated_at       = datetime('now')
    `;
    const [application] = await sql`SELECT * FROM agent_applications WHERE user_id = ${userId}`;
    res.status(201).json(application);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// GET /api/agent/status?userId=xxx — check application status
router.get('/status', async (req: Request, res: Response) => {
  const { userId } = req.query as { userId: string };
  if (!userId) { res.status(400).json({ error: 'userId required' }); return; }

  try {
    const [app] = await sql`SELECT status FROM agent_applications WHERE user_id = ${userId}`;
    res.json({ status: app?.status ?? 'none' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// POST /api/agent/approve — internal: approve or reject an application
router.post('/approve', async (req: Request, res: Response) => {
  const { userId, approved } = req.body;
  if (!userId) { res.status(400).json({ error: 'userId required' }); return; }

  const newStatus = approved ? 'approved' : 'rejected';

  try {
    await sql`
      UPDATE agent_applications SET status = ${newStatus}, updated_at = datetime('now')
      WHERE user_id = ${userId}
    `;
    if (approved) {
      // Mark the user as a verified agent in the user table
      await sql`UPDATE "user" SET is_agent = 1 WHERE id = ${userId}`;
    }
    res.json({ ok: true, status: newStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update application' });
  }
});


// GET /api/agent/pending — list pending applications (admin)
router.get('/pending', async (_req: Request, res: Response) => {
  try {
    const rows = await sql`
      SELECT a.*, u.name AS user_name, u.email AS user_email
      FROM agent_applications a
      LEFT JOIN "user" u ON a.user_id = u.id
      WHERE a.status = 'pending'
      ORDER BY a.created_at ASC
    `;
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch pending applications' });
  }
});

export default router;
