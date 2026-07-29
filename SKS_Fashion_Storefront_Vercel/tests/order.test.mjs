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

test("includes only the requested product order details", () => {
  const message = buildOrderMessage({
    product,
    size: "2XL"
  });

  assert.match(message, /Size: 2XL/);
  assert.match(message, /Price: LKR 3,495/);
  assert.match(message, /Product Name: Italian Cotton Long Frock/);
  assert.match(message, /Product Code: NRT-LF-001/);
  assert.match(message, /Please confirm availability and delivery details/);
  assert.doesNotMatch(message, /Product card/i);
  assert.doesNotMatch(message, /https?:\/\//i);
});

test("builds a direct click-to-chat URL", () => {
  const url = buildWhatsAppUrl({
    phoneNumber: "94775043005",
    message: "Test order"
  });

  assert.equal(url, "https://wa.me/94775043005?text=Test%20order");
});
