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

export function salesMetrics(salesLog = [], now = new Date()) {
  const stamp = now.getTime();
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startWeek = startDay - ((now.getDay() + 6) % 7) * 86400000;
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const aggregate = (from) => salesLog.filter((entry) => new Date(entry.saleDate || entry.createdAt).getTime() >= from).reduce((out, entry) => ({ units: out.units + Number(entry.quantity || 0), value: out.value + Number(entry.totalValue || 0) }), { units: 0, value: 0 });
  return { today: aggregate(startDay), week: aggregate(startWeek), month: aggregate(startMonth), lifetime: aggregate(0), generatedAt: new Date(stamp).toISOString() };
}

export function createSaleEntry({ product, quantity, date, notes, actor, size }) {
  const amount = Math.round(Number(quantity));
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000) {
    const error = new Error("Quantity must be between 1 and 10,000.");
    error.statusCode = 400;
    throw error;
  }
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))
    ? String(date)
    : new Date().toISOString().slice(0, 10);
  const sizes = (product.sizes || []).map((item) => typeof item === "string" ? { label: item, available: true } : item);
  const selectedSize = String(size || "").trim();
  if (sizes.length && (!selectedSize || !sizes.some((item) => item.available !== false && item.label === selectedSize))) {
    const error = new Error("Select an available size."); error.statusCode = 400; throw error;
  }
  const price = Number(product.priceLkr || 0);
  return {
    id: crypto.randomUUID(),
    date: parsedDate, saleDate: parsedDate,
    productId: product.id,
    productCode: product.code,
    productName: product.name,
    productCodeSnapshot: product.code, productNameSnapshot: product.name, priceSnapshot: price,
    imageUrlSnapshot: product.image || "", size: selectedSize, totalValue: price * amount,
    quantity: amount,
    enteredBy: actor,
    notes: String(notes || "").trim().slice(0, 500),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
}
