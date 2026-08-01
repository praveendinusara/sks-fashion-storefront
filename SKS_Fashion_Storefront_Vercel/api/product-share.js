import { findProduct } from "../lib/database.js";

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

function originFromRequest(request) {
  const protocol = request.headers["x-forwarded-proto"] || "https";
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  return `${protocol}://${host}`;
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).send("Method not allowed");
  }

  try {
    const id = String(request.query?.id || "");
    const product = await findProduct(id);

    if (!product) {
      return response.status(404).send("Product not found");
    }

    const origin = originFromRequest(request);
    const productUrl = `${origin}/?product=${encodeURIComponent(product.id)}`;
    const imageUrl = new URL(product.image, origin).toString();
    const title = `${product.name} | SKS`;
    const description = `${formatLkr(product.priceLkr)} | Sizes ${product.sizes.map((size) => typeof size === "string" ? size : size.label).join(", ")} | Cash on delivery and islandwide delivery available.`;

    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
    return response.status(200).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="Sarath Kumara Sons">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(productUrl)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:alt" content="${escapeHtml(product.name)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <link rel="canonical" href="${escapeHtml(productUrl)}">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(productUrl)}">
</head>
<body>
  <p>Opening <a href="${escapeHtml(productUrl)}">${escapeHtml(product.name)}</a>...</p>
</body>
</html>`);
  } catch (error) {
    console.error("Unable to create product card", error);
    return response.status(500).send("Product card is temporarily unavailable");
  }
}
