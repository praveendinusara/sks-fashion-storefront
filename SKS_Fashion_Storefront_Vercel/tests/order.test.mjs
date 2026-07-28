import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOrderMessage,
  buildWhatsAppUrl,
  normalizeWhatsAppNumber
} from "../src/order.js";

const product = {
  name: "Italian Cotton Long Frock",
  code: "NRT-LF-001",
  priceLkr: 3495
};

test("normalizes the Sri Lankan WhatsApp number", () => {
  assert.equal(normalizeWhatsAppNumber("+94 77 504 3005"), "94775043005");
});

test("includes the selected size, price, code and product card", () => {
  const message = buildOrderMessage({
    product,
    size: "2XL",
    productCardUrl: "https://example.com/api/product-share?id=italian-cotton-long-frock"
  });

  assert.match(message, /Size: 2XL/);
  assert.match(message, /Price: LKR 3,495/);
  assert.match(message, /Code: NRT-LF-001/);
  assert.match(message, /Product card: https:\/\/example\.com/);
});

test("builds a direct click-to-chat URL", () => {
  const url = buildWhatsAppUrl({
    phoneNumber: "94775043005",
    message: "Test order"
  });

  assert.equal(url, "https://wa.me/94775043005?text=Test%20order");
});
