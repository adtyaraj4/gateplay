const router = require('express').Router();
const { requireAuth, requirePremium } = require('../middleware/auth');
const { logContentAccess } = require('../middleware/logger');
const pool = require('../db/pool');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatMovie(movie, userRole) {
  const isPremium = movie.tier === 'premium';
  const locked = isPremium && userRole !== 'premium';
  return {
    id: movie.id,
    title: movie.title,
    slug: movie.slug,
    description: movie.description,
    genre: movie.genre,
    year: movie.year,
    rating: movie.rating,
    poster_url: movie.poster_url,
    tier: movie.tier,
    locked,
    ...(locked ? {} : { stream_url: movie.stream_url }),
  };
}

// ─── GET /api/movies/all ──────────────────────────────────────────────────────
router.get('/all', async (req, res, next) => {
  try {
    // Optionally respect auth if present
    let userRole = 'guest';
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { createClerkClient } = require('@clerk/backend');
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        const payload = await clerk.verifyToken(authHeader.split(' ')[1]);
        const { rows } = await pool.query('SELECT role FROM users WHERE clerk_id = $1', [payload.sub]);
        if (rows.length) userRole = rows[0].role;
      } catch { /* ignore invalid token for optional auth */ }
    }

    const { rows } = await pool.query(
      'SELECT * FROM movies ORDER BY tier, title'
    );
    res.json(rows.map((m) => formatMovie(m, userRole)));
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/movies/free ─────────────────────────────────────────────────────
router.get('/free', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM movies WHERE tier = 'free' ORDER BY title"
    );
    res.json(rows.map((m) => formatMovie(m, 'free')));
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/movies/premium ──────────────────────────────────────────────────
router.get('/premium', requireAuth, requirePremium, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM movies WHERE tier = 'premium' ORDER BY title"
    );
    res.json(rows.map((m) => formatMovie(m, 'premium')));
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/movies/:slug/play ──────────────────────────────────────────────
router.post('/:slug/play', requireAuth, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM movies WHERE slug = $1',
      [slug]
    );

    if (!rows.length) return res.status(404).json({ error: 'Movie not found' });
    const movie = rows[0];
    req.movie = movie;

    // Block free users from premium content
    if (movie.tier === 'premium' && req.dbUser.role !== 'premium') {
      return res.status(403).json({
        error: 'Premium content',
        upgrade: true,
        message: 'Upgrade to GatePlay Premium to watch this movie.',
      });
    }

    // Log the access (non-blocking)
    await logContentAccess(req, res, () => {});

    res.json({
      success: true,
      movie: {
        id: movie.id,
        title: movie.title,
        slug: movie.slug,
        stream_url: movie.stream_url,
        tier: movie.tier,
      },
      message: `Now playing: ${movie.title}`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
