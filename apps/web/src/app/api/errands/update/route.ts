import sql from '@/app/api/utils/sql';

export async function POST(request: Request) {
  try {
    const { errandId, status, agentId, proofImageUrl } = await request.json();

    const [errand] = await sql`
      UPDATE errands 
      SET status = ${status}, 
          agent_id = COALESCE(agent_id, ${agentId}),
          proof_image_url = COALESCE(proof_image_url, ${proofImageUrl})
      WHERE id = ${errandId}
      RETURNING *
    `;

    // If confirmed, release funds to agent
    if (status === 'confirmed' && errand.agent_id) {
      await sql`
        UPDATE wallets 
        SET balance = balance + ${errand.fee}
        WHERE user_id = ${errand.agent_id}
      `;

      await sql`
        INSERT INTO transactions (wallet_id, amount, type, errand_id)
        VALUES (${errand.agent_id}, ${errand.fee}, 'payment_release', ${errand.id})
      `;
    }

    return Response.json(errand);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to update errand' }, { status: 500 });
  }
}
