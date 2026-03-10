const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const pool = require('../db/pool');

const VALID_PLANS = {
  monthly: 9.99,
  yearly: 79.99,
};

/**
 * POST /api/payment/upgrade
 * Body: { plan: 'monthly'|'yearly', amount: number }
 * Simulated payment — no real card processing.
 */
router.post('/upgrade', requireAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { plan, amount } = req.body;

    // Validation
    if (!plan || !VALID_PLANS[plan]) {
      return res.status(400).json({
        error: 'Invalid plan',
        valid_plans: Object.keys(VALID_PLANS),
      });
    }
    const expectedAmount = VALID_PLANS[plan];
    if (Number(amount) !== expectedAmount) {
      return res.status(400).json({
        error: `Amount mismatch. Expected $${expectedAmount} for ${plan} plan.`,
      });
    }

    // Already premium?
    if (req.dbUser.role === 'premium') {
      return res.status(409).json({ error: 'Already a premium member' });
    }

    await client.query('BEGIN');

    // Record the payment
    const expiresAt = plan === 'yearly'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const { rows: paymentRows } = await client.query(
      `INSERT INTO payments (user_id, plan, amount, currency, status, expires_at, created_at)
       VALUES ($1, $2, $3, 'USD', 'completed', $4, NOW())
       RETURNING id, plan, amount, status, expires_at`,
      [req.dbUser.id, plan, amount, expiresAt]
    );

    // Upgrade user role
    await client.query(
      `UPDATE users SET role = 'premium', updated_at = NOW() WHERE id = $1`,
      [req.dbUser.id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: '🎉 Welcome to GatePlay Premium!',
      payment: paymentRows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

/**
 * GET /api/payment/history
 * Returns the authenticated user's payment history.
 */
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, plan, amount, currency, status, expires_at, created_at
       FROM payments
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.dbUser.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
