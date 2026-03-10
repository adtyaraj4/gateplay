const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const pool = require('../db/pool');

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile + role from DB.
 */
router.get('/me', requireAuth, (req, res) => {
  const { id, clerk_id, email, role, created_at, updated_at } = req.dbUser;
  res.json({ id, clerk_id, email, role, created_at, updated_at });
});

/**
 * DELETE /api/auth/me
 * Resets the current user's account back to the free tier (for testing).
 */
router.delete('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users SET role = 'free', updated_at = NOW()
       WHERE clerk_id = $1 RETURNING id, email, role`,
      [req.auth.sub]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Account reset to free tier', user: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
