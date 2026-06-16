import { Router, Request, Response } from 'express';
import sql from '../db';
import { stkPush } from '../mpesa';

const router = Router();

// GET /api/wallet?userId=xxx
router.get('/', async (req: Request, res: Response) => {
  const { userId } = req.query;
  if (!userId) {
    res.status(400).json({ error: 'userId query param is required' });
    return;
  }

  try {
    const [wallet] = await sql`SELECT * FROM wallets WHERE user_id = ${userId as string}`;
    const transactions = await sql`
      SELECT * FROM transactions
      WHERE wallet_id = ${userId as string}
      ORDER BY created_at DESC
      LIMIT 50
    `;
    res.json({ wallet: wallet ?? null, transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

// POST /api/wallet/topup — initiate M-Pesa STK push
router.post('/topup', async (req: Request, res: Response) => {
  const { userId, phone, amount } = req.body;

  if (!userId || !phone || !amount) {
    res.status(400).json({ error: 'userId, phone and amount are required' });
    return;
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount < 1) {
    res.status(400).json({ error: 'amount must be at least 1' });
    return;
  }

  try {
    const checkoutRequestId = await stkPush(phone, parsedAmount, `WALLET-${userId.slice(0, 8)}`);

    // Store pending transaction so callback can settle it
    await sql`
      INSERT INTO mpesa_requests (checkout_request_id, user_id, amount)
      VALUES (${checkoutRequestId}, ${userId}, ${parsedAmount})
    `;

    res.json({ checkoutRequestId });
  } catch (err: any) {
    console.error(err);
    res.status(502).json({ error: err.message ?? 'Failed to initiate M-Pesa payment' });
  }
});

// POST /api/wallet/mpesa-callback — Safaricom calls this after the user pays
router.post('/mpesa-callback', async (req: Request, res: Response) => {
  try {
    const body = req.body?.Body?.stkCallback;
    if (!body) { res.json({ ResultCode: 0 }); return; }

    const { CheckoutRequestID, ResultCode } = body;

    if (ResultCode !== 0) {
      // Payment cancelled or failed — just clean up
      await sql`DELETE FROM mpesa_requests WHERE checkout_request_id = ${CheckoutRequestID}`;
      res.json({ ResultCode: 0 });
      return;
    }

    const [pending] = await sql`
      SELECT * FROM mpesa_requests WHERE checkout_request_id = ${CheckoutRequestID}
    `;
    if (!pending) { res.json({ ResultCode: 0 }); return; }

    // Credit wallet
    await sql`
      INSERT INTO wallets (user_id, balance)
      VALUES (${pending.user_id}, ${pending.amount})
      ON CONFLICT (user_id)
      DO UPDATE SET balance = wallets.balance + ${pending.amount}
    `;
    await sql`
      INSERT INTO transactions (wallet_id, amount, type)
      VALUES (${pending.user_id}, ${pending.amount}, 'deposit')
    `;
    await sql`DELETE FROM mpesa_requests WHERE checkout_request_id = ${CheckoutRequestID}`;

    res.json({ ResultCode: 0 });
  } catch (err) {
    console.error(err);
    res.json({ ResultCode: 0 }); // Always 200 to Safaricom
  }
});

// POST /api/wallet — legacy deposit/withdraw (keep for internal use)
router.post('/', async (req: Request, res: Response) => {
  const { userId, amount, type } = req.body;

  if (!userId || !amount || !type) {
    res.status(400).json({ error: 'userId, amount and type are required' });
    return;
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    res.status(400).json({ error: 'amount must be a positive number' });
    return;
  }

  try {
    if (type === 'deposit') {
      await sql`
        INSERT INTO wallets (user_id, balance)
        VALUES (${userId}, ${parsedAmount})
        ON CONFLICT (user_id)
        DO UPDATE SET balance = wallets.balance + ${parsedAmount}
      `;
      await sql`INSERT INTO transactions (wallet_id, amount, type) VALUES (${userId}, ${parsedAmount}, 'deposit')`;
    } else if (type === 'withdrawal') {
      const [wallet] = await sql`SELECT balance FROM wallets WHERE user_id = ${userId}`;
      if (!wallet || parseFloat(wallet.balance) < parsedAmount) {
        res.status(400).json({ error: 'Insufficient balance' });
        return;
      }
      await sql`UPDATE wallets SET balance = balance - ${parsedAmount} WHERE user_id = ${userId}`;
      await sql`INSERT INTO transactions (wallet_id, amount, type) VALUES (${userId}, ${-parsedAmount}, 'withdrawal')`;
    } else {
      res.status(400).json({ error: 'type must be deposit or withdrawal' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process transaction' });
  }
});

export default router;
