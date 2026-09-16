const state = { products: [], cart: JSON.parse(localStorage.getItem("sheltyCart") || "[]") };

const money = n => `GH₵${Number(n || 0).toLocaleString()}`;
const saveCart = () => {
  localStorage.setItem("sheltyCart", JSON.stringify(state.cart));
  renderCart();
};

async function loadProducts() {
  const category = document.getElementById("category-filter").value;
  const gender = document.getElementById("gender-filter")?.value || "All";
  const productType = document.getElementById("product-type-filter")?.value || "All";
  const clothingType = document.getElementById("clothing-type-filter")?.value || "All";
  const search = document.getElementById("product-search").value.trim();
  const params = new URLSearchParams();
  if (category !== "All") params.set("category", category);
  if (gender !== "All") params.set("gender", gender);
  if (productType !== "All") params.set("product_type", productType);
  if (clothingType !== "All") params.set("clothing_type", clothingType);
  if (search) params.set("search", search);
  const res = await fetch("/api/products?" + params);
  state.products = await res.json();
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById("product-grid");
  if (!state.products.length) {
    grid.innerHTML = `<div class="form-card" style="grid-column:1/-1"><p>No pieces found. Try another category or search.</p></div>`;
    return;
  }
  grid.innerHTML = state.products.map(p => `
    <article class="product-card">
      <div class="product-image">
        <img src="${p.image_url || "/assets/shelty-logo.png"}" alt="${escapeHtml(p.name)}" loading="lazy">
      </div>
      <div class="product-info">
        <p>${escapeHtml(p.category)}</p>
        <h3>${escapeHtml(p.name)}</h3>
        <span class="product-price">${p.price > 0 ? money(p.price) : "Price on request"}</span>
        <div class="product-actions">
          <button onclick="viewProduct(${p.id})">View</button>
          <button onclick="addToCart(${p.id})">${p.price > 0 ? "Add to bag" : "Enquire"}</button>
        </div>
      </div>
    </article>
  `).join("");
}

function escapeHtml(v="") {
  return String(v).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[x]));
}

window.viewProduct = async id => {
  const p = state.products.find(x => x.id === id) || await (await fetch("/api/products/"+id)).json();
  document.getElementById("product-modal-content").innerHTML = `
    <div class="product-detail">
      <img src="${p.image_url || "/assets/shelty-logo.png"}" alt="${escapeHtml(p.name)}">
      <div>
        <p class="eyebrow">${escapeHtml(p.category)}</p>
        <h2>${escapeHtml(p.name)}</h2>
        <p>${escapeHtml(p.description)}</p>
        <p><strong>Sizes:</strong> ${escapeHtml(p.sizes || "Custom")}</p>
        <p><strong>Colours:</strong> ${escapeHtml(p.colors || "Custom")}</p>
        <h3>${p.price > 0 ? money(p.price) : "Price on request"}</h3>
        ${p.price > 0 ? `<button class="btn btn-primary" onclick="addToCart(${p.id});closeProduct()">Add to bag</button>` : `<a class="btn btn-primary" href="https://wa.me/233558298615?text=Hello%20Shelty%20Couture%2C%20I%20am%20interested%20in%20${encodeURIComponent(p.name)}" target="_blank">Enquire on WhatsApp</a>`}
      </div>
    </div>`;
  document.getElementById("product-modal").classList.add("open");
};

window.closeProduct = () => document.getElementById("product-modal").classList.remove("open");

window.addToCart = id => {
  const p = state.products.find(x => x.id === id);
  if (!p || Number(p.price) <= 0) {
    if (p) window.open(`https://wa.me/233558298615?text=Hello%20Shelty%20Couture%2C%20I%20would%20like%20to%20enquire%20about%20${encodeURIComponent(p.name)}`, "_blank");
    return;
  }
  const existing = state.cart.find(x => x.id === id);
  if (existing) existing.quantity += 1;
  else state.cart.push({ id:p.id, name:p.name, price:Number(p.price), image_url:p.image_url, quantity:1 });
  saveCart();
  openCart();
};

window.removeFromCart = id => {
  state.cart = state.cart.filter(x => x.id !== id);
  saveCart();
};

window.changeQty = (id, delta) => {
  const item = state.cart.find(x => x.id === id);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) state.cart = state.cart.filter(x => x.id !== id);
  saveCart();
};

function renderCart() {
  const count = state.cart.reduce((s,x)=>s+x.quantity,0);
  document.getElementById("cart-count").textContent = count;
  document.getElementById("cart-items").innerHTML = state.cart.length ? state.cart.map(x => `
    <div class="cart-row">
      <img src="${x.image_url || "/assets/shelty-logo.png"}" alt="">
      <div><h4>${escapeHtml(x.name)}</h4><p>${money(x.price)}</p><div class="qty"><button onclick="changeQty(${x.id},-1)">−</button> ${x.quantity} <button onclick="changeQty(${x.id},1)">+</button></div></div>
      <button class="close" style="position:static;font-size:18px" onclick="removeFromCart(${x.id})">×</button>
    </div>`).join("") : "<p>Your bag is currently empty.</p>";
  const total = state.cart.reduce((s,x)=>s+x.price*x.quantity,0);
  document.getElementById("cart-total").textContent = money(total);
  document.getElementById("checkout-total").textContent = money(total);
}

window.openCart = () => { renderCart(); document.getElementById("cart-drawer").classList.add("open"); };
window.closeCart = () => document.getElementById("cart-drawer").classList.remove("open");
window.openCheckout = () => {
  if (!state.cart.length) return;
  closeCart();
  document.getElementById("checkout-modal").classList.add("open");
};
window.closeCheckout = () => document.getElementById("checkout-modal").classList.remove("open");

document.getElementById("checkout-form").addEventListener("submit", async e => {
  e.preventDefault();
  const form = new FormData(e.target);
  const customer = Object.fromEntries(form.entries());
  const amount = state.cart.reduce((s,x)=>s+x.price*x.quantity,0);
  const msg = document.getElementById("checkout-message");
  msg.textContent = "Creating secure Paystack checkout…";
  const res = await fetch("/api/orders", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ customer, items: state.cart, amount })
  });
  const data = await res.json();
  if (!res.ok) { msg.textContent = data.error || "Unable to start payment."; return; }
  localStorage.setItem("lastOrderReference", data.reference);
  window.location.href = data.authorization_url;
});

document.getElementById("appointment-form").addEventListener("submit", async e => {
  e.preventDefault();
  const form = new FormData(e.target);
  const msg = document.getElementById("appointment-message");
  const res = await fetch("/api/appointments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(form.entries()))});
  const data = await res.json();
  msg.textContent = res.ok ? "Thank you. Your appointment request has been received." : (data.error || "Please try again.");
  if (res.ok) e.target.reset();
});

document.getElementById("tailoring-form").addEventListener("submit", async e => {
  e.preventDefault();
  const form = new FormData(e.target);
  const msg = document.getElementById("tailoring-message");
  const res = await fetch("/api/tailoring-requests",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(form.entries()))});
  const data = await res.json();
  msg.textContent = res.ok ? "Your custom design request has been sent. Shelty Couture will contact you." : (data.error || "Please try again.");
  if (res.ok) e.target.reset();
});

document.getElementById("category-filter").addEventListener("change", loadProducts);
document.getElementById("gender-filter")?.addEventListener("change", loadProducts);
document.getElementById("product-type-filter")?.addEventListener("change", loadProducts);
document.getElementById("clothing-type-filter")?.addEventListener("change", loadProducts);
document.getElementById("product-search").addEventListener("input", () => {
  clearTimeout(window.searchTimer); window.searchTimer = setTimeout(loadProducts, 250);
});
document.querySelector(".menu-toggle").addEventListener("click", () => {
  const nav = document.querySelector(".main-nav");
  nav.style.display = nav.style.display === "flex" ? "" : "flex";
  nav.style.position = "absolute"; nav.style.top = "86px"; nav.style.left = "0"; nav.style.right = "0";
  nav.style.background = "#fff"; nav.style.padding = "20px"; nav.style.flexDirection = "column";
});
document.getElementById("year").textContent = new Date().getFullYear();
loadProducts(); renderCart();

document.getElementById("student-form")?.addEventListener("submit", async e => {
  e.preventDefault();
  const form = new FormData(e.target);
  const msg = document.getElementById("student-message");
  msg.textContent = "Submitting your application…";
  try {
    const res = await fetch("/api/student-applications", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(form.entries()))});
    const data = await res.json();
    msg.textContent = res.ok ? "Application received. Shelty Couture will contact you with the next steps." : (data.error || "Please try again.");
    if (res.ok) e.target.reset();
  } catch (err) {
    msg.textContent = "Connection error. Please try again or contact Shelty Couture on WhatsApp.";
  }
});
