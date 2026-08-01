BEGIN;

ALTER TABLE products ADD COLUMN status TEXT NOT NULL DEFAULT 'published'
  CHECK (status IN ('draft', 'published', 'archived'));
ALTER TABLE products ADD COLUMN created_at_v2 TEXT;
ALTER TABLE products ADD COLUMN media_json TEXT NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS product_sizes (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  available INTEGER NOT NULL DEFAULT 1 CHECK (available IN (0, 1)),
  display_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(product_id, label)
);

CREATE TABLE IF NOT EXISTS product_code_sequence (
  prefix TEXT PRIMARY KEY,
  last_value INTEGER NOT NULL DEFAULT 0 CHECK (last_value >= 0)
);

CREATE TABLE IF NOT EXISTS product_analytics (
  product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  buy_now_clicks INTEGER NOT NULL DEFAULT 0 CHECK (buy_now_clicks >= 0),
  last_clicked_at TEXT
);

CREATE TABLE IF NOT EXISTS sales_log (
  id TEXT PRIMARY KEY,
  product_code TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  sale_date TEXT NOT NULL,
  entered_by TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_id TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_sizes_order ON product_sizes(product_id, display_order);
CREATE INDEX IF NOT EXISTS idx_sales_log_product_date ON sales_log(product_code, sale_date);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

COMMIT;
