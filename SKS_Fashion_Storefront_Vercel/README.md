# SKS Fashion Storefront

Production-ready Sarath Kumara Sons catalogue for Vercel. Products are loaded from SQLite, customers select a size, and the Buy now button opens WhatsApp number `94775043005` with the product name, code, selected size, price and a hosted product-card URL.

## Project structure

- `index.html`: public storefront
- `assets/hero.png`: uploaded hero artwork
- `src/`: responsive design and WhatsApp ordering logic
- `api/products.js`: product catalogue API
- `api/product-share.js`: Open Graph product card used inside the WhatsApp order
- `data/store.db`: bundled SQLite catalogue
- `data/schema.sql` and `data/seed.sql`: database source
- `lib/database.js`: local SQLite and Turso adapter

## Local setup

```bash
npm install
npm run db:seed
npm run check
npm run dev
```

## Database

The project works immediately with the bundled `data/store.db` SQLite file. That file is read-only after deployment and is ideal for a catalogue updated through GitHub.

For persistent online edits, create a Turso database, run `data/schema.sql` and `data/seed.sql`, then add these Vercel environment variables:

```text
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
```

The API automatically switches to Turso, which is compatible with SQLite, when those variables are present.

## WhatsApp behaviour

The order button uses the official click-to-chat format. A browser link cannot attach a photo file directly to WhatsApp. Instead, the message contains the hosted product-card URL. The `/api/product-share` endpoint supplies the product image and Open Graph details so WhatsApp can generate a rich preview after the message is sent.

## Deployment

Import the GitHub repository into Vercel. No build command or output directory is required. Vercel serves the static storefront and deploys both files in `api/` as serverless functions.
