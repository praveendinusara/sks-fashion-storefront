import {
  buildOrderMessage,
  buildWhatsAppUrl,
  formatLkr
} from "./order.js";

const DEFAULT_SETTINGS = {
  whatsappNumber: "94775043005",
  whatsappDisplay: "077 504 3005",
  deliveryDetails: "Cash on delivery available. Islandwide delivery.",
  logoImage: "",
  heroImage: "/assets/hero.png",
  facebook: "",
  instagram: "",
  tiktok: "",
  youtube: ""
};
const selectedSizes = new Map();
let allProducts = [];
let activeFilter = "all";
let siteSettings = { ...DEFAULT_SETTINGS };

const productGrid = document.querySelector("#productGrid");
const emptyState = document.querySelector("#emptyState");
const searchInput = document.querySelector("#searchInput");
const filterButtons = document.querySelectorAll("[data-filter]");
const toast = document.querySelector("#toast");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function productCard(product) {
  const chosenSize = selectedSizes.get(product.id);
  const sizes = product.sizes.map((size) => `
    <button
      class="size-option${chosenSize === size ? " is-selected" : ""}"
      type="button"
      data-size="${escapeHtml(size)}"
      data-product-id="${escapeHtml(product.id)}"
      aria-pressed="${chosenSize === size ? "true" : "false"}"
    >${escapeHtml(size)}</button>
  `).join("");

  return `
    <article class="product-card" id="product-${escapeHtml(product.id)}" data-product-id="${escapeHtml(product.id)}">
      <div class="product-media">
        <img
          src="${escapeHtml(product.image)}"
          alt="${escapeHtml(product.name)}"
          style="object-position:${escapeHtml(product.imagePosition)}"
          loading="lazy"
          width="1773"
          height="887"
        >
        <span class="stock-badge ${product.inStock ? "in-stock" : "sold-out"}">
          ${product.inStock ? "In stock" : "Sold out"}
        </span>
      </div>
      <div class="product-content">
        <div class="product-heading">
          <div>
            <p class="product-code">${escapeHtml(product.code)}</p>
            <h3>${escapeHtml(product.name)}</h3>
          </div>
          <p class="product-price">${formatLkr(product.priceLkr)}</p>
        </div>
        <p class="product-description">${escapeHtml(product.description)}</p>
        <p class="product-material"><span>Material</span>${escapeHtml(product.material)}</p>
        <fieldset class="size-picker" ${product.inStock ? "" : "disabled"}>
          <legend>Select your size</legend>
          <div class="size-options">${sizes}</div>
        </fieldset>
        <button
          class="buy-button"
          type="button"
          data-buy="${escapeHtml(product.id)}"
          ${product.inStock ? "" : "disabled"}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.7-1.6-1.9-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.1-.2-.6-.5-.5-.6-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 2 3.1 4.9 4.4.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4M12 2a10 10 0 0 0-8.7 15L2 22l5.1-1.3A10 10 0 1 0 12 2"/></svg>
          ${product.inStock ? "Buy now on WhatsApp" : "Sold out"}
        </button>
        <p class="delivery-note">${escapeHtml(siteSettings.deliveryDetails)}</p>
      </div>
    </article>
  `;
}

function visibleProducts() {
  const term = searchInput.value.trim().toLowerCase();
  return allProducts.filter((product) => {
    const matchesSearch = !term || [
      product.name,
      product.code,
      product.material,
      product.description
    ].join(" ").toLowerCase().includes(term);
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "in-stock" && product.inStock);
    return matchesSearch && matchesFilter;
  });
}

function renderProducts() {
  const products = visibleProducts();
  productGrid.innerHTML = products.map(productCard).join("");
  emptyState.hidden = products.length > 0;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 3200);
}

function selectSize(button) {
  selectedSizes.set(button.dataset.productId, button.dataset.size);
  renderProducts();
}

function orderProduct(productId) {
  const product = allProducts.find((item) => item.id === productId);
  if (!product) return;

  const size = selectedSizes.get(product.id);
  if (!size) {
    showToast("Please select a size before continuing.");
    document.querySelector(`#product-${CSS.escape(product.id)} .size-picker`)?.focus();
    return;
  }

  const message = buildOrderMessage({
    product,
    size
  });
  const whatsappUrl = buildWhatsAppUrl({
    phoneNumber: siteSettings.whatsappNumber,
    message
  });

  window.location.href = whatsappUrl;
}

function socialLink(label, url) {
  if (!url) return "";
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

function applyBrandLogo(url) {
  document.querySelectorAll("[data-brand-logo]").forEach((image) => {
    const fallback = image.parentElement?.querySelector("[data-brand-fallback]");
    const showFallback = () => {
      image.hidden = true;
      if (fallback) fallback.hidden = false;
    };
    const showLogo = () => {
      image.hidden = false;
      if (fallback) fallback.hidden = true;
    };

    if (!url) {
      image.removeAttribute("src");
      showFallback();
      return;
    }

    image.onload = showLogo;
    image.onerror = showFallback;
    image.hidden = true;
    if (fallback) fallback.hidden = false;
    image.src = url;

    if (image.complete && image.naturalWidth > 0) {
      showLogo();
    }
  });
}

function applySiteSettings() {
  const whatsappUrl = `https://wa.me/${siteSettings.whatsappNumber}`;
  applyBrandLogo(siteSettings.logoImage);

  document.querySelectorAll("[data-whatsapp-link]").forEach((link) => {
    link.href = whatsappUrl;
  });

  const footerWhatsApp = document.querySelector(".footer-whatsapp");
  if (footerWhatsApp) {
    footerWhatsApp.textContent = `WhatsApp: ${siteSettings.whatsappDisplay}`;
  }

  const heroImage = document.querySelector(".hero-image");
  if (heroImage && siteSettings.heroImage) {
    heroImage.src = siteSettings.heroImage;
  }

  const links = [
    socialLink("Facebook", siteSettings.facebook),
    socialLink("Instagram", siteSettings.instagram),
    socialLink("TikTok", siteSettings.tiktok),
    socialLink("YouTube", siteSettings.youtube)
  ].filter(Boolean);
  const socialPanel = document.querySelector("#socialPanel");
  const socialLinks = document.querySelector("#socialLinks");
  if (socialPanel && socialLinks) {
    socialLinks.innerHTML = links.join("");
    socialPanel.hidden = links.length === 0;
  }
}

async function loadStorefront() {
  productGrid.setAttribute("aria-busy", "true");

  try {
    const [productResponse, settingsResponse] = await Promise.all([
      fetch("/api/products", { headers: { Accept: "application/json" } }),
      fetch("/api/site-settings", { headers: { Accept: "application/json" } })
    ]);
    if (!productResponse.ok) {
      throw new Error(`Product API returned ${productResponse.status}`);
    }

    const productPayload = await productResponse.json();
    allProducts = Array.isArray(productPayload.products) ? productPayload.products : [];

    if (settingsResponse.ok) {
      const settingsPayload = await settingsResponse.json();
      siteSettings = {
        ...DEFAULT_SETTINGS,
        ...(settingsPayload.settings || {})
      };
    }
  } catch (error) {
    console.error(error);
    productGrid.innerHTML = `
      <div class="load-error">
        <h3>We could not load the collection.</h3>
        <p>Please refresh the page or contact us directly on WhatsApp.</p>
        <a href="https://wa.me/${DEFAULT_SETTINGS.whatsappNumber}">Open WhatsApp</a>
      </div>
    `;
    return;
  } finally {
    productGrid.removeAttribute("aria-busy");
  }

  applySiteSettings();
  renderProducts();
  focusLinkedProduct();
}

function focusLinkedProduct() {
  const productId = new URLSearchParams(window.location.search).get("product");
  if (!productId) return;

  window.requestAnimationFrame(() => {
    const card = document.querySelector(`#product-${CSS.escape(productId)}`);
    if (!card) return;
    card.classList.add("is-linked");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

productGrid.addEventListener("click", (event) => {
  const sizeButton = event.target.closest("[data-size]");
  if (sizeButton) {
    selectSize(sizeButton);
    return;
  }

  const buyButton = event.target.closest("[data-buy]");
  if (buyButton && !buyButton.disabled) {
    orderProduct(buyButton.dataset.buy);
  }
});

searchInput.addEventListener("input", renderProducts);

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    renderProducts();
  });
});

window.addEventListener("load", () => {
  window.setTimeout(() => {
    document.querySelector("#preloader")?.classList.add("is-hidden");
  }, 450);
});

loadStorefront();
