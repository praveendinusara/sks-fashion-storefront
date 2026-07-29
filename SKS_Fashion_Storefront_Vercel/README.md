# SKS Fashion Storefront

Production-ready Sarath Kumara Sons catalogue for Vercel. Customers select a size and the Buy now button opens WhatsApp number `94775043005` with the product name, code, selected size and price.

## Project structure

- `index.html`: public storefront
- `assets/hero.png`: uploaded hero artwork
- `src/`: responsive design and WhatsApp ordering logic
- `api/products.js`: product catalogue API
- `api/admin/`: protected product, settings and image management APIs
- `admin/`: private owner dashboard
- `data/store.db`: bundled SQLite catalogue
- `data/schema.sql` and `data/seed.sql`: database source
- `lib/database.js`: local SQLite and Turso adapter
- `lib/catalog.js`: persistent catalogue state backed by Vercel Blob

## Local setup

```bash
npm install
npm run db:seed
npm run check
npm run dev
```

## Database

The project works immediately with the bundled `data/store.db` SQLite file. Once `BLOB_READ_WRITE_TOKEN` is available, admin changes are stored permanently in Vercel Blob.

The admin login also requires `ADMIN_USERNAME`, `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`. These values belong in Vercel environment variables and must never be committed to GitHub.

## WhatsApp behaviour

The order button uses the official click-to-chat format. The WhatsApp message contains only product name, product code, selected size, price and the request to confirm availability and delivery details. It does not include a product-card URL.

## Deployment

Import the GitHub repository into Vercel. No build command or output directory is required. Vercel serves the static storefront and deploys both files in `api/` as serverless functions.
