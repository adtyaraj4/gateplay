// server/routes/auth.js
'use strict';

const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const { query }       = require('../db/pool');

/**
 * GET /api/auth/me
 * ─────────────────
 * Returns the currently authenticated user's profile + role.
 * The frontend calls this on every load to sync the UI.
 *
 * 200 → { user: { id, clerk_id, email, role, upgraded_at, created_at } }
 * 401 → No / invalid token
 */
router.get('/me', requireAuth, (req, res) => {
  const { id, clerk_id, email, role, upgraded_at, created_at } = req.dbUser;
  return res.status(200).json({
    user: { id, clerk_id, email, role, upgraded_at, created_at },
  });
});

/**
 * DELETE /api/auth/me
 * ────────────────────
 * Soft-deletes the current user's data (sets role back to free, clears logs).
 * Useful for testing / GDPR.
 *
 * 200 → { message }
 */
router.delete('/me', requireAuth, async (req, res) => {
  try {
    await query(
      `UPDATE users SET role = 'free', upgraded_at = NULL, updated_at = NOW() WHERE clerk_id = $1`,
      [req.dbUser.clerk_id]
    );
    return res.status(200).json({ message: 'Account reset to free tier.' });
  } catch (err) {
    console.error('[DELETE /auth/me]', err.message);
    return res.status(500).json({ error: 'Failed to reset account.' });
  }
});

module.exports = router;
