// One dynamic admin entry point keeps the project below Vercel Hobby's
// serverless-function limit while preserving the existing /api/admin/* URLs.
import login from "../../handlers/admin/login.js";
import logout from "../../handlers/admin/logout.js";
import products from "../../handlers/admin/products.js";
import sales from "../../handlers/admin/sales.js";
import session from "../../handlers/admin/session.js";
import settings from "../../handlers/admin/settings.js";
import sync from "../../handlers/admin/sync.js";
import upload from "../../handlers/admin/upload.js";

const handlers = { login, logout, products, sales, session, settings, sync, upload };

export const config = { api: { bodyParser: false } };

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) return;
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  request.body = Buffer.concat(chunks).toString("utf8");
}

export default async function handler(request, response) {
  const action = String(request.query?.action || "");
  const selected = handlers[action];
  if (!selected) return response.status(404).json({ error: "Endpoint not found" });

  // Image upload validates and reads the raw stream itself. Every other
  // endpoint receives its JSON request body exactly as it did before.
  if (action !== "upload" && request.method !== "GET" && request.method !== "HEAD") {
    await readJsonBody(request);
  }
  return selected(request, response);
}
