// server/routes/logs.js
'use strict';

const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const { query }       = require('../db/pool');

/* ───────────────────────────────────────────────────────────────
   GET /api/logs/my
   ──────────────────
   Returns the authenticated user's own activity log.
   Useful for displaying watch history in the UI.

   Query params:
     limit  (default 50, max 200)
     offset (default 0)

   200 → { logs: [...], total }
   ─────────────────────────────────────────────────────────────── */
router.get('/my', requireAuth, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit  || 50), 200);
  const offset = Math.max(parseInt(req.query.offset || 0),   0);

  try {
    const [logsResult, countResult] = await Promise.all([
      query(
        `SELECT al.id, al.movie_slug, al.movie_title, al.content_type, al.accessed_at,
                m.genre, m.year, m.poster_url AS poster
         FROM access_logs al
         LEFT JOIN movies m ON m.slug = al.movie_slug
         WHERE al.clerk_id = $1
         ORDER BY al.accessed_at DESC
         LIMIT $2 OFFSET $3`,
        [req.dbUser.clerk_id, limit, offset]
      ),
      query(
        `SELECT COUNT(*) FROM access_logs WHERE clerk_id = $1`,
        [req.dbUser.clerk_id]
      ),
    ]);

    return res.status(200).json({
      logs:  logsResult.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (err) {
    console.error('[GET /logs/my]', err.message);
    return res.status(500).json({ error: 'Failed to fetch activity logs.' });
  }
});

/* ───────────────────────────────────────────────────────────────
   GET /api/logs/admin/summary
   ────────────────────────────
   Returns aggregate analytics. In a real app this would be admin-only.
   For this demo it is auth-gated (any logged-in user can view).

   200 → { summary: { total_users, premium_users, total_views, premium_views, top_movies } }
   ─────────────────────────────────────────────────────────────── */
router.get('/admin/summary', requireAuth, async (req, res) => {
  try {
    const [userStats, viewStats, topMovies] = await Promise.all([
      query(`SELECT
               COUNT(*)                                         AS total_users,
               COUNT(*) FILTER (WHERE role = 'premium')        AS premium_users,
               COUNT(*) FILTER (WHERE role = 'free')           AS free_users
             FROM users`),
      query(`SELECT
               COUNT(*)                                               AS total_views,
               COUNT(*) FILTER (WHERE content_type = 'premium')      AS premium_views,
               COUNT(*) FILTER (WHERE content_type = 'free')         AS free_views
             FROM access_logs`),
      query(`SELECT movie_title, content_type, COUNT(*) AS plays
             FROM access_logs
             GROUP BY movie_title, content_type
             ORDER BY plays DESC
             LIMIT 10`),
    ]);

    return res.status(200).json({
      summary: {
        users:     userStats.rows[0],
        views:     viewStats.rows[0],
        topMovies: topMovies.rows,
      },
    });
  } catch (err) {
    console.error('[GET /logs/admin/summary]', err.message);
    return res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
});

module.exports = router;
