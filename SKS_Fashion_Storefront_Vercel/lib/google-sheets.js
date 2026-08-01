export function sheetsConfigured() {
  return Boolean(process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim());
}

export async function sendSheetsEvent(type, payload) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
  if (!url) return { configured: false, ok: false };
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: process.env.GOOGLE_SHEETS_WEBHOOK_SECRET || "",
          type,
          payload,
          sentAt: new Date().toISOString()
        })
      });
      if (!response.ok) throw new Error(`Google Sheets endpoint returned ${response.status}`);
      const result = await response.json().catch(() => ({}));
      return { configured: true, ok: true, result };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }
  throw lastError;
}
