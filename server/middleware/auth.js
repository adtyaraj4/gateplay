const { createClerkClient } = require('@clerk/backend');
const pool = require('../db/pool');

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * requireAuth
 * Verifies the Clerk Bearer JWT, upserts the user into the `users` table,
 * and attaches `req.auth` (Clerk payload) and `req.dbUser` (DB row) to the request.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token with Clerk
    let payload;
    try {
      payload = await clerk.verifyToken(token);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.auth = payload;

    // Upsert user in our DB (first login creates the row)
    const clerkId = payload.sub;
    const email = payload.email ?? payload['email_address'] ?? null;

    const { rows } = await pool.query(
      `INSERT INTO users (clerk_id, email, role, created_at)
       VALUES ($1, $2, 'free', NOW())
       ON CONFLICT (clerk_id)
       DO UPDATE SET email = EXCLUDED.email, updated_at = NOW()
       RETURNING *`,
      [clerkId, email]
    );

    req.dbUser = rows[0];
    next();
  } catch (err) {
    console.error('[requireAuth] Error:', err.message);
    next(err);
  }
}

/**
 * requirePremium
 * Must run AFTER requireAuth. Returns 403 if the user is not premium.
 */
function requirePremium(req, res, next) {
  if (!req.dbUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (req.dbUser.role !== 'premium') {
    return res.status(403).json({
      error: 'Premium subscription required',
      upgrade: true,
      message: 'Upgrade to GatePlay Premium to access this content.',
    });
  }
  next();
}

module.exports = { requireAuth, requirePremium };
