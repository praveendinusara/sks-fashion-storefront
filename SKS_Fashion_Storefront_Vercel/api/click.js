import { getStoreState, saveStoreState } from "../lib/catalog.js";
import { sendSheetsEvent } from "../lib/google-sheets.js";

function requestBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  try { return JSON.parse(request.body || "{}"); } catch { return {}; }
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }
  try {
    const id = String(requestBody(request).productId || "");
    const state = await getStoreState();
    const product = state.products.find((item) => item.id === id && item.status === "published");
    if (!product) return response.status(404).json({ error: "Product not found" });
    state.analytics.clicksByProduct[id] = Number(state.analytics.clicksByProduct[id] || 0) + 1;
    state.analytics.lastClickedAt[id] = new Date().toISOString();
    const saved = await saveStoreState(state);
    sendSheetsEvent("buy_now_click", {
      productCode: product.code,
      productName: product.name,
      count: saved.analytics.clicksByProduct[id]
    }).catch((error) => console.error("Google Sheets click sync failed", error));
    return response.status(200).json({ recorded: true });
  } catch (error) {
    console.error("Unable to record click", error);
    return response.status(500).json({ error: "Unable to record click" });
  }
}
