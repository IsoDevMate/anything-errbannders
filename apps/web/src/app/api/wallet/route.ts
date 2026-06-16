import sql from '@/app/api/utils/sql';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return Response.json({ error: 'User ID required' }, { status: 400 });
  }

  try {
    const [wallet] = await sql`SELECT * FROM wallets WHERE user_id = ${userId}`;
    const transactions = await sql`
      SELECT * FROM transactions 
      WHERE wallet_id = ${userId} 
      ORDER BY created_at DESC
    `;
    return Response.json({ wallet, transactions });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch wallet' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, amount, type } = await request.json();

    if (type === 'deposit') {
      await sql`
        INSERT INTO wallets (user_id, balance)
        VALUES (${userId}, ${amount})
        ON CONFLICT (user_id) 
        DO UPDATE SET balance = wallets.balance + ${amount}
      `;

      await sql`
        INSERT INTO transactions (wallet_id, amount, type)
        VALUES (${userId}, ${amount}, 'deposit')
      `;
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to process transaction' }, { status: 500 });
  }
}
