import { requireAdmin, requireSameOrigin } from "../../lib/auth.js";
import { getStoreState, saveStoreState } from "../../lib/catalog.js";

function requestBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  try {
    return JSON.parse(request.body || "{}");
  } catch {
    return {};
  }
}

export default async function handler(request, response) {
  if (!requireAdmin(request, response)) return;

  if (!["GET", "PUT"].includes(request.method)) {
    response.setHeader("Allow", "GET, PUT");
    return response.status(405).json({ error: "Method not allowed" });
  }
  if (request.method === "PUT" && !requireSameOrigin(request, response)) return;

  try {
    const state = await getStoreState();

    if (request.method === "GET") {
      return response.status(200).json({
        settings: state.settings,
        updatedAt: state.updatedAt
      });
    }

    const body = requestBody(request);
    state.settings = {
      ...state.settings,
      ...body.settings
    };
    const saved = await saveStoreState(state);
    return response.status(200).json({
      settings: saved.settings,
      updatedAt: saved.updatedAt
    });
  } catch (error) {
    console.error("Unable to update settings", error);
    return response.status(500).json({ error: "Unable to save site settings." });
  }
}

