# NEXORA Wallpaper

Public gallery: `/wallpaper.html`. The catalog uses the existing Cloudflare Pages Functions and the existing D1 binding `DB` (database `nexora-content`).

## Activate the catalog

1. In Cloudflare D1, open `nexora-content` and run `wallpaper-schema.sql` once.
2. In Cloudflare Pages → `nexora` → Settings → Functions → Environment variables, add Production variable `WALLPAPER_INGEST_TOKEN` with a long random secret. Do not commit or paste the secret into chat.
3. In GitHub → `misael546/NEXORA` → Settings → Secrets and variables → Actions, add:
   - `WALLPAPER_INGEST_URL` = `https://nexora-ey8.pages.dev/api/admin/wallpapers`
   - `WALLPAPER_INGEST_TOKEN` = the same secret configured in Cloudflare.
4. Redeploy Cloudflare Pages so the Function receives the new variable.
5. Run GitHub Actions → **NEXORA Wallpaper weekly collection** → **Run workflow** once to seed the first batch. It will then run every Monday at 15:00 UTC.

The ingestion endpoint accepts only Wikimedia Commons upload URLs and requires the server-side bearer token. The importer stores source page, author and license metadata. The public API supports pagination, text search, category and screen-orientation filters.

## About the 100,000-wallpaper goal

The database and paginated API are designed to scale toward a 100,000-item catalog. The first scheduled batches add newly discovered, high-resolution Commons images; they do not fabricate 100,000 entries or claim that the full target is already populated. Wikimedia Commons has a large open-media catalog, but available results vary by topic, resolution and license. Images remain linked to their source pages and license information.
