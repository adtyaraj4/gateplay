import { createClient } from '@supabase/supabase-js';
import { getAuth } from '@clerk/nextjs/server';
import Clerk from '@clerk/clerk-sdk-node';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const clerkUser = await Clerk.users.getUser(userId);
  const email = clerkUser.emailAddresses[0]?.emailAddress || '';
  const name  = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ');

  // Upsert user on every login — creates row if first time
  const { data, error } = await supabase
    .from('users')
    .upsert({ id: userId, email, name }, { onConflict: 'id', ignoreDuplicates: false })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ user: data });
}