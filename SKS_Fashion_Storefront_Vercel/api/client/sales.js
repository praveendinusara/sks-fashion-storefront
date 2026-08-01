import { requireCsrf, requireSameOrigin, requireSalesClient } from "../../lib/auth.js";
import { getStoreState, saveStoreState, addAuditEvent } from "../../lib/catalog.js";
import { createSaleEntry } from "../../lib/sales.js";
import { sendSheetsEvent } from "../../lib/google-sheets.js";
function body(request) { try { return typeof request.body === "object" ? request.body : JSON.parse(request.body || "{}"); } catch { return {}; } }
export default async function handler(request, response) {
  const session = requireSalesClient(request, response); if (!session) return;
  if (!["GET", "POST"].includes(request.method)) return response.status(405).json({ error: "Method not allowed" });
  if (request.method === "POST" && (!requireSameOrigin(request, response) || !requireCsrf(request, response, session))) return;
  try {
    const state = await getStoreState();
    if (request.method === "GET") {
      const products = state.products.filter((item) => item.status === "published" && item.inStock);
      const recent = state.salesLog.filter((entry) => entry.enteredBy === session.username).slice(-20).reverse();
      return response.status(200).json({ products, recent });
    }
    const input = body(request); const product = state.products.find((item) => item.id === String(input.productId || ""));
    if (!product || product.status !== "published" || !product.inStock) return response.status(404).json({ error: "This product is unavailable." });
    const entry = createSaleEntry({ ...input, product, actor: session.username });
    state.salesLog.push(entry); addAuditEvent(state, { action: "sale.client_created", saleId: entry.id, productId: product.id, actor: session.username });
    const saved = await saveStoreState(state);
    try { await sendSheetsEvent("sale_recorded", entry); } catch (error) { saved.sync = { ...saved.sync, lastError: error.message, lastErrorAt: new Date().toISOString() }; await saveStoreState(saved); }
    return response.status(201).json({ entry, message: `Sale recorded successfully. ${entry.productCode}, ${entry.size || "no size"}, quantity ${entry.quantity}.` });
  } catch (error) { return response.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "Unable to save the sale." }); }
}
