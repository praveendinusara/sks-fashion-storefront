import { requireSalesClient } from "../../lib/auth.js";
export default function handler(request, response) { if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed" }); const session = requireSalesClient(request, response); if (session) response.status(200).json({ username: session.username, csrfToken: session.csrfToken }); }
