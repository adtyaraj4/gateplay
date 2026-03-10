import { createClient } from '@supabase/supabase-js';
import { createClerkClient } from '@clerk/clerk-sdk-node';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  let userId;
  try {
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const payload = await clerk.verifyToken(token);
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { data, error } = await supabase
    .from('users')
    .upsert({ id: userId, role: 'premium' }, { onConflict: 'id' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, user: data });
}