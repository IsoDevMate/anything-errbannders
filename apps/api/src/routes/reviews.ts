import { Router, Request, Response } from 'express';
import sql from '../db';

const router = Router();

// GET /api/reviews?userId= — reviews received by this user
router.get('/', async (req: Request, res: Response) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    const reviews = await sql`
      SELECT r.*, u.name AS from_name
      FROM reviews r
      LEFT JOIN "user" u ON r.from_user_id = u.id
      WHERE r.to_user_id = ${userId}
      ORDER BY r.created_at DESC
      LIMIT 50
    `;
    const avgRow = await sql`
      SELECT AVG(rating) AS average, COUNT(*) AS count
      FROM reviews
      WHERE to_user_id = ${userId}
    `;
    res.json({
      average: avgRow[0]?.average != null ? Number(avgRow[0].average) : 0,
      count: Number(avgRow[0]?.count ?? 0),
      reviews,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reviews', detail: String(err?.message ?? err) });
  }
});

// POST /api/reviews — leave a rating after an errand
router.post('/', async (req: Request, res: Response) => {
  const { errandId, fromUserId, toUserId, rating, comment } = req.body;
  const parsed = Number(rating);

  if (!fromUserId || !toUserId || !Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
    res.status(400).json({ error: 'fromUserId, toUserId and rating 1-5 are required' });
    return;
  }

  try {
    const [row] = await sql`
      INSERT INTO reviews (errand_id, from_user_id, to_user_id, rating, comment)
      VALUES (${errandId ?? null}, ${fromUserId}, ${toUserId}, ${parsed}, ${comment ?? null})
      RETURNING *
    `;
    res.status(201).json(row);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create review', detail: String(err?.message ?? err) });
  }
});

export default router;
