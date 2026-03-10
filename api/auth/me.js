const { createClient } = require('@supabase/supabase-js');
const { clerkClient, createClerkClient } = require('@clerk/clerk-sdk-node');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  let userId;
  try {
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const payload = await clerk.verifyToken(token);
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Check if user exists
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (existing) {
    return res.json({ user: existing });
  }

  // New user — insert with free role
  const { data, error } = await supabase
    .from('users')
    .insert({ id: userId, role: 'free' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ user: data });
};