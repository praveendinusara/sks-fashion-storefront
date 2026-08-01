import {
  authenticateCredentials,
  clearLoginFailures,
  createSession,
  getClientAddress,
  loginIsRateLimited,
  recordLoginFailure,
  requireSameOrigin
} from "../../lib/auth.js";

function requestBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  try {
    return JSON.parse(request.body || "{}");
  } catch {
    return {};
  }
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }
  if (!requireSameOrigin(request, response)) return;

  const address = getClientAddress(request);
  if (loginIsRateLimited(address)) {
    return response.status(429).json({
      error: "Too many login attempts. Please wait 15 minutes and try again."
    });
  }

  const body = requestBody(request);
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!authenticateCredentials(username, password)) {
    recordLoginFailure(address);
    return response.status(401).json({ error: "Incorrect username or password." });
  }

  clearLoginFailures(address);
  const created = createSession(username);
  response.setHeader("Set-Cookie", created.cookie);
  return response.status(200).json({
    authenticated: true,
    username,
    role: created.session.role,
    csrfToken: created.session.csrfToken
  });
}
