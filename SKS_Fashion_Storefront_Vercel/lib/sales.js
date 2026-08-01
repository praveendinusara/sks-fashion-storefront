import crypto from "node:crypto";

export function buildSalesSummary(state) {
  const soldByCode = (state.salesLog || []).reduce((totals, entry) => {
    totals[entry.productCode] = (totals[entry.productCode] || 0) + Number(entry.quantity || 0);
    return totals;
  }, {});
  return (state.products || []).map((product) => ({
    productId: product.id,
    productCode: product.code,
    productName: product.name,
    status: product.status,
    buyNowClicks: Number(state.analytics?.clicksByProduct?.[product.id] || 0),
    confirmedQuantitySold: Number(soldByCode[product.code] || 0),
    lastClickedAt: state.analytics?.lastClickedAt?.[product.id] || "",
    lastSaleDate: (state.salesLog || [])
      .filter((entry) => entry.productCode === product.code)
      .map((entry) => entry.date)
      .sort()
      .at(-1) || ""
  }));
}

export function createSaleEntry({ product, quantity, date, notes, actor }) {
  const amount = Math.round(Number(quantity));
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000) {
    const error = new Error("Quantity must be between 1 and 10,000.");
    error.statusCode = 400;
    throw error;
  }
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))
    ? String(date)
    : new Date().toISOString().slice(0, 10);
  return {
    id: crypto.randomUUID(),
    date: parsedDate,
    productCode: product.code,
    productName: product.name,
    quantity: amount,
    enteredBy: actor,
    notes: String(notes || "").trim().slice(0, 500),
    createdAt: new Date().toISOString()
  };
}
