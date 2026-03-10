-- ═══════════════════════════════════════════════════════════════
--  GatePlay — Supabase PostgreSQL Schema  (SAFE / IDEMPOTENT)
--
--  HOW TO RUN:
--    Supabase Dashboard → SQL Editor → New Query → Paste → Run
--
--  This script drops and recreates everything cleanly.
--  Safe to re-run at any time.
-- ═══════════════════════════════════════════════════════════════

-- ── 0. Enable UUID extension ──────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Drop everything in reverse dependency order ────────────
DROP VIEW     IF EXISTS premium_access_summary CASCADE;
DROP TABLE    IF EXISTS access_logs  CASCADE;
DROP TABLE    IF EXISTS payments     CASCADE;
DROP TABLE    IF EXISTS movies       CASCADE;
DROP TABLE    IF EXISTS users        CASCADE;
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;

-- ── 2. users ──────────────────────────────────────────────────
CREATE TABLE users (
  id           UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  clerk_id     TEXT        NOT NULL UNIQUE,
  email        TEXT        NOT NULL,
  role         TEXT        NOT NULL DEFAULT 'free'
                           CHECK (role IN ('free', 'premium')),
  upgraded_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_clerk_id ON users (clerk_id);
CREATE INDEX idx_users_email    ON users (email);

-- ── 3. movies ─────────────────────────────────────────────────
CREATE TABLE movies (
  id           UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug         TEXT        NOT NULL UNIQUE,
  title        TEXT        NOT NULL,
  genre        TEXT,
  year         INTEGER,
  rating       NUMERIC(3,1),
  type         TEXT        NOT NULL DEFAULT 'free'
                           CHECK (type IN ('free', 'premium')),
  duration     TEXT,
  poster_url   TEXT,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movies_type ON movies (type);
CREATE INDEX idx_movies_slug ON movies (slug);

-- ── 4. access_logs ────────────────────────────────────────────
CREATE TABLE access_logs (
  id            UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  clerk_id      TEXT        NOT NULL,
  user_email    TEXT        NOT NULL,
  movie_id      UUID        REFERENCES movies (id) ON DELETE SET NULL,
  movie_slug    TEXT,
  movie_title   TEXT,
  content_type  TEXT        NOT NULL CHECK (content_type IN ('free', 'premium')),
  ip_address    TEXT,
  user_agent    TEXT,
  accessed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logs_user_id   ON access_logs (user_id);
CREATE INDEX idx_logs_clerk_id  ON access_logs (clerk_id);
CREATE INDEX idx_logs_accessed  ON access_logs (accessed_at DESC);
CREATE INDEX idx_logs_content   ON access_logs (content_type);

-- ── 5. payments ───────────────────────────────────────────────
CREATE TABLE payments (
  id          UUID         NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  clerk_id    TEXT         NOT NULL,
  plan        TEXT         NOT NULL,
  amount      NUMERIC(8,2) NOT NULL,
  currency    TEXT         NOT NULL DEFAULT 'USD',
  status      TEXT         NOT NULL DEFAULT 'succeeded'
                           CHECK (status IN ('succeeded', 'failed', 'pending')),
  simulated   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id  ON payments (user_id);
CREATE INDEX idx_payments_clerk_id ON payments (clerk_id);

-- ── 6. Auto-update updated_at trigger ────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ── 7. Seed movies ────────────────────────────────────────────
INSERT INTO movies (slug, title, genre, year, rating, type, duration, poster_url)
VALUES
  ('m001', 'Vikings',                  'Drama',     2013, 4.5, 'free',    '45 min',  'https://image.tmdb.org/t/p/w500/aA9N1B9xyYBxoW3T2h4oBxP0TQK.jpg'),
  ('m002', 'Breaking Bad',             'Crime',     2008, 5.0, 'premium', '47 min',  'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg'),
  ('m003', 'The Last of Us',           'Drama',     2023, 4.8, 'free',    '55 min',  'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg'),
  ('m004', 'Kung Fu Panda 4',          'Animation', 2024, 3.9, 'premium', '94 min',  'https://image.tmdb.org/t/p/w500/kDp1vUBnMpe8ak4rjgl3cLELqjU.jpg'),
  ('m005', 'Spider-Man: Spider-Verse', 'Animation', 2018, 4.8, 'free',    '117 min', 'https://image.tmdb.org/t/p/w500/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg'),
  ('m006', 'Migration',                'Animation', 2023, 3.7, 'premium', '83 min',  'https://image.tmdb.org/t/p/w500/ldfCF9RhR40mppkzmftxapaHeTo.jpg'),
  ('m007', 'Minions: Rise of Gru',     'Animation', 2022, 3.6, 'free',    '87 min',  'https://image.tmdb.org/t/p/w500/wKiOkZTd4C8FGXVBHTMFIkMbUf9.jpg'),
  ('m008', 'House of the Dragon',      'Fantasy',   2022, 4.5, 'premium', '60 min',  'https://image.tmdb.org/t/p/w500/z2yahl2uefxDCl0nogcRBstwruJ.jpg'),
  ('m009', 'Oppenheimer',              'Drama',     2023, 4.7, 'premium', '180 min', 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg'),
  ('m010', 'Avatar: The Way of Water', 'Sci-Fi',    2022, 4.0, 'free',    '192 min', 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg'),
  ('m011', 'Dune: Part Two',           'Sci-Fi',    2024, 4.6, 'premium', '166 min', 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'),
  ('m012', 'Wednesday',                'Mystery',   2022, 4.3, 'free',    '45 min',  'https://image.tmdb.org/t/p/w500/9PFonBhy4cQy7Jz20NpMygczOkv.jpg')
ON CONFLICT (slug) DO NOTHING;

-- ── 8. Analytics view ─────────────────────────────────────────
CREATE VIEW premium_access_summary AS
SELECT
  u.email,
  u.role,
  COUNT(al.id)                                             AS total_views,
  COUNT(al.id) FILTER (WHERE al.content_type = 'premium') AS premium_views,
  MAX(al.accessed_at)                                      AS last_active
FROM users u
LEFT JOIN access_logs al ON al.user_id = u.id
GROUP BY u.id, u.email, u.role
ORDER BY total_views DESC;

-- ── 9. Verify row counts ──────────────────────────────────────
SELECT 'users'       AS tbl, COUNT(*) AS rows FROM users
UNION ALL
SELECT 'movies',              COUNT(*)         FROM movies
UNION ALL
SELECT 'access_logs',         COUNT(*)         FROM access_logs
UNION ALL
SELECT 'payments',            COUNT(*)         FROM payments;
