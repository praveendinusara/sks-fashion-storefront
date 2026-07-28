CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  price_lkr INTEGER NOT NULL CHECK (price_lkr >= 0),
  material TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  sizes_json TEXT NOT NULL DEFAULT '[]',
  image_path TEXT NOT NULL,
  image_position TEXT NOT NULL DEFAULT 'center',
  in_stock INTEGER NOT NULL DEFAULT 1 CHECK (in_stock IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_stock_sort
ON products (in_stock DESC, sort_order ASC, name ASC);
