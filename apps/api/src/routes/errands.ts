import { Router, Request, Response } from 'express';
import sql from '../db';

const router = Router();

// In-memory fallback if Turso DDL/DML for locations fails
const locationStore = new Map<string, { latitude: number; longitude: number; updated_at: string }>();


// GET /api/errands — list all errands
router.get('/', async (_req: Request, res: Response) => {
  try {
    const errands = await sql`
      SELECT e.*,
             s.name AS sender_name,
             a.name AS agent_name
      FROM errands e
      LEFT JOIN "user" s ON e.sender_id = s.id
      LEFT JOIN "user" a ON e.agent_id  = a.id
      ORDER BY e.created_at DESC
    `;
    res.json(errands);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch errands', detail: String(err?.message ?? err) });
  }
});

// POST /api/errands — create an errand (escrows budget+fee from sender wallet)
router.post('/', async (req: Request, res: Response) => {
  const { title, description, budget, fee, sender_id, pickup_location, delivery_location, category } = req.body;

  if (!title || !budget || !fee || !sender_id) {
    res.status(400).json({ error: 'title, budget, fee and sender_id are required' });
    return;
  }

  const total = parseFloat(budget) + parseFloat(fee);

  try {
    const wallet = await sql`SELECT balance FROM wallets WHERE user_id = ${sender_id}`;
    if (!wallet.length || parseFloat(wallet[0].balance) < total) {
      res.status(400).json({ error: 'Insufficient wallet balance' });
      return;
    }

    const [errand] = await sql`
      INSERT INTO errands (title, description, budget, fee, sender_id, pickup_location, delivery_location, category, status)
      VALUES (${title}, ${description ?? null}, ${budget}, ${fee}, ${sender_id},
              ${pickup_location ?? null}, ${delivery_location ?? null}, ${category ?? 'Shopping'}, 'pending')
      RETURNING *
    `;

    await sql`UPDATE wallets SET balance = balance - ${total} WHERE user_id = ${sender_id}`;

    await sql`
      INSERT INTO transactions (wallet_id, amount, type, errand_id)
      VALUES (${sender_id}, ${-total}, 'escrow_hold', ${errand.id})
    `;

    res.status(201).json(errand);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create errand' });
  }
});

// POST /api/errands/update — agent accepts / uploads proof / sender confirms or disputes
router.post('/update', async (req: Request, res: Response) => {
  const { errandId, status, agentId, proofImageUrl } = req.body;

  if (!errandId || !status) {
    res.status(400).json({ error: 'errandId and status are required' });
    return;
  }

  try {
    const [errand] = await sql`
      UPDATE errands
      SET status          = ${status},
          agent_id        = COALESCE(agent_id, ${agentId ?? null}),
          proof_image_url = COALESCE(proof_image_url, ${proofImageUrl ?? null})
      WHERE id = ${errandId}
      RETURNING *
    `;

    if (!errand) {
      res.status(404).json({ error: 'Errand not found' });
      return;
    }

    // Release agent fee on sender confirmation
    if (status === 'confirmed' && errand.agent_id) {
      await sql`UPDATE wallets SET balance = balance + ${errand.fee} WHERE user_id = ${errand.agent_id}`;
      await sql`
        INSERT INTO transactions (wallet_id, amount, type, errand_id)
        VALUES (${errand.agent_id}, ${errand.fee}, 'payment_release', ${errand.id})
      `;
    }

    // Refund sender on dispute (platform holds for review — simplified: full refund here)
    if (status === 'disputed' && errand.sender_id) {
      const refund = parseFloat(errand.budget) + parseFloat(errand.fee);
      await sql`UPDATE wallets SET balance = balance + ${refund} WHERE user_id = ${errand.sender_id}`;
      await sql`
        INSERT INTO transactions (wallet_id, amount, type, errand_id)
        VALUES (${errand.sender_id}, ${refund}, 'dispute_refund', ${errand.id})
      `;
    }

    res.json(errand);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update errand' });
  }
});


// POST /api/errands/:id/location — agent pushes live GPS coords
router.post('/:id/location', async (req: Request, res: Response) => {
  const { latitude, longitude, agentId } = req.body;
  const errandId = req.params.id;
  const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
  const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: 'latitude and longitude (numbers) are required' });
    return;
  }

  try {
    const [errand] = await sql`SELECT id, agent_id, status FROM errands WHERE id = ${errandId}`;
    if (!errand) {
      // Still allow storing location in memory for demo/tracking if row missing briefly
      const updated_at = new Date().toISOString();
      locationStore.set(errandId, { latitude: lat, longitude: lng, updated_at });
      res.status(404).json({ error: 'Errand not found' });
      return;
    }
    if (errand.agent_id && agentId && errand.agent_id !== agentId) {
      res.status(403).json({ error: 'Only the assigned agent can update location' });
      return;
    }

    const updated_at = new Date().toISOString();
    locationStore.set(errandId, { latitude: lat, longitude: lng, updated_at });

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS errand_locations (
          errand_id  TEXT PRIMARY KEY,
          latitude   REAL NOT NULL,
          longitude  REAL NOT NULL,
          updated_at TEXT NOT NULL
        )
      `;
      await sql`DELETE FROM errand_locations WHERE errand_id = ${errandId}`;
      await sql`
        INSERT INTO errand_locations (errand_id, latitude, longitude, updated_at)
        VALUES (${errandId}, ${lat}, ${lng}, ${updated_at})
      `;
    } catch (dbErr) {
      console.warn('Persisting location to DB failed, using memory:', dbErr);
    }

    res.json({ ok: true, latitude: lat, longitude: lng, updated_at });
  } catch (err: any) {
    // If DB is down entirely, still keep memory location for this process
    const updated_at = new Date().toISOString();
    locationStore.set(errandId, { latitude: lat, longitude: lng, updated_at });
    console.error('location update error:', err);
    res.json({ ok: true, latitude: lat, longitude: lng, updated_at, ephemeral: true });
  }
});
    return;
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS errand_locations (
        errand_id  TEXT PRIMARY KEY,
        latitude   REAL NOT NULL,
        longitude  REAL NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `;

    const [errand] = await sql`SELECT id, agent_id, status FROM errands WHERE id = ${errandId}`;
    if (!errand) {
      res.status(404).json({ error: 'Errand not found' });
      return;
    }
    if (errand.agent_id && agentId && errand.agent_id !== agentId) {
      res.status(403).json({ error: 'Only the assigned agent can update location' });
      return;
    }

    const updatedAt = new Date().toISOString();
    await sql`DELETE FROM errand_locations WHERE errand_id = ${errandId}`;
    await sql`
      INSERT INTO errand_locations (errand_id, latitude, longitude, updated_at)
      VALUES (${errandId}, ${lat}, ${lng}, ${updatedAt})
    `;

    res.json({ ok: true, latitude: lat, longitude: lng });
  } catch (err: any) {
    console.error('location update error:', err);
    res.status(500).json({ error: 'Failed to update location', detail: String(err?.message ?? err) });
  }
});

// GET /api/errands/:id/location — poll agent GPS for live map
router.get('/:id/location', async (req: Request, res: Response) => {
  const errandId = req.params.id;
  try {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS errand_locations (
          errand_id  TEXT PRIMARY KEY,
          latitude   REAL NOT NULL,
          longitude  REAL NOT NULL,
          updated_at TEXT NOT NULL
        )
      `;
      const [loc] = await sql`
        SELECT latitude, longitude, updated_at
        FROM errand_locations
        WHERE errand_id = ${errandId}
      `;
      if (loc) {
        res.json({
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude),
          updated_at: loc.updated_at,
        });
        return;
      }
    } catch (dbErr) {
      console.warn('DB location read failed, falling back to memory:', dbErr);
    }

    const mem = locationStore.get(errandId);
    if (mem) {
      res.json(mem);
      return;
    }
    res.json({ latitude: null, longitude: null, updated_at: null });
  } catch (err: any) {
    console.error(err);
    const mem = locationStore.get(errandId);
    if (mem) {
      res.json(mem);
      return;
    }
    res.status(500).json({ error: 'Failed to fetch location', detail: String(err?.message ?? err) });
  }
});
      return;
    }
    res.json({
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
      updated_at: loc.updated_at,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch location', detail: String(err?.message ?? err) });
  }
});


// GET /api/errands/:id — fetch a single errand
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const [errand] = await sql`
      SELECT e.*,
             s.name AS sender_name,
             a.name AS agent_name
      FROM errands e
      LEFT JOIN "user" s ON e.sender_id = s.id
      LEFT JOIN "user" a ON e.agent_id  = a.id
      WHERE e.id = ${req.params.id}
    `;
    if (!errand) {
      res.status(404).json({ error: 'Errand not found' });
      return;
    }
    res.json(errand);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch errand' });
  }
});

export default router;
