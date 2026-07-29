import crypto from "node:crypto";

const COOKIE_NAME = "sks_admin_session";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 8;
const loginAttempts = new Map();

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() || "";
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));

  if (leftBuffer.length !== rightBuffer.length) {
    crypto.timingSafeEqual(leftBuffer, leftBuffer);
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function signature(payload) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
}

function parseCookies(request) {
  const cookieHeader = request.headers.cookie || "";
  return cookieHeader.split(";").reduce((cookies, pair) => {
    const separator = pair.indexOf("=");
    if (separator === -1) return cookies;
    const key = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    cookies[key] = value;
    return cookies;
  }, {});
}

function sessionFromRequest(request) {
  const token = parseCookies(request)[COOKIE_NAME];
  if (!token || !getSecret()) return null;

  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return null;
  if (!safeEqual(signature(payload), suppliedSignature)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!session.username || Number(session.expiresAt) <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function createSessionCookie(username) {
  const payload = Buffer.from(JSON.stringify({
    username,
    expiresAt: Date.now() + SESSION_LIFETIME_SECONDS * 1000
  })).toString("base64url");
  const token = `${payload}.${signature(payload)}`;

  return [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${SESSION_LIFETIME_SECONDS}`
  ].join("; ");
}

export function clearSessionCookie() {
  return [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Max-Age=0"
  ].join("; ");
}

export function authenticateCredentials(username, password) {
  const expectedUsername = process.env.ADMIN_USERNAME?.trim() || "";
  const expectedPassword = process.env.ADMIN_PASSWORD || "";

  if (!expectedUsername || !expectedPassword || !getSecret()) return false;
  return safeEqual(username, expectedUsername) && safeEqual(password, expectedPassword);
}

export function requireAdmin(request, response) {
  const session = sessionFromRequest(request);

  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  response.setHeader("Pragma", "no-cache");

  if (!session) {
    response.status(401).json({ error: "Authentication required" });
    return null;
  }

  return session;
}

export function requireSameOrigin(request, response) {
  const origin = request.headers.origin;
  const forwardedHost = request.headers["x-forwarded-host"];
  const host = forwardedHost || request.headers.host;

  if (!origin || !host) return true;

  try {
    if (new URL(origin).host === host) return true;
  } catch {
    // Fall through to the rejection below.
  }

  response.status(403).json({ error: "Invalid request origin" });
  return false;
}

export function getClientAddress(request) {
  return String(request.headers["x-forwarded-for"] || request.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

export function loginIsRateLimited(address) {
  const now = Date.now();
  const record = loginAttempts.get(address);
  if (!record || now - record.startedAt > 15 * 60 * 1000) {
    loginAttempts.set(address, { startedAt: now, count: 0 });
    return false;
  }
  return record.count >= 8;
}

export function recordLoginFailure(address) {
  const now = Date.now();
  const record = loginAttempts.get(address);
  if (!record || now - record.startedAt > 15 * 60 * 1000) {
    loginAttempts.set(address, { startedAt: now, count: 1 });
    return;
  }
  record.count += 1;
}

export function clearLoginFailures(address) {
  loginAttempts.delete(address);
}

