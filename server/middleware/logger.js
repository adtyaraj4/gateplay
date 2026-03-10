const pool = require('../db/pool');

/**
 * logContentAccess
 * Records every play event in `access_logs`.
 * Must be called AFTER requireAuth so `req.dbUser` and `req.movie` are available.
 * Never crashes the request — errors are swallowed silently.
 */
async function logContentAccess(req, res, next) {
  // Fire-and-forget — do not await so we don't slow the response
  setImmediate(async () => {
    try {
      const userId = req.dbUser?.id;
      const movieId = req.movie?.id;
      if (!userId || !movieId) return;

      const ip =
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        null;

      const userAgent = req.headers['user-agent'] || null;

      await pool.query(
        `INSERT INTO access_logs (user_id, movie_id, ip_address, user_agent, accessed_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, movieId, ip, userAgent]
      );
    } catch (err) {
      // Logging should never break the app
      console.error('[logContentAccess] Failed to log:', err.message);
    }
  });

  next();
}

module.exports = { logContentAccess };
