import { requireAdmin, requireSameOrigin } from "../../lib/auth.js";
import {
  createProductId,
  getStoreState,
  saveStoreState,
  validateProduct
} from "../../lib/catalog.js";

function requestBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  try {
    return JSON.parse(request.body || "{}");
  } catch {
    return {};
  }
}

export default async function handler(request, response) {
  const session = requireAdmin(request, response);
  if (!session) return;

  if (!["GET", "POST", "PUT", "DELETE"].includes(request.method)) {
    response.setHeader("Allow", "GET, POST, PUT, DELETE");
    return response.status(405).json({ error: "Method not allowed" });
  }
  if (request.method !== "GET" && !requireSameOrigin(request, response)) return;

  try {
    const state = await getStoreState();

    if (request.method === "GET") {
      return response.status(200).json({
        products: state.products,
        updatedAt: state.updatedAt
      });
    }

    const body = requestBody(request);

    if (request.method === "POST") {
      const product = validateProduct(body.product, state.products);
      product.id = createProductId(product.code);
      state.products.push(product);
      const saved = await saveStoreState(state);
      return response.status(201).json({ product, updatedAt: saved.updatedAt });
    }

    const id = String(body.id || "");
    const index = state.products.findIndex((product) => product.id === id);
    if (index === -1) {
      return response.status(404).json({ error: "Product not found" });
    }

    if (request.method === "PUT") {
      const product = validateProduct(body.product, state.products, id);
      product.id = id;
      state.products[index] = product;
      const saved = await saveStoreState(state);
      return response.status(200).json({ product, updatedAt: saved.updatedAt });
    }

    const [removedProduct] = state.products.splice(index, 1);
    const saved = await saveStoreState(state);
    return response.status(200).json({
      removedProduct,
      updatedAt: saved.updatedAt
    });
  } catch (error) {
    console.error("Unable to update products", error);
    return response.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Unable to save product changes."
    });
  }
}

