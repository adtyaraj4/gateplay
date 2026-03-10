import { createClient } from '@supabase/supabase-js';
import { getAuth } from '@clerk/nextjs/server';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { data, error } = await supabase
    .from('users')
    .update({ role: 'premium' })
    .eq('id', userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, user: data });
}
```

**4. Add these to your Vercel environment variables:**
```
SUPABASE_URL=https://jxelwpncnligbnjdowva.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4ZWx3cG5jbmxpZ2JuamRvd3ZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA2NDUxNywiZXhwIjoyMDg4NjQwNTE3fQ.rdVDetd6nh2iWM5miJzGdZPEXL4FdaFAQX5ZZKODRq0
CLERK_SECRET_KEY=sk_test_igGrtVIpwSgC65rm4BfLkNDLLrb1boaCJSamStwdaa