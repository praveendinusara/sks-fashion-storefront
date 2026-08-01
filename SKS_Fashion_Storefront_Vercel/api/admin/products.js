import { requireAdmin, requireCsrf, requireRole, requireSameOrigin } from "../../lib/auth.js";
import {
  addAuditEvent,
  allocateProductCode,
  createProductId,
  getStoreState,
  saveStoreState,
  validateProduct
} from "../../lib/catalog.js";
import { sendSheetsEvent } from "../../lib/google-sheets.js";

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
  if (request.method !== "GET" && !requireCsrf(request, response, session)) return;
  if (request.method !== "GET" && !requireRole(session, response, ["owner", "administrator"])) return;

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
      const generatedCode = allocateProductCode(state);
      const product = validateProduct({ ...body.product, code: generatedCode }, state.products);
      product.id = createProductId(product.code);
      product.createdAt = new Date().toISOString();
      product.updatedAt = product.createdAt;
      state.products.push(product);
      addAuditEvent(state, { action: "product.created", productId: product.id, productCode: product.code, actor: session.username });
      const saved = await saveStoreState(state);
      sendSheetsEvent("product_upsert", { code: product.code, name: product.name, status: product.status, createdAt: product.createdAt, updatedAt: product.updatedAt }).catch((error) => console.error("Google Sheets product sync failed", error));
      return response.status(201).json({ product, updatedAt: saved.updatedAt });
    }

    const id = String(body.id || "");
    const index = state.products.findIndex((product) => product.id === id);
    if (index === -1) {
      return response.status(404).json({ error: "Product not found" });
    }

    if (request.method === "PUT") {
      const current = state.products[index];
      const product = validateProduct({ ...body.product, code: current.code }, state.products, id);
      product.id = id;
      product.createdAt = current.createdAt;
      product.updatedAt = new Date().toISOString();
      state.products[index] = product;
      addAuditEvent(state, { action: "product.updated", productId: id, productCode: product.code, actor: session.username });
      const saved = await saveStoreState(state);
      sendSheetsEvent("product_upsert", { code: product.code, name: product.name, status: product.status, createdAt: product.createdAt, updatedAt: product.updatedAt }).catch((error) => console.error("Google Sheets product sync failed", error));
      return response.status(200).json({ product, updatedAt: saved.updatedAt });
    }

    const removedProduct = state.products[index];
    removedProduct.status = "archived";
    removedProduct.inStock = false;
    removedProduct.updatedAt = new Date().toISOString();
    addAuditEvent(state, { action: "product.archived", productId: id, productCode: removedProduct.code, actor: session.username });
    const saved = await saveStoreState(state);
    sendSheetsEvent("product_upsert", { code: removedProduct.code, name: removedProduct.name, status: "archived", createdAt: removedProduct.createdAt, updatedAt: removedProduct.updatedAt }).catch((error) => console.error("Google Sheets product sync failed", error));
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
