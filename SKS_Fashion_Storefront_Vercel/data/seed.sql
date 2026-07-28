DELETE FROM products;

INSERT INTO products (
  id,
  name,
  code,
  price_lkr,
  material,
  description,
  sizes_json,
  image_path,
  image_position,
  in_stock,
  sort_order
) VALUES (
  'italian-cotton-long-frock',
  'Italian Cotton Long Frock',
  'NRT-LF-001',
  3495,
  'Italian cotton',
  'A comfortable, elegant long frock with a flowing silhouette for everyday wear and special outings.',
  '["XL","2XL","3XL","4XL"]',
  '/assets/hero.png',
  '76% center',
  1,
  1
);
