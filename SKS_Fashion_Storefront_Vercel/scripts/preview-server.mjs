import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findProduct, listProducts } from "../lib/database.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8"
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);

const formatLkr = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0
  }).format(value);

function send(response, status, contentType, body) {
  response.writeHead(status, { "Content-Type": contentType });
  response.end(body);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);

  try {
    if (url.pathname === "/api/products") {
      const products = await listProducts();
      return send(response, 200, mimeTypes[".json"], JSON.stringify({ products }));
    }

    if (url.pathname === "/api/product-share") {
      const product = await findProduct(url.searchParams.get("id") || "");
      if (!product) return send(response, 404, "text/plain; charset=utf-8", "Product not found");

      const productUrl = `${url.origin}/?product=${encodeURIComponent(product.id)}`;
      const imageUrl = new URL(product.image, url.origin).toString();
      const description = `${formatLkr(product.priceLkr)} | Sizes ${product.sizes.join(", ")}`;

      return send(response, 200, mimeTypes[".html"], `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta property="og:title" content="${escapeHtml(product.name)} | SKS">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(imageUrl)}">
<meta http-equiv="refresh" content="0;url=${escapeHtml(productUrl)}">
</head><body><a href="${escapeHtml(productUrl)}">Open product</a></body></html>`);
    }

    const requestPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
    const absolutePath = path.join(root, safePath);

    if (!absolutePath.startsWith(root)) {
      return send(response, 403, "text/plain; charset=utf-8", "Forbidden");
    }

    const content = await readFile(absolutePath);
    const contentType = mimeTypes[path.extname(absolutePath)] || "application/octet-stream";
    return send(response, 200, contentType, content);
  } catch {
    return send(response, 404, "text/plain; charset=utf-8", "Not found");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Preview server running at http://127.0.0.1:${port}`);
});
