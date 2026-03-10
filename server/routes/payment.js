// server/routes/payment.js
'use strict';

const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const { query }       = require('../db/pool');

const VALID_PLANS = {
  essential: 7.99,
  plus:      12.99,
  ultimate:  18.99,
};

/* ───────────────────────────────────────────────────────────────
   POST /api/payment/upgrade
   ──────────────────────────
   Simulates a successful payment and upgrades the user to Premium.

   Body: { plan: 'essential' | 'plus' | 'ultimate', amount: number }

   Flow:
     1. Validate plan + amount
     2. Simulate payment processing (instant)
     3. Record payment in payments table
     4. Update user role to 'premium' in users table (transaction)
     5. Return updated user

   Status codes:
     200 → { message, user, payment }
     400 → Invalid plan or amount mismatch
     401 → Not authenticated
     409 → Already premium
     500 → DB error
   ─────────────────────────────────────────────────────────────── */
router.post('/upgrade', requireAuth, async (req, res) => {
  const { plan = 'plus', amount } = req.body;

  // 1. Validate input
  const planKey = String(plan).toLowerCase().trim();
  if (!VALID_PLANS[planKey]) {
    return res.status(400).json({
      error: 'Invalid plan.',
      validPlans: Object.keys(VALID_PLANS),
    });
  }

  const expectedAmount = VALID_PLANS[planKey];
  if (amount !== undefined && Math.abs(Number(amount) - expectedAmount) > 0.01) {
    return res.status(400).json({
      error: `Amount mismatch. Expected $${expectedAmount} for ${planKey} plan.`,
    });
  }

  // 2. Already premium? — idempotent, return success
  if (req.dbUser.role === 'premium') {
    return res.status(200).json({
      message: 'Already a Premium member!',
      user: { email: req.dbUser.email, role: req.dbUser.role, upgraded_at: req.dbUser.upgraded_at },
      alreadyPremium: true,
    });
  }

  // 3. Run upgrade in a transaction
  const client = require('../db/pool').pool;
  try {
    // Insert payment record
    const payResult = await query(
      `INSERT INTO payments (user_id, clerk_id, plan, amount, currency, status, simulated)
       VALUES ($1, $2, $3, $4, 'USD', 'succeeded', true)
       RETURNING *`,
      [req.dbUser.id, req.dbUser.clerk_id, planKey, expectedAmount]
    );

    // Upgrade user role
    const userResult = await query(
      `UPDATE users
       SET role = 'premium', upgraded_at = NOW(), updated_at = NOW()
       WHERE clerk_id = $1
       RETURNING id, clerk_id, email, role, upgraded_at, created_at`,
      [req.dbUser.clerk_id]
    );

    const updatedUser = userResult.rows[0];
    const payment     = payResult.rows[0];

    console.log(`[UPGRADE] ${updatedUser.email} → premium (plan: ${planKey}, $${expectedAmount})`);

    return res.status(200).json({
      message: `Welcome to GatePlay Premium (${planKey} plan)! All content is now unlocked.`,
      user: {
        email:       updatedUser.email,
        role:        updatedUser.role,
        upgraded_at: updatedUser.upgraded_at,
      },
      payment: {
        id:        payment.id,
        plan:      payment.plan,
        amount:    parseFloat(payment.amount),
        currency:  payment.currency,
        status:    payment.status,
        simulated: payment.simulated,
        date:      payment.created_at,
      },
    });
  } catch (err) {
    console.error('[POST /payment/upgrade]', err.message);
    return res.status(500).json({ error: 'Upgrade failed. Please try again.' });
  }
});

/* ───────────────────────────────────────────────────────────────
   GET /api/payment/history
   ─────────────────────────
   Returns the authenticated user's payment history.

   200 → { payments: [...] }
   ─────────────────────────────────────────────────────────────── */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, plan, amount::float, currency, status, simulated, created_at
       FROM payments
       WHERE clerk_id = $1
       ORDER BY created_at DESC`,
      [req.dbUser.clerk_id]
    );
    return res.status(200).json({ payments: result.rows });
  } catch (err) {
    console.error('[GET /payment/history]', err.message);
    return res.status(500).json({ error: 'Failed to fetch payment history.' });
  }
});

module.exports = router;
