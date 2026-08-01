import { clearSessionCookie, requireAdmin, requireCsrf, requireSameOrigin } from "../../lib/auth.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }
  if (!requireSameOrigin(request, response)) return;
  const session = requireAdmin(request, response);
  if (!session || !requireCsrf(request, response, session)) return;

  response.setHeader("Set-Cookie", clearSessionCookie());
  return response.status(200).json({ authenticated: false });
}
