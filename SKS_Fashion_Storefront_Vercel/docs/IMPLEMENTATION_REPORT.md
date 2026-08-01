# SKS Clothing Website Upgrade Report

## Architecture audit

- Frontend: static HTML, CSS and browser JavaScript
- Backend: Vercel Node.js serverless functions
- Catalogue storage: versioned JSON state in Vercel Blob, with bundled SQLite/libSQL fallback
- Media storage: Vercel Blob
- Authentication: signed HTTP-only cookie, now extended with CSRF token, session version, roles and optional scrypt password hash
- Hosting: Vercel, with GitHub automatic deployment

## Root causes repaired

- Sizes were a flat string array and the UI compared an entire shared value.
- Product codes depended on manual admin entry.
- The loader had a fixed delay and no saved setting.
- Image display only supported one object-position value.
- Logo upload did not support removal, width or alignment.
- Buy Now interest and completed sales were not tracked separately.
- Admin mutations lacked CSRF tokens and password hashing support.

## Important decisions

- Existing Blob state is migrated at read time to schema version 2. Existing product data remains readable.
- Product sizes are structured objects with label, availability and display order.
- Product codes use a backend-owned monotonic sequence. Archived codes remain reserved.
- The original uploaded image URL is preserved. Display transformation settings are stored separately.
- Products are archived instead of physically deleted to preserve sales history.
- Google Sheets uses a secret-protected Apps Script webhook so no Google secret is exposed to the storefront.

## Validation

- `npm run check`: passed
- Unit and regression tests: 9 passed, 0 failed
- JavaScript syntax checks: passed for storefront, admin and APIs
- Git whitespace validation: passed
- Secret scan: passed
- Bundled SQLite catalogue check: passed with 1 product

Cloud-browser visual verification could not access the local-only preview address. Production verification remains pending until GitHub write access permits publishing the reviewed source.

## Main files changed

- `lib/catalog.js`, `lib/auth.js`, `lib/sales.js`, `lib/google-sheets.js`
- `api/admin/*.js`, `api/click.js`, `api/products.js`
- `admin/index.html`, `admin/app.js`, `admin/styles.css`
- `index.html`, `src/app.js`, `src/styles.css`
- `data/migrations/002_structured_commerce.sql`
- `google-sheets/Code.gs` and CSV templates
- `.env.example`, security, backup, admin and Google setup guides
- catalogue, size, sales and order tests

## Manual deployment steps

1. Grant the connected GitHub app **Contents: Read and write** access to `praveendinusara/sks-fashion-storefront`, or push this source archive from an authenticated local Git client.
2. Commit the `SKS_Fashion_Storefront_Vercel/` directory to `main` or merge a review branch.
3. Confirm the Vercel project root remains `SKS_Fashion_Storefront_Vercel`.
4. Add `ADMIN_PASSWORD_HASH`, set `ADMIN_SESSION_VERSION=2`, and retain the existing session secret and Blob token.
5. Optionally configure the two Google Sheets webhook environment variables.
6. Verify `/api/products`, `/admin`, one size selection, the missing-size warning, image upload and a Buy Now click.
