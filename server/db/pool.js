// server/db/pool.js
'use strict';

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },   // required for Supabase
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Run a parameterised query.
 * @param {string} text   SQL string with $1, $2 … placeholders
 * @param {any[]}  params Values for placeholders
 */
async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const ms = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DB] ${ms}ms | rows=${result.rowCount} | ${text.slice(0, 80)}`);
    }
    return result;
  } catch (err) {
    console.error('[DB] Query error:', err.message, '\nSQL:', text);
    throw err;
  }
}

/**
 * Grab a dedicated client for transactions.
 */
async function getClient() {
  return pool.connect();
}

module.exports = { query, getClient, pool };
