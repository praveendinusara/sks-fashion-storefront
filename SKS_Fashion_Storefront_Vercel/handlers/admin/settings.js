import { requireAdmin, requireCsrf, requireRole, requireSameOrigin } from "../../lib/auth.js";
import { addAuditEvent, getStoreState, saveStoreState } from "../../lib/catalog.js";

function requestBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  try {
    return JSON.parse(request.body || "{}");
  } catch {
    return {};
  }
}

export default async function handler(request, response) {
  const session = requireAdmin(request, response);
  if (!session) return;

  if (!["GET", "PUT"].includes(request.method)) {
    response.setHeader("Allow", "GET, PUT");
    return response.status(405).json({ error: "Method not allowed" });
  }
  if (request.method === "PUT" && !requireSameOrigin(request, response)) return;
  if (request.method === "PUT" && !requireCsrf(request, response, session)) return;
  if (request.method === "PUT" && !requireRole(session, response, ["owner", "administrator"])) return;

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
    addAuditEvent(state, { action: "settings.updated", actor: session.username });
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
