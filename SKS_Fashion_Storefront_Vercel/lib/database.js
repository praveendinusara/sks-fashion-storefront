import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

let client;

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

export function getDatabase() {
  if (client) return client;

  const remoteUrl = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  const localPath = path.join(moduleDirectory, "..", "data", "store.db");

  client = createClient(
    remoteUrl
      ? { url: remoteUrl, authToken }
      : { url: `file:${localPath}` }
  );

  return client;
}

export function productFromRow(row) {
  let sizes = [];

  try {
    sizes = JSON.parse(String(row.sizes_json || "[]"));
  } catch {
    sizes = [];
  }

  return {
    id: String(row.id),
    name: String(row.name),
    code: String(row.code),
    priceLkr: Number(row.price_lkr),
    material: String(row.material || ""),
    description: String(row.description || ""),
    sizes,
    image: String(row.image_path),
    imagePosition: String(row.image_position || "center"),
    inStock: Boolean(row.in_stock)
  };
}

export async function listProducts() {
  const db = getDatabase();
  const result = await db.execute(`
    SELECT
      id, name, code, price_lkr, material, description, sizes_json,
      image_path, image_position, in_stock
    FROM products
    ORDER BY in_stock DESC, sort_order ASC, name ASC
  `);

  return result.rows.map(productFromRow);
}

export async function findProduct(id) {
  const db = getDatabase();
  const result = await db.execute({
    sql: `
      SELECT
        id, name, code, price_lkr, material, description, sizes_json,
        image_path, image_position, in_stock
      FROM products
      WHERE id = ?
      LIMIT 1
    `,
    args: [id]
  });

  return result.rows[0] ? productFromRow(result.rows[0]) : null;
}
