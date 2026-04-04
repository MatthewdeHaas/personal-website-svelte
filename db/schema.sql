CREATE TABLE IF NOT EXISTS albums (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  cover_url   TEXT,
  year        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id          SERIAL PRIMARY KEY,
  album_id    INTEGER REFERENCES albums(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('photo', 'video')),
  url         TEXT NOT NULL UNIQUE,
  caption     TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  view_count  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assets_album_id_idx ON assets(album_id);
CREATE INDEX IF NOT EXISTS assets_position_idx ON assets(album_id, position);
