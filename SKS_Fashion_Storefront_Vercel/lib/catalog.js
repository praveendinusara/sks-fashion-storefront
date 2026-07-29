import crypto from "node:crypto";
import { del, list, put } from "@vercel/blob";
import { listProducts } from "./database.js";

const STATE_PREFIX = "sks/state/";
const DEFAULT_SETTINGS = {
  whatsappNumber: "94775043005",
  whatsappDisplay: "077 504 3005",
  facebook: "",
  instagram: "",
  tiktok: "",
  youtube: "",
  deliveryDetails: "Cash on delivery available. Islandwide delivery.",
  logoImage: "",
  heroImage: "/assets/hero.png"
};

function blobIsConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function normalizedSettings(settings = {}) {
  const rawWhatsApp = String(settings.whatsappNumber || DEFAULT_SETTINGS.whatsappNumber)
    .replace(/\D/g, "");

  return {
    ...DEFAULT_SETTINGS,
    ...Object.fromEntries(
      Object.entries(settings).map(([key, value]) => [key, String(value || "").trim()])
    ),
    whatsappNumber: rawWhatsApp || DEFAULT_SETTINGS.whatsappNumber
  };
}

function normalizeProduct(product, index = 0) {
  return {
    id: String(product.id || ""),
    name: String(product.name || "").trim(),
    code: String(product.code || "").trim().toUpperCase(),
    priceLkr: Math.max(0, Math.round(Number(product.priceLkr) || 0)),
    material: String(product.material || "").trim(),
    description: String(product.description || "").trim(),
    sizes: Array.from(new Set(
      (Array.isArray(product.sizes) ? product.sizes : [])
        .map((size) => String(size).trim())
        .filter(Boolean)
    )),
    image: String(product.image || "/assets/hero.png").trim(),
    imagePosition: String(product.imagePosition || "center").trim(),
    inStock: Boolean(product.inStock),
    sortOrder: Number.isFinite(Number(product.sortOrder))
      ? Math.round(Number(product.sortOrder))
      : index
  };
}

async function fallbackState() {
  const products = await listProducts();
  return {
    products: products.map(normalizeProduct),
    settings: { ...DEFAULT_SETTINGS },
    updatedAt: new Date().toISOString()
  };
}

async function listStateBlobs() {
  if (!blobIsConfigured()) return [];
  const result = await list({ prefix: STATE_PREFIX, limit: 100 });
  return result.blobs.sort(
    (left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime()
  );
}

export async function getStoreState() {
  const blobs = await listStateBlobs();
  if (!blobs.length) return fallbackState();

  try {
    const response = await fetch(`${blobs[0].url}?v=${encodeURIComponent(blobs[0].uploadedAt)}`, {
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`State blob returned ${response.status}`);
    const state = await response.json();

    return {
      products: Array.isArray(state.products)
        ? state.products.map(normalizeProduct)
        : [],
      settings: normalizedSettings(state.settings),
      updatedAt: String(state.updatedAt || blobs[0].uploadedAt)
    };
  } catch (error) {
    console.error("Unable to read stored catalogue state", error);
    return fallbackState();
  }
}

export async function saveStoreState(state) {
  if (!blobIsConfigured()) {
    throw new Error("Persistent storage is not configured.");
  }

  const normalizedState = {
    products: (Array.isArray(state.products) ? state.products : []).map(normalizeProduct),
    settings: normalizedSettings(state.settings),
    updatedAt: new Date().toISOString()
  };
  const version = `${Date.now()}-${crypto.randomBytes(5).toString("hex")}`;

  await put(
    `${STATE_PREFIX}catalog-${version}.json`,
    JSON.stringify(normalizedState),
    {
      access: "public",
      addRandomSuffix: false,
      cacheControlMaxAge: 60,
      contentType: "application/json"
    }
  );

  const blobs = await listStateBlobs();
  const staleUrls = blobs.slice(4).map((blob) => blob.url);
  if (staleUrls.length) {
    try {
      await del(staleUrls);
    } catch (error) {
      console.error("Unable to clean up old catalogue state", error);
    }
  }

  return normalizedState;
}

export function validateProduct(input, existingProducts = [], currentId = "") {
  const product = normalizeProduct(input);
  const errors = [];

  if (!product.name) errors.push("Product name is required.");
  if (!product.code) errors.push("Product code is required.");
  if (!product.priceLkr) errors.push("Price must be greater than zero.");
  if (!product.sizes.length) errors.push("Add at least one size.");
  if (!product.image) errors.push("Product image is required.");

  const duplicateCode = existingProducts.some(
    (item) => item.id !== currentId && String(item.code).toUpperCase() === product.code
  );
  if (duplicateCode) errors.push("That product code is already in use.");

  if (errors.length) {
    const error = new Error(errors.join(" "));
    error.statusCode = 400;
    throw error;
  }

  return product;
}

export function createProductId(code) {
  const slug = String(code || "product")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 52) || "product";

  return `${slug}-${crypto.randomBytes(4).toString("hex")}`;
}

export { DEFAULT_SETTINGS };
