import { requireAdmin, requireCsrf, requireRole, requireSameOrigin } from "../../lib/auth.js";
import { addAuditEvent, getStoreState, saveStoreState } from "../../lib/catalog.js";
import { sendSheetsEvent, sheetsConfigured } from "../../lib/google-sheets.js";
import { buildSalesSummary, createSaleEntry } from "../../lib/sales.js";

function requestBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  try { return JSON.parse(request.body || "{}"); } catch { return {}; }
}

export default async function handler(request, response) {
  const session = requireAdmin(request, response);
  if (!session) return;
  if (!["GET", "POST", "DELETE"].includes(request.method)) {
    response.setHeader("Allow", "GET, POST, DELETE");
    return response.status(405).json({ error: "Method not allowed" });
  }
  if (request.method !== "GET") {
    if (!requireSameOrigin(request, response) || !requireCsrf(request, response, session)) return;
    if (!requireRole(session, response, ["owner", "administrator", "sales_viewer"])) return;
  }
  try {
    const state = await getStoreState();
    if (request.method === "POST") {
      const body = requestBody(request);
      const product = state.products.find((item) => item.code === String(body.productCode || ""));
      if (!product) return response.status(404).json({ error: "Product not found" });
      const entry = createSaleEntry({ ...body, product, actor: session.username });
      state.salesLog.push(entry);
      addAuditEvent(state, { action: "sale.created", saleId: entry.id, productCode: entry.productCode, actor: session.username });
      const saved = await saveStoreState(state);
      try {
        await sendSheetsEvent("confirmed_sale", entry);
        saved.sync = { ...saved.sync, lastSuccessAt: new Date().toISOString(), lastError: "" };
      } catch (error) {
        saved.sync = { ...saved.sync, lastError: error.message, lastErrorAt: new Date().toISOString() };
      }
      await saveStoreState(saved);
      return response.status(201).json({ entry, summary: buildSalesSummary(saved), sync: saved.sync });
    }
    if (request.method === "DELETE") {
      if (!requireRole(session, response, ["owner"])) return;
      const id = String(requestBody(request).id || "");
      const index = state.salesLog.findIndex((entry) => entry.id === id);
      if (index === -1) return response.status(404).json({ error: "Sales entry not found" });
      const [removed] = state.salesLog.splice(index, 1);
      addAuditEvent(state, { action: "sale.deleted", saleId: id, actor: session.username });
      const saved = await saveStoreState(state);
      return response.status(200).json({ removed, summary: buildSalesSummary(saved) });
    }
    return response.status(200).json({
      summary: buildSalesSummary(state),
      salesLog: state.salesLog.slice().reverse().slice(0, 200),
      sync: state.sync,
      sheetsConfigured: sheetsConfigured(),
      googleSheetUrl: state.settings.googleSheetUrl || ""
    });
  } catch (error) {
    console.error("Unable to manage sales", error);
    return response.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "Unable to manage sales." });
  }
}
