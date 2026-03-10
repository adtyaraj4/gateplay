// server/index.js
'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const path    = require('path');
const { pool } = require('./db/pool');

// ── Route modules ──────────────────────────────────────────────
const authRoutes    = require('./routes/auth');
const moviesRoutes  = require('./routes/movies');
const paymentRoutes = require('./routes/payment');
const logsRoutes    = require('./routes/logs');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security & parsing ─────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,   // disabled so Clerk scripts load correctly
}));

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5000',
    'http://localhost:3000',
    'http://localhost:5173',
  ],
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── HTTP request logger ────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// ── Serve frontend static files ────────────────────────────────
// The entire /public directory is the built frontend.
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
}));

// ── API routes ─────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/movies',  moviesRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/logs',    logsRoutes);

// ── Health check ───────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({
      status:   'ok',
      service:  'GatePlay API',
      database: 'connected',
      time:     new Date().toISOString(),
    });
  } catch {
    return res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// ── 404 for unknown API routes ─────────────────────────────────
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// ── SPA fallback — serve index.html for all non-API routes ─────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Global error handler ───────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[UnhandledError]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'An unexpected error occurred.',
  });
});

// ── Start ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   🎬  GatePlay API Server                ║
  ║   http://localhost:${PORT}                   ║
  ║   ENV: ${(process.env.NODE_ENV || 'development').padEnd(34)}║
  ╚══════════════════════════════════════════╝
  `);
});

module.exports = app;
