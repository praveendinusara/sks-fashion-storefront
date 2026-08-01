import { clearClientSessionCookie } from "../../lib/auth.js";
export default function handler(request, response) { if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" }); response.setHeader("Set-Cookie", clearClientSessionCookie()); response.status(200).json({ ok: true }); }
