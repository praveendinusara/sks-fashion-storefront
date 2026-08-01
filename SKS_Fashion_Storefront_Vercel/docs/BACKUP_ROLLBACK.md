# Backup and Rollback

## Local database

Run `npm run backup`. It creates a timestamped copy under `backups/`.

## Live catalogue state

Vercel Blob keeps the eight newest versioned catalogue snapshots. Before a major change, download the newest `sks/state/catalog-*.json` object from the project Blob store. Do not publish that backup because it can contain sales and audit information.

## Rollback

1. In Vercel, select the last known-good deployment and promote it to Production.
2. If only data must be restored, upload the saved catalogue JSON as a new version under `sks/state/` with a newer timestamped filename.
3. Run `npm run check`, verify `/api/products`, the storefront size picker and `/admin`.
4. Run a full Google Sheets sync after restoring data.

The SQL migration in `data/migrations/002_structured_commerce.sql` is intended for a database copy first. SQLite does not provide a reliable automatic down migration for every added column, so restore the pre-migration database backup if a rollback is required.
