-- ============================================================
-- GatePlay — PostgreSQL Schema
-- Run this in your Supabase SQL Editor before starting the app
-- ============================================================

-- Enable UUID extension (available by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  clerk_id    TEXT NOT NULL UNIQUE,
  email       TEXT,
  role        TEXT NOT NULL DEFAULT 'free' CHECK (role IN ('free', 'premium', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users (clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_role     ON users (role);

-- ─── Movies ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS movies (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  genre       TEXT,
  year        INT,
  rating      NUMERIC(3,1) CHECK (rating >= 0 AND rating <= 10),
  poster_url  TEXT,
  stream_url  TEXT,
  tier        TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies (slug);
CREATE INDEX IF NOT EXISTS idx_movies_tier ON movies (tier);

-- ─── Access Logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS access_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id    INT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  ip_address  TEXT,
  user_agent  TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_user_id   ON access_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_movie_id  ON access_logs (movie_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_accessed  ON access_logs (accessed_at DESC);

-- ─── Payments ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan        TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  amount      NUMERIC(10,2) NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'USD',
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);

-- ─── Premium Access Summary View ─────────────────────────────────────────────
CREATE OR REPLACE VIEW premium_access_summary AS
SELECT
  u.id            AS user_id,
  u.email,
  u.role,
  COUNT(al.id)    AS total_plays,
  MAX(al.accessed_at) AS last_watched,
  p.plan          AS subscription_plan,
  p.expires_at    AS subscription_expires
FROM users u
LEFT JOIN access_logs al ON al.user_id = u.id
LEFT JOIN payments p ON p.user_id = u.id AND p.status = 'completed'
GROUP BY u.id, u.email, u.role, p.plan, p.expires_at;

-- ─── Seed: Movies ─────────────────────────────────────────────────────────────
INSERT INTO movies (title, slug, description, genre, year, rating, poster_url, stream_url, tier)
VALUES
  -- Free Tier (6 movies)
  ('The Open Road',     'the-open-road',     'A road-trip drama about self-discovery across America.',         'Drama',     2019, 7.4, 'https://picsum.photos/seed/road/300/450',      'https://www.w3schools.com/html/mov_bbb.mp4',  'free'),
  ('Neon City',         'neon-city',         'A cyberpunk thriller set in a dystopian near-future metropolis.','Sci-Fi',    2021, 8.1, 'https://picsum.photos/seed/neon/300/450',      'https://www.w3schools.com/html/mov_bbb.mp4',  'free'),
  ('The Last Garden',   'the-last-garden',   'An elderly botanist uncovers her family's wartime secrets.',     'Mystery',   2018, 6.9, 'https://picsum.photos/seed/garden/300/450',    'https://www.w3schools.com/html/mov_bbb.mp4',  'free'),
  ('Velocity',          'velocity',          'High-octane racing action from the streets of Miami.',           'Action',    2022, 7.2, 'https://picsum.photos/seed/velocity/300/450',  'https://www.w3schools.com/html/mov_bbb.mp4',  'free'),
  ('Coastal Wind',      'coastal-wind',      'A slow-burn romance set along the rugged Norwegian coast.',      'Romance',   2020, 7.8, 'https://picsum.photos/seed/coast/300/450',     'https://www.w3schools.com/html/mov_bbb.mp4',  'free'),
  ('Laughing Matters',  'laughing-matters',  'A stand-up comedian faces an existential crisis mid-tour.',      'Comedy',    2023, 6.5, 'https://picsum.photos/seed/laugh/300/450',     'https://www.w3schools.com/html/mov_bbb.mp4',  'free'),
  -- Premium Tier (6 movies)
  ('Phantom Signal',    'phantom-signal',    'A NASA engineer intercepts an alien transmission — and disappears.','Sci-Fi', 2022, 9.0, 'https://picsum.photos/seed/phantom/300/450',   'https://www.w3schools.com/html/mov_bbb.mp4',  'premium'),
  ('Empire of Ash',     'empire-of-ash',     'An epic historical saga spanning three generations of a dynasty.','History',  2021, 8.7, 'https://picsum.photos/seed/empire/300/450',    'https://www.w3schools.com/html/mov_bbb.mp4',  'premium'),
  ('Deep Tide',         'deep-tide',         'A submarine crew races against time after a nuclear accident.',  'Thriller',  2023, 8.5, 'https://picsum.photos/seed/tide/300/450',      'https://www.w3schools.com/html/mov_bbb.mp4',  'premium'),
  ('Mirage Protocol',   'mirage-protocol',   'A spy thriller unravelling a global conspiracy in real time.',   'Thriller',  2022, 8.3, 'https://picsum.photos/seed/mirage/300/450',    'https://www.w3schools.com/html/mov_bbb.mp4',  'premium'),
  ('The Hollow Crown',  'the-hollow-crown',  'A Shakespearean adaptation set in a post-apocalyptic world.',    'Drama',     2020, 8.9, 'https://picsum.photos/seed/crown/300/450',     'https://www.w3schools.com/html/mov_bbb.mp4',  'premium'),
  ('Stardust Express',  'stardust-express',  'An animated adventure following three siblings across the galaxy.','Animation',2023, 9.2, 'https://picsum.photos/seed/stardust/300/450',  'https://www.w3schools.com/html/mov_bbb.mp4',  'premium')
ON CONFLICT (slug) DO NOTHING;
