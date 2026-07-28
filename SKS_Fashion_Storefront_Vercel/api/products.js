import { listProducts } from "../lib/database.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const products = await listProducts();
    response.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return response.status(200).json({ products });
  } catch (error) {
    console.error("Unable to load products", error);
    return response.status(500).json({ error: "Products are temporarily unavailable" });
  }
}
