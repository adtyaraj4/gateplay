// server/middleware/auth.js
'use strict';

const Clerk = require('@clerk/clerk-sdk-node');
const { query } = require('../db/pool');

/**
 * requireAuth
 * ───────────
 * Verifies the Clerk JWT in the Authorization header.
 * Attaches `req.auth` (Clerk session claims) and `req.dbUser` (our DB row).
 *
 * If the user doesn't yet exist in our DB, we auto-create them with role='free'.
 *
 * Returns 401 if no/invalid token, 500 on unexpected errors.
 */
async function requireAuth(req, res, next) {
  try {
    // 1. Extract Bearer token
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'No token provided. Please sign in.' });
    }

    // 2. Verify with Clerk
    let payload;
    try {
      payload = await Clerk.verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
    }

    const clerkId = payload.sub;
    const email   = payload.email
      || (payload.email_addresses && payload.email_addresses[0]?.email_address)
      || 'unknown@gateplay.io';

    req.auth = { clerkId, email, payload };

    // 3. Upsert user in our DB (idempotent)
    const upsert = await query(
      `INSERT INTO users (clerk_id, email, role)
       VALUES ($1, $2, 'free')
       ON CONFLICT (clerk_id) DO UPDATE
         SET email      = EXCLUDED.email,
             updated_at = NOW()
       RETURNING *`,
      [clerkId, email]
    );

    req.dbUser = upsert.rows[0];
    next();
  } catch (err) {
    console.error('[requireAuth]', err.message);
    return res.status(500).json({ error: 'Authentication service error.' });
  }
}

/**
 * requirePremium
 * ──────────────
 * Must run AFTER requireAuth.
 * Blocks users whose role is not 'premium'.
 * Returns 403 with an upgrade hint.
 */
function requirePremium(req, res, next) {
  if (!req.dbUser) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  if (req.dbUser.role !== 'premium') {
    return res.status(403).json({
      error: 'Premium subscription required.',
      hint: 'Upgrade to Premium at /api/payment/upgrade',
      currentRole: req.dbUser.role,
    });
  }
  next();
}

/**
 * optionalAuth
 * ────────────
 * Like requireAuth but never blocks the request.
 * Sets req.auth and req.dbUser if a valid token is present, otherwise leaves them undefined.
 * Useful for public routes that behave differently for logged-in users.
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return next();

    let payload;
    try {
      payload = await Clerk.verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
    } catch { return next(); }

    const clerkId = payload.sub;
    const email   = payload.email || 'unknown@gateplay.io';
    req.auth = { clerkId, email, payload };

    const upsert = await query(
      `INSERT INTO users (clerk_id, email, role)
       VALUES ($1, $2, 'free')
       ON CONFLICT (clerk_id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW()
       RETURNING *`,
      [clerkId, email]
    );
    req.dbUser = upsert.rows[0];
  } catch { /* intentionally silent */ }
  next();
}

module.exports = { requireAuth, requirePremium, optionalAuth };
