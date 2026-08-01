import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { listProducts } from "../lib/database.js";

const requiredFiles = [
  "index.html",
  "assets/hero.png",
  "src/app.js",
  "src/styles.css",
  "api/products.js",
  "api/product-share.js",
  "api/click.js",
  "api/admin/sales.js",
  "admin/index.html",
  "admin/app.js",
  "google-sheets/Code.gs",
  "data/store.db",
  "vercel.json"
];

for (const file of requiredFiles) {
  await access(path.join(process.cwd(), file));
}

const heroStats = await stat(path.join(process.cwd(), "assets", "hero.png"));
if (heroStats.size < 100_000) {
  throw new Error("Hero asset appears incomplete.");
}

const index = await readFile(path.join(process.cwd(), "index.html"), "utf8");
if (!index.includes("94775043005")) {
  throw new Error("The approved WhatsApp number is missing from index.html.");
}

const products = await listProducts();
if (!products.length) {
  throw new Error("The product database is empty.");
}

console.log(`Project check passed with ${products.length} product(s).`);
