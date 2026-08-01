import crypto from "node:crypto";
import { put } from "@vercel/blob";
import { requireAdmin, requireCsrf, requireRole, requireSameOrigin } from "../../lib/auth.js";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif"
]);

export const config = {
  api: {
    bodyParser: false
  }
};

function safeFilename(value) {
  return String(value || "product-image.webp")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "product-image.webp";
}

async function readLimitedBody(request, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) {
      const error = new Error("Image is too large. Use an image below 4 MB.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function matchesImageSignature(buffer, type) {
  if (buffer.length < 12) return false;
  if (type === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (type === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === "image/webp") return buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
  if (type === "image/avif") return buffer.subarray(4, 12).toString().includes("ftypavif") || buffer.subarray(4, 16).toString().includes("ftypavis");
  return false;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }
  const session = requireAdmin(request, response);
  if (!session) return;
  if (!requireSameOrigin(request, response)) return;
  if (!requireCsrf(request, response, session)) return;
  if (!requireRole(session, response, ["owner", "administrator"])) return;

  const contentType = String(request.headers["content-type"] || "").split(";")[0];
  if (!ALLOWED_TYPES.has(contentType)) {
    return response.status(415).json({
      error: "Upload a JPG, PNG, WebP or AVIF image."
    });
  }

  const contentLength = Number(request.headers["content-length"] || 0);
  if (contentLength > 4 * 1024 * 1024) {
    return response.status(413).json({
      error: "Image is too large. Use an image below 4 MB."
    });
  }

  try {
    const body = await readLimitedBody(request, 4 * 1024 * 1024);
    if (!matchesImageSignature(body, contentType)) {
      return response.status(415).json({ error: "The file contents do not match the selected image type." });
    }
    const filename = safeFilename(request.query.filename);
    const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${filename}`;
    const blob = await put(`sks/products/${uniqueName}`, body, {
      access: "public",
      addRandomSuffix: false,
      cacheControlMaxAge: 31536000,
      contentType
    });

    return response.status(201).json({
      url: blob.url,
      pathname: blob.pathname,
      contentType
    });
  } catch (error) {
    console.error("Unable to upload product image", error);
    return response.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "Unable to upload this image." });
  }
}
