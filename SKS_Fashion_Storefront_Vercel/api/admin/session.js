import { requireAdmin } from "../../lib/auth.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const session = requireAdmin(request, response);
  if (!session) return;
  return response.status(200).json({
    authenticated: true,
    username: session.username
  });
}

