// server/routes/movies.js
'use strict';

const express  = require('express');
const router   = express.Router();
const { requireAuth, requirePremium, optionalAuth } = require('../middleware/auth');
const { logContentAccess } = require('../middleware/logger');
const { query } = require('../db/pool');

/* ───────────────────────────────────────────────────────────────
   GET /api/movies/all
   ─────────────────────
   Public-ish: returns all movies.
   If a valid auth token is present, the response will include whether
   each movie is accessible for the current user.
   No token needed to LIST movies (just to PLAY them).
   ─────────────────────────────────────────────────────────────── */
router.get('/all', optionalAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, slug AS id_slug, title, genre, year, rating::float,
              type, duration, poster_url AS poster, description
       FROM movies
       ORDER BY type DESC, year DESC`
    );

    const userRole = req.dbUser?.role || 'guest';

    const movies = result.rows.map(m => ({
      id:          m.id_slug,
      dbId:        m.id,
      title:       m.title,
      genre:       m.genre,
      year:        m.year,
      rating:      m.rating,
      type:        m.type,
      duration:    m.duration,
      poster:      m.poster_url || m.poster,
      description: m.description,
      locked:      m.type === 'premium' && userRole !== 'premium',
    }));

    return res.status(200).json({ movies, userRole });
  } catch (err) {
    console.error('[GET /movies/all]', err.message);
    return res.status(500).json({ error: 'Failed to fetch movies.' });
  }
});

/* ───────────────────────────────────────────────────────────────
   GET /api/movies/free
   ─────────────────────
   Returns only free movies. No auth required.
   ─────────────────────────────────────────────────────────────── */
router.get('/free', async (_req, res) => {
  try {
    const result = await query(
      `SELECT id, slug AS id_slug, title, genre, year, rating::float,
              type, duration, poster_url AS poster
       FROM movies WHERE type = 'free' ORDER BY year DESC`
    );
    return res.status(200).json({ movies: result.rows });
  } catch (err) {
    console.error('[GET /movies/free]', err.message);
    return res.status(500).json({ error: 'Failed to fetch movies.' });
  }
});

/* ───────────────────────────────────────────────────────────────
   GET /api/movies/premium
   ────────────────────────
   Returns metadata for premium movies. Auth required.
   Does NOT log access — logging only happens on /play.
   ─────────────────────────────────────────────────────────────── */
router.get('/premium', requireAuth, requirePremium, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, slug AS id_slug, title, genre, year, rating::float,
              type, duration, poster_url AS poster, description
       FROM movies WHERE type = 'premium' ORDER BY year DESC`
    );
    return res.status(200).json({ movies: result.rows });
  } catch (err) {
    console.error('[GET /movies/premium]', err.message);
    return res.status(500).json({ error: 'Failed to fetch movies.' });
  }
});

/* ───────────────────────────────────────────────────────────────
   POST /api/movies/:slug/play
   ────────────────────────────
   The critical "play" endpoint.
   • Free movies   → auth required, any role
   • Premium movies → auth required, role = 'premium'

   On success:
     - Returns the movie data
     - Logs the access event in access_logs

   Status codes:
     200 → { movie, message }
     401 → Not signed in
     403 → Free user trying to play premium content
     404 → Movie not found
     500 → Server error
   ─────────────────────────────────────────────────────────────── */
router.post('/:slug/play', requireAuth, async (req, res) => {
  const { slug } = req.params;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Invalid movie identifier.' });
  }

  try {
    const result = await query(
      `SELECT * FROM movies WHERE slug = $1`,
      [slug]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Movie not found.' });
    }

    const movie = result.rows[0];

    // Premium content gate
    if (movie.type === 'premium' && req.dbUser.role !== 'premium') {
      return res.status(403).json({
        error: 'Premium subscription required to watch this content.',
        hint: 'Upgrade at /api/payment/upgrade',
        movie: { title: movie.title, type: movie.type },
      });
    }

    // Log the access
    await logContentAccess(req, movie);

    return res.status(200).json({
      message: `Now playing: ${movie.title}`,
      movie: {
        id:          movie.slug,
        title:       movie.title,
        genre:       movie.genre,
        year:        movie.year,
        rating:      parseFloat(movie.rating),
        type:        movie.type,
        duration:    movie.duration,
        poster:      movie.poster_url,
        description: movie.description,
      },
    });
  } catch (err) {
    console.error('[POST /movies/:slug/play]', err.message);
    return res.status(500).json({ error: 'Failed to process play request.' });
  }
});

module.exports = router;
