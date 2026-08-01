const PRODUCTS = 'Products';
const SUMMARY = 'Sales Summary';
const LOG = 'Daily Sales Log';

function setupSksWorkbook() {
  const ss = SpreadsheetApp.getActive();
  const definitions = {
    [PRODUCTS]: ['Product Code', 'Product Name', 'Status', 'Date Added', 'Last Updated'],
    [SUMMARY]: ['Product Code', 'Product Name', 'Buy Now Clicks', 'Confirmed Quantity Sold', 'Last Sale Date', 'Last Updated'],
    [LOG]: ['Date', 'Product Code', 'Product Name', 'Quantity Sold', 'Entered By', 'Notes', 'Timestamp']
  };
  Object.entries(definitions).forEach(([name, headers]) => {
    const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  });
  const products = ss.getSheetByName(PRODUCTS);
  const summary = ss.getSheetByName(SUMMARY);
  products.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(p => p.remove());
  summary.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(p => p.remove());
  products.protect().setDescription('Managed automatically by the SKS website');
  summary.getRange('A:C').protect().setDescription('Managed automatically by the SKS website');
  summary.getRange('F:F').protect().setDescription('Managed automatically by the SKS website');
}

function doPost(event) {
  try {
    const body = JSON.parse(event.postData.contents || '{}');
    const secret = PropertiesService.getScriptProperties().getProperty('SKS_WEBHOOK_SECRET');
    if (!secret || body.secret !== secret) return json_({ ok: false, error: 'Unauthorized' });
    if (body.type === 'full_sync') fullSync_(body.payload);
    if (body.type === 'buy_now_click') upsertSummary_(body.payload);
    if (body.type === 'confirmed_sale') appendSale_(body.payload);
    if (body.type === 'product_upsert') upsertProduct_(body.payload);
    return json_({ ok: true, type: body.type });
  } catch (error) {
    console.error(error);
    return json_({ ok: false, error: String(error.message || error) });
  }
}

function upsertProduct_(product) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(PRODUCTS);
  const row = findCodeRow_(sheet, product.code) || sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, 5).setValues([[product.code, product.name, product.status, product.createdAt, product.updatedAt]]);
}

function fullSync_(payload) {
  const ss = SpreadsheetApp.getActive();
  const products = ss.getSheetByName(PRODUCTS);
  const summary = ss.getSheetByName(SUMMARY);
  products.getRange(2, 1, Math.max(products.getMaxRows() - 1, 1), 5).clearContent();
  summary.getRange(2, 1, Math.max(summary.getMaxRows() - 1, 1), 6).clearContent();
  if (payload.products.length) products.getRange(2, 1, payload.products.length, 5).setValues(payload.products.map(p => [p.code, p.name, p.status, p.createdAt, p.updatedAt]));
  if (payload.salesSummary.length) summary.getRange(2, 1, payload.salesSummary.length, 6).setValues(payload.salesSummary.map(r => [r.productCode, r.productName, r.buyNowClicks, r.confirmedQuantitySold, r.lastSaleDate, new Date()]));
}

function upsertSummary_(payload) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SUMMARY);
  const row = findCodeRow_(sheet, payload.productCode) || sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, 6).setValues([[payload.productCode, payload.productName, Number(payload.count || 0), sheet.getRange(row, 4).getValue() || 0, sheet.getRange(row, 5).getValue() || '', new Date()]]);
}

function appendSale_(entry) {
  const ss = SpreadsheetApp.getActive();
  ss.getSheetByName(LOG).appendRow([entry.date, entry.productCode, entry.productName, entry.quantity, entry.enteredBy, entry.notes, entry.createdAt]);
  const summary = ss.getSheetByName(SUMMARY);
  const row = findCodeRow_(summary, entry.productCode) || summary.getLastRow() + 1;
  const current = Number(summary.getRange(row, 4).getValue() || 0);
  summary.getRange(row, 1, 1, 6).setValues([[entry.productCode, entry.productName, Number(summary.getRange(row, 3).getValue() || 0), current + Number(entry.quantity), entry.date, new Date()]]);
}

function findCodeRow_(sheet, code) {
  if (sheet.getLastRow() < 2) return 0;
  const match = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder(code).matchEntireCell(true).findNext();
  return match ? match.getRow() : 0;
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
