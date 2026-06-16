import sql from '@/app/api/utils/sql';

export async function GET() {
  try {
    const errands = await sql`
      SELECT e.*, 
             s.full_name as sender_name, 
             a.full_name as agent_name 
      FROM errands e
      LEFT JOIN users s ON e.sender_id = s.id
      LEFT JOIN users a ON e.agent_id = a.id
      ORDER BY e.created_at DESC
    `;
    return Response.json(errands);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch errands' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, description, budget, fee, sender_id, pickup_location, delivery_location } =
      await request.json();

    // In a real app, we would check if the sender has enough balance
    const wallet = await sql`SELECT balance FROM wallets WHERE user_id = ${sender_id}`;
    if (!wallet.length || parseFloat(wallet[0].balance) < parseFloat(budget) + parseFloat(fee)) {
      return Response.json({ error: 'Insufficient wallet balance' }, { status: 400 });
    }

    const [errand] = await sql`
      INSERT INTO errands (title, description, budget, fee, sender_id, pickup_location, delivery_location, status)
      VALUES (${title}, ${description}, ${budget}, ${fee}, ${sender_id}, ${pickup_location}, ${delivery_location}, 'pending')
      RETURNING *
    `;

    // Deduct from wallet (escrow hold)
    await sql`
      UPDATE wallets 
      SET balance = balance - ${parseFloat(budget) + parseFloat(fee)}
      WHERE user_id = ${sender_id}
    `;

    await sql`
      INSERT INTO transactions (wallet_id, amount, type, errand_id)
      VALUES (${sender_id}, ${-(parseFloat(budget) + parseFloat(fee))}, 'escrow_hold', ${errand.id})
    `;

    return Response.json(errand);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to create errand' }, { status: 500 });
  }
}
