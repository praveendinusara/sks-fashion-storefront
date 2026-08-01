import test from "node:test";
import assert from "node:assert/strict";
import { buildSalesSummary, createSaleEntry } from "../lib/sales.js";

test("keeps Buy Now clicks separate from confirmed sales", () => {
  const state = {
    products: [{ id: "p1", code: "SKS-0001", name: "Dress", status: "published" }],
    analytics: { clicksByProduct: { p1: 8 }, lastClickedAt: {} },
    salesLog: [{ productCode: "SKS-0001", quantity: 2, date: "2026-08-01" }]
  };
  assert.deepEqual(buildSalesSummary(state)[0], {
    productId: "p1", productCode: "SKS-0001", productName: "Dress", status: "published",
    buyNowClicks: 8, confirmedQuantitySold: 2, lastClickedAt: "", lastSaleDate: "2026-08-01"
  });
});

test("validates confirmed sale quantities", () => {
  assert.throws(() => createSaleEntry({ product: { code: "SKS-1", name: "Dress" }, quantity: 0, actor: "owner" }), /Quantity/);
});
