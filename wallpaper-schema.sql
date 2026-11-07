-- Run once against the existing nexora-content D1 database.
CREATE TABLE IF NOT EXISTS wallpapers (
 id TEXT PRIMARY KEY,
 title TEXT NOT NULL,
 category TEXT NOT NULL,
 tags TEXT NOT NULL DEFAULT '',
 thumb_url TEXT NOT NULL,
 image_url TEXT NOT NULL,
 source_url TEXT NOT NULL,
 source_name TEXT NOT NULL DEFAULT 'Wikimedia Commons',
 author TEXT NOT NULL DEFAULT 'Comunidad',
 license TEXT NOT NULL DEFAULT 'Ver licencia',
 width INTEGER NOT NULL DEFAULT 0,
 height INTEGER NOT NULL DEFAULT 0,
 downloads INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL CHECK(status IN ('draft','published')),
 created_at TEXT NOT NULL,
 published_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wallpapers_public_date ON wallpapers(status,published_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallpapers_category_date ON wallpapers(status,category,published_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallpapers_dimensions ON wallpapers(status,width,height);
