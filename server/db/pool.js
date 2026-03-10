const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,              // max pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DB] New client connected to PostgreSQL');
  }
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Helper: run a query with automatic client release.
 * @param {string} text   - SQL query string
 * @param {Array}  params - parameterised values
 */
pool.query = (function (originalQuery) {
  return async function (text, params) {
    const start = Date.now();
    const result = await originalQuery.call(pool, text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production' && duration > 500) {
      console.warn(`[DB] Slow query (${duration}ms):`, text.slice(0, 80));
    }
    return result;
  };
})(pool.query);

module.exports = pool;
