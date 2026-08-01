const DEFAULT_THEME = { primary: "#17181a", secondary: "#f7f5f2", accent: "#e32126", button: "#17181a", buttonText: "#ffffff", background: "#f7f5f2", header: "#f7f5f2", footer: "#17181a", text: "#17181a", link: "#e32126" };
const state = { products: [], settings: {}, sales: [], editingId: null, editingSizes: [], csrfToken: "", activePanel: "productsPanel" };
const $ = (selector) => document.querySelector(selector);
const loginView = $("#loginView");
const dashboard = $("#dashboard");
const loginForm = $("#loginForm");
const productForm = $("#productForm");
const productDialog = $("#productDialog");
const productList = $("#productList");
const settingsForm = $("#settingsForm");
const salesForm = $("#salesForm");
const productImagePreview = $("#productImagePreview");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

function formatLkr(value) {
  return `LKR ${new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 }).format(Number(value) || 0)}`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body && !(options.body instanceof Blob) ? { "Content-Type": "application/json" } : {}),
      ...(state.csrfToken && options.method && options.method !== "GET" ? { "X-CSRF-Token": state.csrfToken } : {}),
      ...options.headers
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed with ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

function setBusy(form, busy, label = "Saving...") {
  const button = form.querySelector('button[type="submit"]');
  if (!button) return;
  button.dataset.label ||= button.textContent;
  button.disabled = busy;
  button.textContent = busy ? label : button.dataset.label;
}

function toast(message) {
  const element = $("#adminToast");
  element.textContent = message;
  element.classList.add("is-visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("is-visible"), 3200);
}

function setUpdatedAt(value) {
  const date = new Date(value);
  $("#saveStatus").textContent = Number.isNaN(date.getTime()) ? "Saved" : `Last saved ${date.toLocaleString("en-LK", { dateStyle: "medium", timeStyle: "short" })}`;
}

function showLogin() { loginView.hidden = false; dashboard.hidden = true; }
function showDashboard() { loginView.hidden = true; dashboard.hidden = false; }

async function checkSession() {
  try {
    const session = await api("/api/admin/session");
    state.csrfToken = session.csrfToken;
    showDashboard();
    await loadAdminData();
  } catch { showLogin(); }
}

async function loadAdminData() {
  const [products, settings, sales] = await Promise.all([
    api("/api/admin/products"), api("/api/admin/settings"), api("/api/admin/sales")
  ]);
  state.products = products.products || [];
  state.settings = settings.settings || {};
  state.sales = sales.summary || [];
  state.salesPayload = sales;
  renderProducts();
  populateSettings();
  renderSales();
  setUpdatedAt(products.updatedAt || settings.updatedAt);
}

function sizeLabel(size) { return typeof size === "string" ? size : size.label; }

function renderProducts() {
  const term = $("#adminSearch").value.trim().toLowerCase();
  const products = state.products.filter((product) => !term || `${product.name} ${product.code}`.toLowerCase().includes(term));
  $("#totalProducts").textContent = state.products.length;
  $("#inStockProducts").textContent = state.products.filter((product) => product.inStock).length;
  $("#soldOutProducts").textContent = state.products.filter((product) => !product.inStock).length;
  productList.innerHTML = products.map((product) => `
    <article class="admin-product"><img src="${escapeHtml(product.image)}" alt=""><div><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.code)} · ${(product.sizes || []).map(sizeLabel).map(escapeHtml).join(", ") || "No sizes"}</p></div><div><div class="product-price">${formatLkr(product.priceLkr)}</div><span class="stock-label ${product.inStock ? "" : "sold"}">${product.inStock ? "In stock" : "Sold out"}</span></div><div class="row-actions"><button type="button" data-preview-product="${escapeHtml(product.id)}">Preview</button><button type="button" data-edit="${escapeHtml(product.id)}">Edit</button><button type="button" data-delete="${escapeHtml(product.id)}">Delete</button></div></article>
  `).join("");
  $("#productEmpty").hidden = products.length > 0;
}

function normalizeEditorSize(size, index) {
  return typeof size === "string" ? { id: crypto.randomUUID(), label: size, available: true, order: index } : { ...size, order: index };
}

function renderSizeEditor() {
  $("#adminSizeList").innerHTML = state.editingSizes.map((size, index) => `
    <div class="admin-size-row" data-size-index="${index}"><input value="${escapeHtml(size.label)}" aria-label="Size label"><label><input type="checkbox" ${size.available !== false ? "checked" : ""}> Available</label><button type="button" data-size-up ${index === 0 ? "disabled" : ""}>↑</button><button type="button" data-size-down ${index === state.editingSizes.length - 1 ? "disabled" : ""}>↓</button><button type="button" data-size-remove>Remove Size</button></div>
  `).join("");
}

function mediaFromForm() {
  return {
    originalUrl: productImagePreview.dataset.url || productImagePreview.src,
    aspectRatio: productForm.elements.aspectRatio.value,
    fit: productForm.elements.imageFit.value,
    zoom: Number(productForm.elements.zoom.value),
    offsetX: Number(productForm.elements.offsetX.value),
    offsetY: Number(productForm.elements.offsetY.value),
    rotation: Number(productForm.elements.rotation.value),
    focalX: 50,
    focalY: 50
  };
}

function updateMediaPreview() {
  const media = mediaFromForm();
  const frame = productImagePreview.closest(".editor-preview-frame");
  frame.style.aspectRatio = ({ "1:1": "1/1", "4:5": "4/5", "3:4": "3/4" })[media.aspectRatio] || "auto";
  productImagePreview.style.objectFit = media.fit;
  productImagePreview.style.transform = `translate(${media.offsetX}%, ${media.offsetY}%) scale(${media.zoom}) rotate(${media.rotation}deg)`;
}

function openProductEditor(product = null) {
  state.editingId = product?.id || null;
  productForm.reset();
  $("#productError").textContent = "";
  $("#productImageFile").value = "";
  $("#productDialogTitle").textContent = product ? "Edit product" : "Add product";
  const values = product || { name: "", code: "", priceLkr: "", material: "", sizes: [], description: "", sortOrder: state.products.length, inStock: true, status: "published", image: "/assets/hero.png", media: {} };
  for (const name of ["name", "code", "priceLkr", "material", "description", "sortOrder", "status"]) if (productForm.elements[name]) productForm.elements[name].value = values[name] ?? "";
  productForm.elements.inStock.checked = Boolean(values.inStock);
  state.editingSizes = (values.sizes || []).map(normalizeEditorSize);
  const media = { aspectRatio: "4:5", fit: "cover", zoom: 1, offsetX: 0, offsetY: 0, rotation: 0, ...(values.media || {}) };
  for (const [name, value] of Object.entries({ aspectRatio: media.aspectRatio, imageFit: media.fit, zoom: media.zoom, offsetX: media.offsetX, offsetY: media.offsetY, rotation: media.rotation })) productForm.elements[name].value = value;
  productImagePreview.src = media.originalUrl || values.image || "/assets/hero.png";
  productImagePreview.dataset.url = media.originalUrl || values.image || "/assets/hero.png";
  renderSizeEditor();
  updateMediaPreview();
  productDialog.showModal();
}

function setLogoPreview(url) {
  const image = $("#logoPreview");
  image.hidden = !url;
  if (url) image.src = url; else image.removeAttribute("src");
  image.closest(".logo-preview-surface").classList.toggle("is-empty", !url);
}

function populateSettings() {
  const simple = ["whatsappNumber", "whatsappDisplay", "deliveryDetails", "facebook", "instagram", "tiktok", "youtube", "productCodePrefix", "logoWidth", "logoAlignment", "googleSheetUrl"];
  simple.forEach((name) => { const input = settingsForm.elements.namedItem(name); if (input) input.value = state.settings[name] ?? ""; });
  settingsForm.elements.loadingAnimationEnabled.checked = state.settings.loadingAnimationEnabled !== false;
  Object.entries({ ...DEFAULT_THEME, ...(state.settings.theme || {}) }).forEach(([key, value]) => { const input = settingsForm.elements.namedItem(`theme.${key}`); if (input) input.value = value; });
  setLogoPreview(state.settings.logoImage || "");
  $("#heroPreview").src = state.settings.heroImage || "/assets/hero.png";
  previewTheme();
}

function luminance(hex) {
  const values = hex.slice(1).match(/../g).map((value) => parseInt(value, 16) / 255).map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}

function contrast(a, b) { const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (light + 0.05) / (dark + 0.05); }
function currentTheme() { return Object.fromEntries(Object.keys(DEFAULT_THEME).map((key) => [key, settingsForm.elements.namedItem(`theme.${key}`)?.value || DEFAULT_THEME[key]])); }
function previewTheme() {
  const theme = currentTheme();
  document.documentElement.style.setProperty("--red", theme.accent);
  document.documentElement.style.setProperty("--ink", theme.primary);
  document.body.style.background = theme.background;
  $("#contrastWarning").textContent = contrast(theme.button, theme.buttonText) < 4.5 || contrast(theme.background, theme.text) < 4.5 ? "Warning: these colours have low text contrast. Choose darker text or a lighter background." : "Colour contrast looks good.";
}

async function optimizeImage(file, kind = "content") {
  if (!file?.type.startsWith("image/")) throw new Error("Choose a valid image file.");
  const bitmap = await createImageBitmap(file);
  const max = kind === "logo" ? 1600 : 2200;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d", { alpha: true }).drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", kind === "logo" ? 0.94 : 0.88));
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
}

async function uploadImage(file, kind = "content") {
  const optimized = await optimizeImage(file, kind);
  const response = await fetch(`/api/admin/upload?filename=${encodeURIComponent(optimized.name)}`, { method: "POST", credentials: "same-origin", headers: { Accept: "application/json", "Content-Type": optimized.type, "X-CSRF-Token": state.csrfToken }, body: optimized });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Image upload failed.");
  return payload.url;
}

async function saveProduct(event) {
  event.preventDefault(); setBusy(productForm, true); $("#productError").textContent = "";
  try {
    let originalUrl = productImagePreview.dataset.url || "/assets/hero.png";
    if ($("#productImageFile").files[0]) originalUrl = await uploadImage($("#productImageFile").files[0]);
    state.editingSizes = state.editingSizes.map((size, order) => ({ ...size, label: String(size.label).trim(), order })).filter((size) => size.label);
    const media = { ...mediaFromForm(), originalUrl };
    const product = { name: productForm.elements.name.value.trim(), code: productForm.elements.code.value, priceLkr: Number(productForm.elements.priceLkr.value), material: productForm.elements.material.value.trim(), sizes: state.editingSizes, description: productForm.elements.description.value.trim(), sortOrder: Number(productForm.elements.sortOrder.value || 0), inStock: productForm.elements.inStock.checked, status: productForm.elements.status.value, image: originalUrl, media };
    const payload = await api("/api/admin/products", { method: state.editingId ? "PUT" : "POST", body: JSON.stringify({ id: state.editingId, product }) });
    const index = state.products.findIndex((item) => item.id === state.editingId);
    if (index >= 0) state.products[index] = payload.product; else state.products.push(payload.product);
    renderProducts(); setUpdatedAt(payload.updatedAt); productDialog.close(); toast(`Product saved with code ${payload.product.code}.`);
  } catch (error) { $("#productError").textContent = error.message; } finally { setBusy(productForm, false); }
}

async function saveSettings(event) {
  event.preventDefault(); setBusy(settingsForm, true); $("#settingsError").textContent = "";
  try {
    let logoImage = state.settings.logoImage || "";
    if ($("#logoFile").files[0]) logoImage = await uploadImage($("#logoFile").files[0], "logo");
    let heroImage = state.settings.heroImage || "/assets/hero.png";
    if ($("#heroFile").files[0]) heroImage = await uploadImage($("#heroFile").files[0]);
    const data = new FormData(settingsForm);
    const settings = { whatsappNumber: String(data.get("whatsappNumber") || "").replace(/\D/g, ""), whatsappDisplay: data.get("whatsappDisplay"), deliveryDetails: data.get("deliveryDetails"), facebook: data.get("facebook"), instagram: data.get("instagram"), tiktok: data.get("tiktok"), youtube: data.get("youtube"), productCodePrefix: data.get("productCodePrefix"), loadingAnimationEnabled: settingsForm.elements.loadingAnimationEnabled.checked, logoImage, logoWidth: Number(data.get("logoWidth")), logoAlignment: data.get("logoAlignment"), heroImage, googleSheetUrl: data.get("googleSheetUrl"), theme: currentTheme() };
    const payload = await api("/api/admin/settings", { method: "PUT", body: JSON.stringify({ settings }) });
    state.settings = payload.settings; populateSettings(); setUpdatedAt(payload.updatedAt); toast("Site settings updated.");
  } catch (error) { $("#settingsError").textContent = error.message; } finally { setBusy(settingsForm, false); }
}

function renderSales() {
  const summary = state.sales || [];
  $("#totalClicks").textContent = summary.reduce((sum, row) => sum + row.buyNowClicks, 0);
  $("#totalSold").textContent = summary.reduce((sum, row) => sum + row.confirmedQuantitySold, 0);
  $("#lastSync").textContent = state.salesPayload?.sync?.lastSuccessAt ? new Date(state.salesPayload.sync.lastSuccessAt).toLocaleString("en-LK") : "Not connected";
  $("#salesTableBody").innerHTML = summary.map((row) => `<tr><td>${escapeHtml(row.productCode)}</td><td>${escapeHtml(row.productName)}</td><td>${row.buyNowClicks}</td><td>${row.confirmedQuantitySold}</td></tr>`).join("");
  salesForm.elements.productCode.innerHTML = state.products.filter((product) => product.status !== "archived").map((product) => `<option value="${escapeHtml(product.code)}">${escapeHtml(product.code)} · ${escapeHtml(product.name)}</option>`).join("");
  salesForm.elements.date.value ||= new Date().toISOString().slice(0, 10);
  const sheetLink = state.settings.googleSheetUrl || state.salesPayload?.googleSheetUrl;
  $("#openSheetButton").hidden = !sheetLink; if (sheetLink) $("#openSheetButton").href = sheetLink;
}

function previewProduct(product) {
  const sizes = (product.sizes || []).filter((size) => typeof size === "string" || size.available !== false).map(sizeLabel);
  const media = product.media || {};
  $("#adminProductPreview").innerHTML = `<article class="preview-card"><div class="preview-image" style="aspect-ratio:${({ "1:1": "1/1", "4:5": "4/5", "3:4": "3/4" })[media.aspectRatio] || "4/5"}"><img src="${escapeHtml(media.originalUrl || product.image)}" style="object-fit:${media.fit || "cover"};transform:translate(${media.offsetX || 0}%,${media.offsetY || 0}%) scale(${media.zoom || 1}) rotate(${media.rotation || 0}deg)"></div><p>${escapeHtml(product.code || "Generated after saving")}</p><h3>${escapeHtml(product.name || "Product name")}</h3><strong>${formatLkr(product.priceLkr)}</strong><div class="preview-sizes">${sizes.map((size) => `<button>${escapeHtml(size)}</button>`).join("")}</div><button class="primary-button">Buy now on WhatsApp</button></article>`;
  $("#previewDialog").showModal();
}

function productFromFormForPreview() { return { code: productForm.elements.code.value, name: productForm.elements.name.value, priceLkr: productForm.elements.priceLkr.value, sizes: state.editingSizes, image: productImagePreview.src, media: mediaFromForm() }; }

function changePanel(id) {
  state.activePanel = id;
  document.querySelectorAll(".admin-panel").forEach((panel) => { panel.hidden = panel.id !== id; });
  document.querySelectorAll("[data-panel]").forEach((button) => button.classList.toggle("is-active", button.dataset.panel === id));
  $("#panelTitle").textContent = id === "productsPanel" ? "Products" : id === "settingsPanel" ? "Site settings" : "Sales monitoring";
  $("#addProductButton").hidden = id !== "productsPanel";
}

loginForm.addEventListener("submit", async (event) => { event.preventDefault(); setBusy(loginForm, true, "Signing in..."); try { const data = new FormData(loginForm); const payload = await api("/api/admin/login", { method: "POST", body: JSON.stringify({ username: data.get("username"), password: data.get("password") }) }); state.csrfToken = payload.csrfToken; loginForm.reset(); showDashboard(); await loadAdminData(); } catch (error) { $("#loginError").textContent = error.message; } finally { setBusy(loginForm, false); } });
$("#logoutButton").addEventListener("click", async () => { try { await api("/api/admin/logout", { method: "POST" }); } finally { state.csrfToken = ""; showLogin(); } });
document.querySelectorAll("[data-panel]").forEach((button) => button.addEventListener("click", () => changePanel(button.dataset.panel)));
$("#addProductButton").addEventListener("click", () => openProductEditor());
$("#closeProductDialog").addEventListener("click", () => productDialog.close());
$("#cancelProductButton").addEventListener("click", () => productDialog.close());
productForm.addEventListener("submit", saveProduct);
settingsForm.addEventListener("submit", saveSettings);
$("#adminSearch").addEventListener("input", renderProducts);
productList.addEventListener("click", async (event) => { const id = event.target.closest("[data-edit],[data-delete],[data-preview-product]")?.dataset.edit || event.target.closest("[data-delete]")?.dataset.delete || event.target.closest("[data-preview-product]")?.dataset.previewProduct; const product = state.products.find((item) => item.id === id); if (!product) return; if (event.target.closest("[data-edit]")) openProductEditor(product); else if (event.target.closest("[data-preview-product]")) previewProduct(product); else if (confirm(`Archive "${product.name}"? Its sales history and product code will be preserved.`)) { const payload = await api("/api/admin/products", { method: "DELETE", body: JSON.stringify({ id }) }); const index = state.products.findIndex((item) => item.id === id); if (index >= 0) state.products[index] = payload.removedProduct; renderProducts(); toast("Product archived."); } });
$("#addSizeButton").addEventListener("click", () => { const input = $("#newSizeInput"); const label = input.value.trim(); if (!label || state.editingSizes.some((size) => size.label.toLowerCase() === label.toLowerCase())) return; state.editingSizes.push({ id: crypto.randomUUID(), label, available: true, order: state.editingSizes.length }); input.value = ""; renderSizeEditor(); });
$("#adminSizeList").addEventListener("input", (event) => { const row = event.target.closest("[data-size-index]"); if (!row) return; const size = state.editingSizes[Number(row.dataset.sizeIndex)]; if (event.target.type === "checkbox") size.available = event.target.checked; else size.label = event.target.value; });
$("#adminSizeList").addEventListener("click", (event) => { const row = event.target.closest("[data-size-index]"); if (!row) return; const index = Number(row.dataset.sizeIndex); if (event.target.closest("[data-size-remove]")) state.editingSizes.splice(index, 1); if (event.target.closest("[data-size-up]") && index > 0) [state.editingSizes[index - 1], state.editingSizes[index]] = [state.editingSizes[index], state.editingSizes[index - 1]]; if (event.target.closest("[data-size-down]") && index < state.editingSizes.length - 1) [state.editingSizes[index + 1], state.editingSizes[index]] = [state.editingSizes[index], state.editingSizes[index + 1]]; renderSizeEditor(); });
document.querySelectorAll(".media-controls input,.media-controls select").forEach((input) => input.addEventListener("input", updateMediaPreview));
$("#resetImageButton").addEventListener("click", () => { Object.entries({ aspectRatio: "4:5", imageFit: "cover", zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 }).forEach(([key, value]) => { productForm.elements[key].value = value; }); updateMediaPreview(); });
$("#productImageFile").addEventListener("change", () => { const file = $("#productImageFile").files[0]; if (file) { productImagePreview.src = URL.createObjectURL(file); productImagePreview.dataset.url = productImagePreview.src; } });
$("#logoFile").addEventListener("change", () => { const file = $("#logoFile").files[0]; if (file) setLogoPreview(URL.createObjectURL(file)); });
$("#heroFile").addEventListener("change", () => { const file = $("#heroFile").files[0]; if (file) $("#heroPreview").src = URL.createObjectURL(file); });
$("#removeLogoButton").addEventListener("click", () => { if (confirm("Remove the logo from the website?")) { state.settings.logoImage = ""; $("#logoFile").value = ""; setLogoPreview(""); toast("Logo will be removed when settings are saved."); } });
$("#resetThemeButton").addEventListener("click", () => { Object.entries(DEFAULT_THEME).forEach(([key, value]) => settingsForm.elements.namedItem(`theme.${key}`).value = value); previewTheme(); });
$("#themeControls").addEventListener("input", previewTheme);
$("#previewProductButton").addEventListener("click", () => previewProduct(productFromFormForPreview()));
$("#closePreviewButton").addEventListener("click", () => $("#previewDialog").close());
document.querySelectorAll("[data-preview-width]").forEach((button) => button.addEventListener("click", () => $("#adminProductPreview").style.maxWidth = `${button.dataset.previewWidth}px`));
salesForm.addEventListener("submit", async (event) => { event.preventDefault(); setBusy(salesForm, true); try { const data = new FormData(salesForm); const payload = await api("/api/admin/sales", { method: "POST", body: JSON.stringify(Object.fromEntries(data)) }); state.sales = payload.summary; state.salesPayload.sync = payload.sync; renderSales(); salesForm.elements.quantity.value = 1; salesForm.elements.notes.value = ""; toast("Confirmed sale recorded."); } catch (error) { toast(error.message); } finally { setBusy(salesForm, false); } });
$("#syncNowButton").addEventListener("click", async () => { try { const payload = await api("/api/admin/sync", { method: "POST", body: "{}" }); state.salesPayload.sync = payload.sync; renderSales(); toast("Google Sheets sync completed."); } catch (error) { toast(error.message); } });

checkSession();
