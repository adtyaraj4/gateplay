// server/middleware/logger.js
'use strict';

const { query } = require('../db/pool');

/**
 * logContentAccess
 * ────────────────
 * Records a content-access event in the access_logs table.
 * Call this from movie routes after verifying the user is authorised.
 *
 * @param {object} req      Express request (must have req.dbUser set by requireAuth)
 * @param {object} movie    Movie row from DB  { id, slug, title, type }
 */
async function logContentAccess(req, movie) {
  if (!req.dbUser) return;           // should never happen in protected routes
  try {
    await query(
      `INSERT INTO access_logs
         (user_id, clerk_id, user_email, movie_id, movie_slug, movie_title, content_type, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        req.dbUser.id,
        req.dbUser.clerk_id,
        req.dbUser.email,
        movie.id   || null,
        movie.slug || null,
        movie.title,
        movie.type,
        req.ip || req.headers['x-forwarded-for'] || null,
        req.headers['user-agent'] || null,
      ]
    );
  } catch (err) {
    // Never crash a request because of a logging failure
    console.error('[logContentAccess] Failed to write log:', err.message);
  }
}

module.exports = { logContentAccess };
