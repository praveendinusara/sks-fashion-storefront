export function normalizeWhatsAppNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

export function formatLkr(value) {
  return `LKR ${new Intl.NumberFormat("en-LK", {
    maximumFractionDigits: 0
  }).format(Number(value) || 0)}`;
}

export function buildOrderMessage({ product, size }) {
  const lines = [
    "Hello SKS, I would like to order this item.",
    "",
    `Product Name: ${product.name}`,
    `Product Code: ${product.code}`,
    `Size: ${size}`,
    `Price: ${formatLkr(product.priceLkr)}`,
    "",
    "Please confirm availability and delivery details."
  ];

  return lines.join("\n");
}

export function buildWhatsAppUrl({ phoneNumber, message }) {
  const normalizedNumber = normalizeWhatsAppNumber(phoneNumber);
  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
}
