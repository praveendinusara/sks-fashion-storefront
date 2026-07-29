const state = {
  products: [],
  settings: {},
  editingId: null,
  activePanel: "productsPanel"
};

const loginView = document.querySelector("#loginView");
const dashboard = document.querySelector("#dashboard");
const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");
const logoutButton = document.querySelector("#logoutButton");
const productList = document.querySelector("#productList");
const productEmpty = document.querySelector("#productEmpty");
const adminSearch = document.querySelector("#adminSearch");
const addProductButton = document.querySelector("#addProductButton");
const productDialog = document.querySelector("#productDialog");
const productForm = document.querySelector("#productForm");
const productError = document.querySelector("#productError");
const productImagePreview = document.querySelector("#productImagePreview");
const productImageFile = document.querySelector("#productImageFile");
const settingsForm = document.querySelector("#settingsForm");
const settingsError = document.querySelector("#settingsError");
const heroFile = document.querySelector("#heroFile");
const heroPreview = document.querySelector("#heroPreview");
const saveStatus = document.querySelector("#saveStatus");
const adminToast = document.querySelector("#adminToast");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function formatLkr(value) {
  return `LKR ${new Intl.NumberFormat("en-LK", {
    maximumFractionDigits: 0
  }).format(Number(value) || 0)}`;
}

async function api(path, options = {}) {
  const requestOptions = {
    credentials: "same-origin",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body && !(options.body instanceof Blob)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers
    }
  };
  const response = await fetch(path, requestOptions);
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
  if (!button.dataset.originalText) button.dataset.originalText = button.textContent;
  button.disabled = busy;
  button.textContent = busy ? label : button.dataset.originalText;
}

function showToast(message) {
  adminToast.textContent = message;
  adminToast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    adminToast.classList.remove("is-visible");
  }, 3200);
}

function setUpdatedAt(value) {
  if (!value) return;
  const date = new Date(value);
  saveStatus.textContent = Number.isNaN(date.getTime())
    ? "Saved"
    : `Last saved ${date.toLocaleString("en-LK", {
      dateStyle: "medium",
      timeStyle: "short"
    })}`;
}

function showLogin() {
  loginView.hidden = false;
  dashboard.hidden = true;
}

function showDashboard() {
  loginView.hidden = true;
  dashboard.hidden = false;
}

async function checkSession() {
  try {
    await api("/api/admin/session");
    showDashboard();
    await loadAdminData();
  } catch {
    showLogin();
  }
}

async function loadAdminData() {
  const [productPayload, settingsPayload] = await Promise.all([
    api("/api/admin/products"),
    api("/api/admin/settings")
  ]);
  state.products = productPayload.products || [];
  state.settings = settingsPayload.settings || {};
  renderProducts();
  populateSettings();
  setUpdatedAt(productPayload.updatedAt || settingsPayload.updatedAt);
}

function renderProducts() {
  const term = adminSearch.value.trim().toLowerCase();
  const products = state.products
    .filter((product) => !term || `${product.name} ${product.code}`.toLowerCase().includes(term))
    .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));

  document.querySelector("#totalProducts").textContent = state.products.length;
  document.querySelector("#inStockProducts").textContent =
    state.products.filter((product) => product.inStock).length;
  document.querySelector("#soldOutProducts").textContent =
    state.products.filter((product) => !product.inStock).length;

  productList.innerHTML = products.map((product) => `
    <article class="admin-product">
      <img
        src="${escapeHtml(product.image)}"
        alt=""
        style="object-position:${escapeHtml(product.imagePosition || "center")}"
      >
      <div>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.code)} · ${escapeHtml((product.sizes || []).join(", "))}</p>
      </div>
      <div class="price-stock">
        <div class="product-price">${formatLkr(product.priceLkr)}</div>
        <span class="stock-label ${product.inStock ? "" : "sold"}">
          ${product.inStock ? "In stock" : "Sold out"}
        </span>
      </div>
      <div class="row-actions">
        <button type="button" data-edit="${escapeHtml(product.id)}">Edit</button>
        <button type="button" data-delete="${escapeHtml(product.id)}">Delete</button>
      </div>
    </article>
  `).join("");
  productEmpty.hidden = products.length > 0;
}

function populateSettings() {
  [
    "whatsappNumber",
    "whatsappDisplay",
    "deliveryDetails",
    "facebook",
    "instagram",
    "tiktok",
    "youtube"
  ].forEach((name) => {
    const input = settingsForm.elements.namedItem(name);
    if (input) input.value = state.settings[name] || "";
  });
  heroPreview.src = state.settings.heroImage || "/assets/hero.png";
}

function openProductEditor(product = null) {
  state.editingId = product?.id || null;
  productForm.reset();
  productError.textContent = "";
  productImageFile.value = "";
  document.querySelector("#productDialogTitle").textContent =
    product ? "Edit product" : "Add product";

  const values = product || {
    name: "",
    code: "",
    priceLkr: "",
    material: "",
    sizes: [],
    description: "",
    imagePosition: "center",
    sortOrder: state.products.length,
    inStock: true,
    image: "/assets/hero.png"
  };

  productForm.elements.name.value = values.name || "";
  productForm.elements.code.value = values.code || "";
  productForm.elements.priceLkr.value = values.priceLkr || "";
  productForm.elements.material.value = values.material || "";
  productForm.elements.sizes.value = (values.sizes || []).join(", ");
  productForm.elements.description.value = values.description || "";
  productForm.elements.imagePosition.value = values.imagePosition || "center";
  productForm.elements.sortOrder.value = values.sortOrder ?? state.products.length;
  productForm.elements.inStock.checked = Boolean(values.inStock);
  productImagePreview.src = values.image || "/assets/hero.png";
  productImagePreview.dataset.url = values.image || "/assets/hero.png";
  productDialog.showModal();
}

function closeProductEditor() {
  if (productDialog.open) productDialog.close();
}

async function optimizeImage(file) {
  if (!file) return null;
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a valid image file.");
  }

  try {
    const bitmap = await createImageBitmap(file);
    const maximumDimension = 1800;
    const scale = Math.min(1, maximumDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
    if (!blob) throw new Error("Image compression failed.");
    return new File(
      [blob],
      `${file.name.replace(/\.[^.]+$/, "") || "product"}.webp`,
      { type: "image/webp" }
    );
  } catch (error) {
    if (file.size > 4 * 1024 * 1024) {
      throw new Error("This image is too large. Please use an image below 4 MB.");
    }
    return file;
  }
}

async function uploadImage(file) {
  const optimized = await optimizeImage(file);
  if (!optimized) return "";
  const response = await fetch(
    `/api/admin/upload?filename=${encodeURIComponent(optimized.name)}`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": optimized.type
      },
      body: optimized
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Image upload failed.");
  return payload.url;
}

async function saveProduct(event) {
  event.preventDefault();
  productError.textContent = "";
  setBusy(productForm, true, "Saving...");

  try {
    let image = productImagePreview.dataset.url || "/assets/hero.png";
    if (productImageFile.files[0]) {
      image = await uploadImage(productImageFile.files[0]);
    }

    const product = {
      name: productForm.elements.name.value.trim(),
      code: productForm.elements.code.value.trim(),
      priceLkr: Number(productForm.elements.priceLkr.value),
      material: productForm.elements.material.value.trim(),
      sizes: productForm.elements.sizes.value
        .split(",")
        .map((size) => size.trim())
        .filter(Boolean),
      description: productForm.elements.description.value.trim(),
      imagePosition: productForm.elements.imagePosition.value,
      sortOrder: Number(productForm.elements.sortOrder.value || 0),
      inStock: productForm.elements.inStock.checked,
      image
    };
    const method = state.editingId ? "PUT" : "POST";
    const payload = await api("/api/admin/products", {
      method,
      body: JSON.stringify({
        id: state.editingId,
        product
      })
    });

    if (state.editingId) {
      const index = state.products.findIndex((item) => item.id === state.editingId);
      if (index !== -1) state.products[index] = payload.product;
    } else {
      state.products.push(payload.product);
    }

    renderProducts();
    setUpdatedAt(payload.updatedAt);
    closeProductEditor();
    showToast(state.editingId ? "Product updated." : "Product added.");
  } catch (error) {
    if (error.status === 401) {
      showLogin();
      closeProductEditor();
      return;
    }
    productError.textContent = error.message;
  } finally {
    setBusy(productForm, false);
  }
}

async function deleteProduct(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;
  if (!window.confirm(`Delete "${product.name}" from the store?`)) return;

  try {
    const payload = await api("/api/admin/products", {
      method: "DELETE",
      body: JSON.stringify({ id: productId })
    });
    state.products = state.products.filter((item) => item.id !== productId);
    renderProducts();
    setUpdatedAt(payload.updatedAt);
    showToast("Product deleted.");
  } catch (error) {
    showToast(error.message);
  }
}

async function saveSettings(event) {
  event.preventDefault();
  settingsError.textContent = "";
  setBusy(settingsForm, true, "Saving...");

  try {
    let heroImage = state.settings.heroImage || "/assets/hero.png";
    if (heroFile.files[0]) {
      heroImage = await uploadImage(heroFile.files[0]);
    }

    const formData = new FormData(settingsForm);
    const settings = {
      whatsappNumber: String(formData.get("whatsappNumber") || "").replace(/\D/g, ""),
      whatsappDisplay: String(formData.get("whatsappDisplay") || "").trim(),
      deliveryDetails: String(formData.get("deliveryDetails") || "").trim(),
      facebook: String(formData.get("facebook") || "").trim(),
      instagram: String(formData.get("instagram") || "").trim(),
      tiktok: String(formData.get("tiktok") || "").trim(),
      youtube: String(formData.get("youtube") || "").trim(),
      heroImage
    };
    const payload = await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ settings })
    });
    state.settings = payload.settings;
    populateSettings();
    heroFile.value = "";
    setUpdatedAt(payload.updatedAt);
    showToast("Site settings updated.");
  } catch (error) {
    settingsError.textContent = error.message;
  } finally {
    setBusy(settingsForm, false);
  }
}

function changePanel(panelId) {
  state.activePanel = panelId;
  document.querySelectorAll(".admin-panel").forEach((panel) => {
    panel.hidden = panel.id !== panelId;
  });
  document.querySelectorAll("[data-panel]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panel === panelId);
  });
  const isProducts = panelId === "productsPanel";
  document.querySelector("#panelTitle").textContent = isProducts ? "Products" : "Site settings";
  addProductButton.hidden = !isProducts;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  setBusy(loginForm, true, "Signing in...");
  const formData = new FormData(loginForm);

  try {
    await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        username: formData.get("username"),
        password: formData.get("password")
      })
    });
    loginForm.reset();
    showDashboard();
    await loadAdminData();
  } catch (error) {
    loginError.textContent = error.message;
  } finally {
    setBusy(loginForm, false);
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await api("/api/admin/logout", { method: "POST" });
  } finally {
    showLogin();
  }
});

document.querySelectorAll("[data-panel]").forEach((button) => {
  button.addEventListener("click", () => changePanel(button.dataset.panel));
});

addProductButton.addEventListener("click", () => openProductEditor());
document.querySelector("#closeProductDialog").addEventListener("click", closeProductEditor);
document.querySelector("#cancelProductButton").addEventListener("click", closeProductEditor);
productForm.addEventListener("submit", saveProduct);
settingsForm.addEventListener("submit", saveSettings);
adminSearch.addEventListener("input", renderProducts);

productList.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit]");
  if (editButton) {
    const product = state.products.find((item) => item.id === editButton.dataset.edit);
    if (product) openProductEditor(product);
    return;
  }

  const deleteButton = event.target.closest("[data-delete]");
  if (deleteButton) deleteProduct(deleteButton.dataset.delete);
});

productImageFile.addEventListener("change", () => {
  const file = productImageFile.files[0];
  if (file) productImagePreview.src = URL.createObjectURL(file);
});

heroFile.addEventListener("change", () => {
  const file = heroFile.files[0];
  if (file) heroPreview.src = URL.createObjectURL(file);
});

checkSession();

