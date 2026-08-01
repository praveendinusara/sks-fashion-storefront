import { requireAdmin, requireCsrf, requireRole, requireSameOrigin } from "../../lib/auth.js";
import { getStoreState, saveStoreState } from "../../lib/catalog.js";
import { sendSheetsEvent } from "../../lib/google-sheets.js";
import { buildSalesSummary } from "../../lib/sales.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }
  const session = requireAdmin(request, response);
  if (!session || !requireSameOrigin(request, response) || !requireCsrf(request, response, session)) return;
  if (!requireRole(session, response, ["owner", "administrator"])) return;
  const state = await getStoreState();
  try {
    await sendSheetsEvent("full_sync", {
      products: state.products.map(({ id, code, name, status, createdAt, updatedAt }) => ({ id, code, name, status, createdAt, updatedAt })),
      salesSummary: buildSalesSummary(state),
      salesLog: state.salesLog
    });
    state.sync = { lastSuccessAt: new Date().toISOString(), lastError: "" };
    await saveStoreState(state);
    return response.status(200).json({ sync: state.sync });
  } catch (error) {
    state.sync = { ...state.sync, lastError: error.message, lastErrorAt: new Date().toISOString() };
    await saveStoreState(state);
    return response.status(502).json({ error: "Google Sheets synchronisation failed.", sync: state.sync });
  }
}
