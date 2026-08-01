import { authenticateClientCredentials, createClientSession, getClientAddress, loginIsRateLimited, recordLoginFailure, clearLoginFailures, requireSameOrigin } from "../../lib/auth.js";
function body(request) { try { return typeof request.body === "object" ? request.body : JSON.parse(request.body || "{}"); } catch { return {}; } }
export default function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
  if (!requireSameOrigin(request, response)) return;
  const address = getClientAddress(request); if (loginIsRateLimited(address)) return response.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
  const input = body(request); const username = String(input.username || "").trim();
  if (!authenticateClientCredentials(username, String(input.password || ""))) { recordLoginFailure(address); return response.status(401).json({ error: "Incorrect username or password." }); }
  clearLoginFailures(address); const created = createClientSession(username); response.setHeader("Set-Cookie", created.cookie);
  return response.status(200).json({ authenticated: true, username, csrfToken: created.session.csrfToken });
}
