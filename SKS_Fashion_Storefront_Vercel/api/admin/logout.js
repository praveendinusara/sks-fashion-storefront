import { clearSessionCookie, requireAdmin, requireSameOrigin } from "../../lib/auth.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }
  if (!requireSameOrigin(request, response)) return;
  if (!requireAdmin(request, response)) return;

  response.setHeader("Set-Cookie", clearSessionCookie());
  return response.status(200).json({ authenticated: false });
}

