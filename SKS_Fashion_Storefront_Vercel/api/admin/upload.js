import crypto from "node:crypto";
import { put } from "@vercel/blob";
import { requireAdmin, requireSameOrigin } from "../../lib/auth.js";

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

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }
  if (!requireAdmin(request, response)) return;
  if (!requireSameOrigin(request, response)) return;

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
    const filename = safeFilename(request.query.filename);
    const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${filename}`;
    const blob = await put(`sks/products/${uniqueName}`, request, {
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
    return response.status(500).json({ error: "Unable to upload this image." });
  }
}

