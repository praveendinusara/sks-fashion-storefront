import crypto from "node:crypto";
import { del, list, put } from "@vercel/blob";
import { listProducts } from "./database.js";

const STATE_PREFIX = "sks/state/";
const CURRENT_SCHEMA_VERSION = 2;
const DEFAULT_THEME = {
  primary: "#17181a",
  secondary: "#f7f5f2",
  accent: "#e32126",
  button: "#17181a",
  buttonText: "#ffffff",
  background: "#f7f5f2",
  header: "#f7f5f2",
  footer: "#17181a",
  text: "#17181a",
  link: "#e32126"
};
const DEFAULT_SETTINGS = {
  whatsappNumber: "94775043005",
  whatsappDisplay: "077 504 3005",
  facebook: "",
  instagram: "",
  tiktok: "",
  youtube: "",
  deliveryDetails: "Cash on delivery available. Islandwide delivery.",
  logoImage: "",
  logoWidth: 180,
  logoAlignment: "left",
  loadingAnimationEnabled: true,
  productCodePrefix: "SKS",
  heroImage: "/assets/hero.png",
  theme: DEFAULT_THEME,
  googleSheetUrl: ""
};

function blobIsConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function cleanHex(value, fallback) {
  const colour = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(colour) ? colour.toLowerCase() : fallback;
}

function normalizePrefix(value) {
  return String(value || "SKS").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "SKS";
}

function safeUrl(value, { allowRelative = false } = {}) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (allowRelative && url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function normalizedSettings(settings = {}) {
  const rawWhatsApp = String(settings.whatsappNumber || DEFAULT_SETTINGS.whatsappNumber)
    .replace(/\D/g, "");
  const rawTheme = settings.theme && typeof settings.theme === "object" ? settings.theme : {};
  const theme = Object.fromEntries(
    Object.entries(DEFAULT_THEME).map(([key, fallback]) => [key, cleanHex(rawTheme[key], fallback)])
  );

  const normalized = {
    ...DEFAULT_SETTINGS,
    ...Object.fromEntries(
      Object.entries(settings)
        .filter(([key]) => key !== "theme")
        .map(([key, value]) => [key, typeof value === "boolean" ? value : String(value ?? "").trim()])
    ),
    whatsappNumber: rawWhatsApp || DEFAULT_SETTINGS.whatsappNumber,
    loadingAnimationEnabled: settings.loadingAnimationEnabled !== false,
    logoWidth: Math.min(320, Math.max(60, Math.round(Number(settings.logoWidth) || 180))),
    logoAlignment: ["left", "center", "right"].includes(settings.logoAlignment)
      ? settings.logoAlignment
      : "left",
    productCodePrefix: normalizePrefix(settings.productCodePrefix),
    theme
  };
  for (const key of ["facebook", "instagram", "tiktok", "youtube", "googleSheetUrl"]) {
    normalized[key] = safeUrl(normalized[key]);
  }
  normalized.logoImage = safeUrl(normalized.logoImage, { allowRelative: true });
  normalized.heroImage = safeUrl(normalized.heroImage, { allowRelative: true }) || DEFAULT_SETTINGS.heroImage;
  return normalized;
}

function normalizeSize(size, index = 0) {
  if (typeof size === "string") {
    return { id: crypto.randomUUID(), label: size.trim(), available: true, order: index };
  }
  return {
    id: String(size?.id || crypto.randomUUID()),
    label: String(size?.label || "").trim(),
    available: size?.available !== false,
    order: Number.isFinite(Number(size?.order)) ? Math.round(Number(size.order)) : index
  };
}

function normalizeSizes(sizes) {
  const seen = new Set();
  return (Array.isArray(sizes) ? sizes : [])
    .map(normalizeSize)
    .filter((size) => {
      const key = size.label.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => left.order - right.order)
    .map((size, index) => ({ ...size, order: index }));
}

function normalizeMedia(product) {
  const source = product.media && typeof product.media === "object" ? product.media : {};
  const originalUrl = safeUrl(source.originalUrl || product.image || "/assets/hero.png", { allowRelative: true }) || "/assets/hero.png";
  return {
    originalUrl,
    aspectRatio: ["1:1", "4:5", "3:4", "original"].includes(source.aspectRatio)
      ? source.aspectRatio
      : "4:5",
    fit: source.fit === "contain" ? "contain" : "cover",
    zoom: Math.min(2.5, Math.max(0.5, Number(source.zoom) || 1)),
    offsetX: Math.min(100, Math.max(-100, Number(source.offsetX) || 0)),
    offsetY: Math.min(100, Math.max(-100, Number(source.offsetY) || 0)),
    rotation: Math.min(180, Math.max(-180, Number(source.rotation) || 0)),
    focalX: Math.min(100, Math.max(0, Number(source.focalX) || 50)),
    focalY: Math.min(100, Math.max(0, Number(source.focalY) || 50))
  };
}

function normalizeProduct(product, index = 0) {
  const media = normalizeMedia(product);
  return {
    id: String(product.id || ""),
    name: String(product.name || "").trim(),
    code: String(product.code || "").trim().toUpperCase(),
    priceLkr: Math.max(0, Math.round(Number(product.priceLkr) || 0)),
    material: String(product.material || "").trim(),
    description: String(product.description || "").trim(),
    sizes: normalizeSizes(product.sizes),
    image: media.originalUrl,
    imagePosition: String(product.imagePosition || "center").trim(),
    media,
    inStock: Boolean(product.inStock),
    status: ["draft", "published", "archived"].includes(product.status)
      ? product.status
      : "published",
    sortOrder: Number.isFinite(Number(product.sortOrder)) ? Math.round(Number(product.sortOrder)) : index,
    createdAt: String(product.createdAt || new Date().toISOString()),
    updatedAt: String(product.updatedAt || product.createdAt || new Date().toISOString())
  };
}

function nextSequence(products = [], suppliedSequence = 0) {
  const maximum = products.reduce((highest, product) => {
    const match = String(product.code || "").match(/-(\d+)$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return Math.max(maximum, Number(suppliedSequence) || 0);
}

export function migrateState(rawState = {}) {
  const settings = normalizedSettings(rawState.settings);
  const products = (Array.isArray(rawState.products) ? rawState.products : []).map(normalizeProduct);
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    codeSequence: nextSequence(products, rawState.codeSequence),
    products,
    settings,
    analytics: {
      clicksByProduct: rawState.analytics?.clicksByProduct || {},
      lastClickedAt: rawState.analytics?.lastClickedAt || {}
    },
    salesLog: Array.isArray(rawState.salesLog) ? rawState.salesLog : [],
    auditLog: Array.isArray(rawState.auditLog) ? rawState.auditLog.slice(-500) : [],
    sync: rawState.sync && typeof rawState.sync === "object" ? rawState.sync : {},
    updatedAt: String(rawState.updatedAt || new Date().toISOString())
  };
}

async function fallbackState() {
  const products = await listProducts();
  return migrateState({ products, settings: DEFAULT_SETTINGS });
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
    const response = await fetch(`${blobs[0].url}?v=${encodeURIComponent(blobs[0].uploadedAt)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`State blob returned ${response.status}`);
    return migrateState(await response.json());
  } catch (error) {
    console.error("Unable to read stored catalogue state", error);
    return fallbackState();
  }
}

export async function saveStoreState(state) {
  if (!blobIsConfigured()) throw new Error("Persistent storage is not configured.");
  const normalizedState = migrateState({ ...state, updatedAt: new Date().toISOString() });
  const version = `${Date.now()}-${crypto.randomBytes(5).toString("hex")}`;
  await put(`${STATE_PREFIX}catalog-${version}.json`, JSON.stringify(normalizedState), {
    access: "public",
    addRandomSuffix: false,
    cacheControlMaxAge: 60,
    contentType: "application/json"
  });
  const blobs = await listStateBlobs();
  const staleUrls = blobs.slice(8).map((blob) => blob.url);
  if (staleUrls.length) {
    try { await del(staleUrls); } catch (error) { console.error("Unable to clean up old catalogue state", error); }
  }
  return normalizedState;
}

export function allocateProductCode(state) {
  const prefix = normalizePrefix(state.settings?.productCodePrefix);
  const used = new Set((state.products || []).map((product) => String(product.code).toUpperCase()));
  let sequence = nextSequence(state.products, state.codeSequence);
  let code;
  do {
    sequence += 1;
    code = `${prefix}-${String(sequence).padStart(4, "0")}`;
  } while (used.has(code));
  state.codeSequence = sequence;
  return code;
}

export function validateProduct(input, existingProducts = [], currentId = "") {
  const product = normalizeProduct(input);
  const errors = [];
  if (!product.name) errors.push("Product name is required.");
  if (product.code && existingProducts.some(
    (item) => item.id !== currentId && String(item.code).toUpperCase() === product.code
  )) errors.push("That product code is already in use.");
  if (!product.priceLkr) errors.push("Price must be greater than zero.");
  if (!product.image) errors.push("Product image is required.");
  if (product.sizes.some((size) => !size.label)) errors.push("Every size needs a label.");
  if (errors.length) {
    const error = new Error(errors.join(" "));
    error.statusCode = 400;
    throw error;
  }
  return product;
}

export function createProductId(code) {
  const slug = String(code || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 52) || "product";
  return `${slug}-${crypto.randomBytes(4).toString("hex")}`;
}

export function addAuditEvent(state, event) {
  state.auditLog = [...(state.auditLog || []), {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    ...event
  }].slice(-500);
}

export { CURRENT_SCHEMA_VERSION, DEFAULT_SETTINGS, DEFAULT_THEME, normalizeProduct, normalizeSizes };
