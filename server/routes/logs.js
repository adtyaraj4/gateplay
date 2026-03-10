const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const pool = require('../db/pool');

/**
 * GET /api/logs/my
 * Returns the authenticated user's watch history.
 */
router.get('/my', requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const { rows } = await pool.query(
      `SELECT
         al.id,
         m.title        AS movie_title,
         m.slug         AS movie_slug,
         m.tier         AS movie_tier,
         al.accessed_at,
         al.ip_address
       FROM access_logs al
       JOIN movies m ON m.id = al.movie_id
       WHERE al.user_id = $1
       ORDER BY al.accessed_at DESC
       LIMIT $2 OFFSET $3`,
      [req.dbUser.id, limit, offset]
    );
    res.json({ count: rows.length, offset, logs: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/logs/admin/summary
 * Platform-wide analytics. Available to all authenticated users
 * (restrict to admin role in production via middleware).
 */
router.get('/admin/summary', requireAuth, async (req, res, next) => {
  try {
    const [totals, topMovies, recentActivity] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(DISTINCT user_id)    AS total_viewers,
           COUNT(*)                   AS total_plays,
           COUNT(DISTINCT movie_id)   AS unique_titles_watched
         FROM access_logs`
      ),
      pool.query(
        `SELECT
           m.title,
           m.tier,
           COUNT(al.id) AS play_count
         FROM access_logs al
         JOIN movies m ON m.id = al.movie_id
         GROUP BY m.id, m.title, m.tier
         ORDER BY play_count DESC
         LIMIT 10`
      ),
      pool.query(
        `SELECT
           u.email,
           m.title  AS movie_title,
           al.accessed_at
         FROM access_logs al
         JOIN users  u ON u.id = al.user_id
         JOIN movies m ON m.id = al.movie_id
         ORDER BY al.accessed_at DESC
         LIMIT 20`
      ),
    ]);

    res.json({
      totals: totals.rows[0],
      top_movies: topMovies.rows,
      recent_activity: recentActivity.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
