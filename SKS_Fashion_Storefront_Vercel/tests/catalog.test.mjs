import test from "node:test";
import assert from "node:assert/strict";
import { allocateProductCode, migrateState, normalizeSizes, validateProduct } from "../lib/catalog.js";

test("migrates legacy string sizes into independent structured sizes", () => {
  const state = migrateState({ products: [{ id: "p1", name: "Dress", code: "SKS-0007", priceLkr: 1000, sizes: ["M", "XL"], image: "/dress.webp", inStock: true }] });
  assert.deepEqual(state.products[0].sizes.map(({ label, available, order }) => ({ label, available, order })), [
    { label: "M", available: true, order: 0 },
    { label: "XL", available: true, order: 1 }
  ]);
  assert.equal(state.codeSequence, 7);
});

test("allocates unique monotonic product codes and never reuses old sequence", () => {
  const state = migrateState({ codeSequence: 9, settings: { productCodePrefix: "SKS" }, products: [{ id: "p1", name: "A", code: "SKS-0004", priceLkr: 1, image: "/a", sizes: [] }] });
  assert.equal(allocateProductCode(state), "SKS-0010");
  assert.equal(allocateProductCode(state), "SKS-0011");
});

test("deduplicates custom sizes without combining their selection state", () => {
  const sizes = normalizeSizes([{ label: "XL", available: true }, { label: "xl", available: false }, { label: "Free Size", available: true }]);
  assert.deepEqual(sizes.map((size) => size.label), ["XL", "Free Size"]);
});

test("allows products with no required size and rejects duplicate product codes", () => {
  const product = validateProduct({ name: "Accessory", code: "SKS-0012", priceLkr: 500, sizes: [], image: "/a.webp", inStock: true }, []);
  assert.equal(product.sizes.length, 0);
  assert.throws(() => validateProduct({ ...product }, [{ ...product, id: "other" }]), /already in use/);
});
