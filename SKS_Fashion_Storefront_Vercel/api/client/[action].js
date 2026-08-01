// One dynamic client entry point preserves /api/client/* URLs and reduces
// four Vercel functions to one for the Hobby plan.
import login from "../../handlers/client/login.js";
import logout from "../../handlers/client/logout.js";
import sales from "../../handlers/client/sales.js";
import session from "../../handlers/client/session.js";

const handlers = { login, logout, sales, session };

export const config = { api: { bodyParser: false } };

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) return;
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  request.body = Buffer.concat(chunks).toString("utf8");
}

export default async function handler(request, response) {
  const action = String(request.query?.action || "");
  const selected = handlers[action];
  if (!selected) return response.status(404).json({ error: "Endpoint not found" });
  if (request.method !== "GET" && request.method !== "HEAD") await readJsonBody(request);
  return selected(request, response);
}
