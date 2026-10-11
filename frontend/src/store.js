/* Imibavu Collection — reactive external store
   Keeps the original mutable-state model (direct edits + notify), exposed to
   React through useSyncExternalStore so every component re-renders on change. */
import { useSyncExternalStore } from "react";
import { api } from "./api";
import { t, setLangVar, getLang } from "./i18n";
import {
  PRODUCTS, BRANDS, CATEGORIES, GENDERS, SCENT_FAMILIES, LONGEVITY, COLLECTIONS,
  BLEND_BASES, BLEND_NOTES, BLEND_SIZES, POPULAR_BLENDS, PAST_BLENDS, ZONES,
  TESTIMONIALS, FAQS, ARTICLES, DELIVERY_PROMO, QUIZ, PAGES
} from "./data";
import { money, waLink, sizeLabel, esc } from "./utils";

/* ---------------- storage & state ---------------- */
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };

export const state = {
  cart: load("imibavu_cart", []),
  wish: load("imibavu_wish", []),
  orders: load("imibavu_orders", []),
  blends: load("imibavu_blends", []),
  user: load("imibavu_user", null),
  userReviews: load("imibavu_reviews", {}),
  reviews: {},
  reviewLoaded: {},
  loyalty: null,
  alerts: load("imibavu_alerts", []),
  hidden: load("imibavu_hidden", []),
  stock: load("imibavu_stock", {}),
  promos: load("imibavu_promos", [{ code: "IMIBAVU5", type: "shipping", label: "Free downtown delivery", active: true }]),
  filter: { cat: "", brand: "", gender: "", family: "", longevity: "", col: "", q: "", min: "", max: "", sort: "trending" },
  quiz: { step: 0, a: { mood: "", season: "", notes: [] }, results: null },
  pd: { size: 0, img: 0, qty: 1 },
  curProduct: PRODUCTS[0] || null,
  acc: { tab: "orders", signed: false, phone: "", authMode: "login", devCode: "", pendingPhone: "", pendingUser: null },
  adm: { tab: "products", products: [], orders: [], reviews: [], reviewsLoaded: false },
  orderFetched: {},
  blendBase: null,
  blendNotes: null,
  blendSize: null,
  blendName: "",
  panel: { cart: false, mobile: false, search: false },
  lang: getLang(),
  toast: null,
  filtersVisible: typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
};

/* ---------------- subscribe / notify ---------------- */
let version = 0;
const listeners = new Set();
export function notify() { version += 1; listeners.forEach(l => l()); }
export function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }
export function getVersion() { return version; }
export function useStore() { return useSyncExternalStore(subscribe, getVersion, getVersion); }

/* ---------------- i18n bridge ---------------- */
export function setLang(lang) {
  setLangVar(lang);
  state.lang = getLang();
  notify();
}

/* ---------------- toast & panels ---------------- */
let toastTimer = null;
export function toast(msg) {
  state.toast = { msg, id: (state.toast && state.toast.id + 1) || 1 };
  notify();
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { state.toast = null; notify(); }, 3200);
}

export function openPanel(name) { state.panel[name] = true; notify(); }
export function closePanels() { state.panel = { cart: false, mobile: false, search: false }; notify(); }

/* ---------------- navigation ---------------- */
export function go(hash) {
  if (typeof window !== "undefined") window.location.hash = hash;
}

export function parseHash() {
  const raw = (typeof window !== "undefined" ? window.location.hash.slice(1) : "/") || "/";
  const [path, qs] = raw.split("?");
  return { path, params: new URLSearchParams(qs || "") };
}

/* ---------------- utils ---------------- */
export const prod = id => PRODUCTS.find(p => p.id === id);
export const vis = p => !state.hidden.includes(p.id);
export const stockOf = p => state.stock[p.id] || p.stock;
export const cartCount = () => state.cart.reduce((n, i) => n + i.qty, 0);
export function cartSubtotal() {
  return state.cart.reduce((n, i) => { const p = prod(i.pid); return n + (p ? p.sizes[i.size][1] * i.qty : 0); }, 0);
}
export const brandName = id => (BRANDS.find(b => b.id === id) || {}).name || id;

/* Mirror the local cart to the server (guest or signed-in). Best-effort. */
export function syncCart() {
  const items = state.cart.map(i => {
    const p = prod(i.pid); if (!p) return null;
    return { slug: p.id, sizeLabel: sizeLabel(p.sizes[i.size]), qty: i.qty };
  }).filter(Boolean);
  return api.put("/cart", { items }).catch(() => {});
}

/* -------- cart -------- */
export function addToCart(pid, size = 0, qty = 1) {
  const p = prod(pid); if (!p) return;
  if (stockOf(p) === "out") { toast(t("out_stock")); return; }
  const found = state.cart.find(i => i.pid === pid && i.size === size);
  if (found) found.qty += qty; else state.cart.push({ pid, size, qty });
  save("imibavu_cart", state.cart);
  syncCart();
  notify();
  toast(`${p.name} — ${t("add_cart")} ✓`);
}

export function setQty(idx, d) {
  if (!state.cart[idx]) return;
  state.cart[idx].qty += d;
  if (state.cart[idx].qty <= 0) state.cart.splice(idx, 1);
  save("imibavu_cart", state.cart);
  syncCart();
  notify();
}

export function cartRemove(idx) {
  state.cart.splice(idx, 1);
  save("imibavu_cart", state.cart);
  syncCart();
  notify();
}

/* -------- wishlist (server sync, best-effort) -------- */
export function loadWishlist() {
  return api.get("/wishlist")
    .then(async r => {
      const server = r.slugs || [];
      const local = state.wish.filter(s => !server.includes(s));
      for (const s of local) { try { await api.post("/wishlist", { slug: s }); } catch (e) { /* keep going */ } }
      state.wish = server.concat(local);
      save("imibavu_wish", state.wish);
      notify();
    })
    .catch(() => {});
}

export function mergeWishlist() {
  if (!api.getAccessToken()) return Promise.resolve();
  return api.post("/wishlist/merge", { guestId: api.guestId(), slugs: state.wish })
    .then(r => {
      if (Array.isArray(r.slugs)) {
        state.wish = r.slugs; save("imibavu_wish", state.wish);
        notify();
      }
    })
    .catch(() => {});
}

export function toggleWish(id) {
  const i = state.wish.indexOf(id);
  if (i >= 0) {
    state.wish.splice(i, 1); toast("Removed from wishlist");
    api.del("/wishlist/" + encodeURIComponent(id)).catch(() => {});
  } else {
    state.wish.push(id); toast("Saved to wishlist ♥");
    api.post("/wishlist", { slug: id }).catch(() => {});
  }
  save("imibavu_wish", state.wish);
  notify();
}

/* -------- reviews (server-backed) -------- */
export function loadReviews(slug) {
  if (state.reviewLoaded[slug]) return Promise.resolve();
  state.reviewLoaded[slug] = true;
  return api.get("/reviews/product/" + encodeURIComponent(slug))
    .then(r => { state.reviews[slug] = r.reviews || []; notify(); })
    .catch(() => {});
}

export function submitReview(id, values) {
  const entry = { name: String(values.name || "").trim(), stars: +values.stars, text: String(values.text || "").trim(), pending: true, approved: null };
  state.userReviews[id] = state.userReviews[id] || [];
  state.userReviews[id].unshift(entry);
  save("imibavu_reviews", state.userReviews);
  toast("Review submitted — thank you!");
  api.post("/reviews/product/" + encodeURIComponent(id), { name: entry.name, stars: entry.stars, text: entry.text }).catch(() => {});
  notify();
}

/* -------- loyalty -------- */
export function loadLoyalty() {
  if (!api.getAccessToken()) return Promise.resolve();
  return api.get("/loyalty")
    .then(r => { state.loyalty = r.loyalty || null; notify(); })
    .catch(() => {});
}

/* -------- blends -------- */
function mapServerBlend(b) {
  return { id: b.id, name: b.name, baseLabel: b.baseLabel, notes: [...(b.notes || [])], sizeLabel: b.sizeLabel };
}

export function loadBlends() {
  return api.get("/blends")
    .then(r => {
      const server = (r.blends || []).map(mapServerBlend);
      const localOnly = state.blends.filter(b => !b.id);
      state.blends = server.concat(localOnly);
      save("imibavu_blends", state.blends);
      notify();
    })
    .catch(() => {});
}

export const blendCalc = () => {
  const base = BLEND_BASES.find(b => b.id === (state.blendBase || POPULAR_BLENDS[0].base)) || BLEND_BASES[0];
  const size = BLEND_SIZES[state.blendSize ?? 1] || BLEND_SIZES[1];
  const notes = state.blendNotes || [];
  return { base, size, notes, total: base.price + size.price };
};

export function blendBaseSet(v) { state.blendBase = v; notify(); }
export function blendNote(v) {
  const arr = state.blendNotes || (state.blendNotes = []);
  if (arr.includes(v)) arr.splice(arr.indexOf(v), 1);
  else if (arr.length < 3) arr.push(v);
  else toast("Maximum 3 notes — remove one first");
  notify();
}
export function blendSizeSet(i) { state.blendSize = i; notify(); }
export function blendNameSet(v) { state.blendName = v; notify(); }

export function blendSave() {
  const name = (state.blendName || "").trim() || "My blend";
  const { base, size, notes } = blendCalc();
  if (notes.length < 2) { toast("Choose at least 2 notes"); return; }
  const entry = { name, baseLabel: base.label, notes: [...notes], sizeLabel: size.label };
  state.blends.push(entry);
  save("imibavu_blends", state.blends);
  api.post("/blends", { name, baseId: base.id, notes, sizeIndex: BLEND_SIZES.indexOf(size) })
    .then(r => { if (r && r.blend) { entry.id = r.blend.id; save("imibavu_blends", state.blends); } })
    .catch(() => {});
  toast(`"${name}" saved ✓`);
  notify();
}

export function pickCombo(i) {
  const b = POPULAR_BLENDS[i];
  if (!b) return;
  state.blendBase = b.base; state.blendNotes = [...b.notes]; state.blendSize = b.size; state.blendName = b.name;
  notify();
}

export function blendLoad(i) {
  const b = state.blends[i];
  if (!b) return;
  state.blendNotes = [...b.notes]; state.blendName = b.name;
  const bi = BLEND_BASES.findIndex(x => x.label === b.baseLabel); if (bi >= 0) state.blendBase = BLEND_BASES[bi].id;
  const si = BLEND_SIZES.findIndex(x => x.label === b.sizeLabel); if (si >= 0) state.blendSize = si;
  notify();
}

export function blendDel(i) {
  const b = state.blends[i];
  state.blends.splice(i, 1); save("imibavu_blends", state.blends);
  if (b && b.id) api.del("/blends/" + b.id).catch(() => {});
  notify();
}

export function bookSession(values) {
  const payload = {
    name: String(values.name || "").trim(),
    phone: String(values.phone || "").trim(),
    date: String(values.date || ""),
    time: String(values.time || ""),
    msg: String(values.msg || ""),
  };
  const msg = `Hello Imibavu Collection, I would like to book a blending session:\n• Name: ${payload.name}\n• Phone: ${payload.phone}\n• Date: ${payload.date} at ${payload.time}\n• Notes: ${payload.msg || "—"}`;
  toast(t("book_sent"));
  window.open(waLink(msg), "_blank", "noopener");
  api.post("/bookings", payload).catch(() => {});
}

export function newsSignup() { toast(t("subscribed")); }

/* -------- product page -------- */
export function setPdSize(i) { state.pd.size = i; notify(); }
export function setPdImg(i) { state.pd.img = i; notify(); }
export function setPdQty(d) { state.pd.qty = Math.max(1, (state.pd.qty || 1) + d); notify(); }
export function setCurProduct(id) {
  const p = prod(id);
  if (p) { state.curProduct = p; state.pd = { size: 0, img: 0, qty: 1 }; notify(); }
  return p;
}

export function shareProduct(id) {
  const p = prod(id); if (!p) return;
  const url = (typeof window !== "undefined" ? window.location.origin + window.location.pathname : "") + "#/product/" + p.id;
  if (navigator.share) navigator.share({ title: `${p.name} — Imibavu Collection`, text: p.desc, url }).catch(() => { });
  else { navigator.clipboard && navigator.clipboard.writeText(url); toast("Link copied to clipboard"); }
}

export function backInStock(id) {
  state.alerts.push({ id, at: Date.now() }); save("imibavu_alerts", state.alerts);
  toast("We will message you on WhatsApp when it is back ✓");
  notify();
}

export function zoomImg(src) {
  const w = window.open("", "_blank");
  if (w) { w.document.write(`<img src="${src}" style="max-width:100%;margin:auto;display:block">`); w.document.title = "Imibavu"; }
}

/* -------- shop filters -------- */
export function setFilter(key, val) {
  state.filter[key] = state.filter[key] === val && val !== "" ? "" : val;
  notify();
}
export function setFilterDirect(key, val) { state.filter[key] = val; notify(); }
export function clearFilters() {
  state.filter = { cat: "", brand: "", gender: "", family: "", longevity: "", col: "", q: "", min: "", max: "", sort: "trending" };
  if (parseHash().path === "/shop") window.history.replaceState(null, "", "#/shop");
  notify();
}
export function setSort(v) { state.filter.sort = v; notify(); }
export function setSearchQuery(q) { state.filter.q = q; notify(); }
export function toggleFilters() { state.filtersVisible = !state.filtersVisible; notify(); }

export function applyShopNav(prm) {
  const f = state.filter;
  f.cat = prm.cat || "";
  f.col = prm.col || "";
  f.brand = prm.brand || "";
  f.q = prm.q || "";
  notify();
}

export function applyBrandNav(brand) {
  state.filter.brand = brand || "";
  notify();
}

export function filterProducts() {
  const f = state.filter;
  let list = PRODUCTS.filter(vis);
  if (f.cat) list = list.filter(p => p.category === f.cat);
  if (f.brand) list = list.filter(p => p.brand === f.brand);
  if (f.gender) list = list.filter(p => p.gender === f.gender);
  if (f.family) list = list.filter(p => p.family === f.family);
  if (f.longevity) list = list.filter(p => p.longevity === f.longevity);
  if (f.col) { const c = COLLECTIONS.find(x => x.id === f.col); if (c) list = list.filter(c.match); }
  if (f.min !== "" && !isNaN(+f.min)) list = list.filter(p => p.price >= +f.min);
  if (f.max !== "" && !isNaN(+f.max)) list = list.filter(p => p.price <= +f.max);
  if (f.q) {
    const q = f.q.toLowerCase();
    list = list.filter(p => (p.name + " " + brandName(p.brand) + " " + p.family + " " + p.gender + " " + p.desc + " " + p.notes.top.join(" ") + " " + p.notes.heart.join(" ") + " " + p.notes.base.join(" ")).toLowerCase().includes(q));
  }
  const s = f.sort;
  if (s === "asc") list.sort((a, b) => a.price - b.price);
  else if (s === "desc") list.sort((a, b) => b.price - a.price);
  else if (s === "newest") list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
  else list.sort((a, b) => (b.trending ? 1 : 0) - (a.trending ? 1 : 0) || b.rating - a.rating);
  return list;
}

/* -------- quiz -------- */
function quizResultsCore() {
  const a = state.quiz.a;
  const score = p => {
    let s = 0;
    if (a.mood === "fresh" && ["Fresh", "Citrus"].includes(p.family)) s += 3;
    if (a.mood === "sweet" && ["Sweet", "Floral"].includes(p.family)) s += 3;
    if (a.mood === "oud" && ["Oud", "Woody", "Amber"].includes(p.family)) s += 3;
    if (a.mood === "musky" && ["Musky", "Floral"].includes(p.family)) s += 3;
    const allNotes = [...p.notes.top, ...p.notes.heart, ...p.notes.base];
    a.notes.forEach(n => { if (allNotes.some(x => x.toLowerCase().includes(n.toLowerCase()))) s += 2; });
    if (a.season === "summer" && (p.season.includes("Summer") || p.family === "Fresh" || p.family === "Citrus")) s += 2;
    if (a.season === "evening" && p.season.includes("Evening")) s += 2;
    if (a.season === "day" && (p.season.includes("Office") || p.season.includes("Day"))) s += 2;
    if (a.season === "winter" && (p.season.includes("Winter") || p.longevity === "long")) s += 2;
    s += p.rating / 2;
    return s;
  };
  return PRODUCTS.filter(vis).map(p => ({ p, s: score(p) })).sort((x, y) => y.s - x.s).slice(0, 3).map(x => x.p);
}

function fetchQuizResults() {
  const a = state.quiz.a;
  api.post("/scent-finder/recommend", { mood: a.mood, season: a.season, notes: a.notes })
    .then(r => {
      const ids = (r.results || []).map(p => p.id).filter(id => prod(id));
      if (ids.length) { state.quiz.results = ids; notify(); }
    })
    .catch(() => {});
}

export function quizPick(key, val) {
  if (key === "notes") {
    const arr = state.quiz.a.notes;
    if (arr.includes(val)) arr.splice(arr.indexOf(val), 1);
    else if (arr.length < 3) arr.push(val);
    else toast("Pick up to 3 notes");
  } else state.quiz.a[key] = val;
  notify();
}

export function quizNext() {
  const q = state.quiz;
  if (q.step === 0 && !q.a.mood) { toast("Pick a mood to continue"); return; }
  if (q.step === 1 && !q.a.season) { toast("Pick when you will wear it"); return; }
  if (q.step === 2 && !q.a.notes.length) { toast("Pick at least one note"); return; }
  q.step++;
  if (q.step >= 3) fetchQuizResults();
  notify();
}

export function quizBack() { state.quiz.step = Math.max(0, state.quiz.step - 1); notify(); }
export function quizRestart() { state.quiz = { step: 0, a: { mood: "", season: "", notes: [] }, results: null }; notify(); }
export function quizResults() {
  return state.quiz.results ? state.quiz.results.map(prod).filter(Boolean) : quizResultsCore();
}

/* -------- auth -------- */
function normPhone(raw) {
  let p = String(raw || "").replace(/[\s\-().]/g, "");
  if (/^0\d{9}$/.test(p)) p = "+250" + p.slice(1);
  if (/^250\d{9}$/.test(p)) p = "+" + p;
  return p;
}
const toState = u => ({ id: u.id, name: u.name, phone: u.phone, email: u.email, role: u.role, isVerified: u.isVerified });

function afterAuth() {
  loadBlends();
  mergeWishlist();
  loadLoyalty();
}

export function authMode(mode) { state.acc.authMode = mode; state.acc.devCode = ""; notify(); }

export function login(values) {
  return api.post("/auth/login", {
    identifier: String(values.id || "").trim(),
    password: values.password,
  }).then(async r => {
    api.setAccessToken(r.accessToken);
    state.user = toState(r.user); save("imibavu_user", state.user);
    try { await api.post("/cart/merge", { guestId: api.guestId() }); } catch (e) {}
    afterAuth();
    state.acc.authMode = "login"; state.acc.devCode = "";
    toast("Signed in ✓");
    notify();
  });
}

export function register(values) {
  const payload = {
    name: String(values.name || "").trim(),
    phone: normPhone(values.phone),
    password: values.password,
  };
  const email = String(values.email || "").trim();
  if (email) payload.email = email;
  return api.post("/auth/register", payload).then(r => {
    api.setAccessToken(r.accessToken);
    state.acc.pendingPhone = r.user.phone || "";
    state.acc.pendingUser = toState(r.user);
    state.acc.devCode = (r.otp && r.otp.devCode) || "";
    if (!r.user.phone) {
      state.user = state.acc.pendingUser; save("imibavu_user", state.user);
      try { api.post("/cart/merge", { guestId: api.guestId() }).catch(() => {}); } catch (e) {}
      afterAuth();
      toast("Account created ✓");
      notify();
      return;
    }
    state.acc.authMode = "verify";
    toast("Account created — verify your phone");
    notify();
  });
}

export function verify(code) {
  return api.post("/auth/otp/verify", { phone: state.acc.pendingPhone, code: String(code || "").trim() })
    .then(() => {
      if (state.acc.pendingUser) { state.user = state.acc.pendingUser; save("imibavu_user", state.user); try { api.post("/cart/merge", { guestId: api.guestId() }).catch(() => {}); } catch (e) {} }
      afterAuth();
      state.acc.pendingUser = null; state.acc.devCode = ""; state.acc.authMode = "login";
      toast("Phone verified ✓");
      notify();
    });
}

export function resetPassword(values) {
  return api.post("/auth/reset-password", {
    phone: normPhone(values.phone),
    code: String(values.code || "").trim(),
    newPassword: values.password,
  }).then(() => {
    state.acc.authMode = "login"; state.acc.devCode = "";
    toast("Password changed — sign in");
    notify();
  });
}

export function otpResend() {
  api.post("/auth/otp/send", { phone: state.acc.pendingPhone, purpose: "verify_phone" })
    .then(r => { state.acc.devCode = r.devCode || ""; toast("Code sent"); notify(); })
    .catch(err => toast(err.message || "Could not send code"));
}

export function forgotPassword(values) {
  return api.post("/auth/forgot-password", { phone: normPhone(values.phone) })
    .then(r => { state.acc.devCode = r.devCode || ""; toast(r.devCode ? "Code sent (console)" : "If that number has an account, a code is on its way"); notify(); })
    .catch(err => toast(err.message || "Could not send code"));
}

export function logout() {
  api.logout();
  state.user = null; save("imibavu_user", null);
  state.acc.authMode = "login"; state.acc.devCode = "";
  state.loyalty = null;
  notify();
}

export function accTab(k) { state.acc.tab = k; notify(); }

/* -------- orders -------- */
export function placeOrder(values, onDone) {
  const zone = ZONES.find(z => z.id === values.zone) || ZONES[0];
  const sub = cartSubtotal();
  const fee = zone.id === "pickup" || sub >= 60000 ? 0 : zone.fee;
  const payMap = { momo: "momo", cash: "cash", pickup: "pickup" };
  const payLabel = { momo: t("pay_momo"), cash: t("pay_cash"), pickup: t("pay_pickup") }[values.pay] || "momo";

  const payload = {
    name: String(values.name || "").trim(),
    phone: String(values.phone || "").trim(),
    email: String(values.email || "").trim(),
    note: String(values.note || "").slice(0, 500),
    zone: zone.id,
    payment: payMap[values.pay] || "momo",
    promo: String(values.promo || "").toUpperCase(),
    loyaltyPoints: Math.max(0, Math.floor(Number(values.loyaltyPoints) || 0)),
    guestId: api.guestId(),
    items: state.cart.map(i => {
      const p = prod(i.pid);
      return { slug: p.id, sizeLabel: sizeLabel(p.sizes[i.size]), qty: i.qty };
    }),
  };

  api.post("/orders", payload)
    .then(r => {
      const code = r.order.code;
      const order = {
        code,
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        zone: payload.zone,
        zoneLabel: r.order.zoneLabel || zone.label,
        payment: payLabel,
        paymentRaw: payload.payment,
        paymentStatus: r.order.paymentStatus || "unpaid",
        note: payload.note,
        promo: payload.promo,
        items: r.order.items,
        total: r.order.total,
        discount: r.order.discount || 0,
        loyaltyPoints: r.order.loyaltyPoints || 0,
        pointsEarned: r.order.pointsEarned || 0,
        deliveryFee: r.order.deliveryFee,
        subtotal: r.order.subtotal,
        status: r.order.status || "Received",
        date: new Date(r.order.date || Date.now()).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
      };
      state.orders.unshift(order);
      save("imibavu_orders", state.orders);
      if (!state.user && payload.name) {
        state.user = { phone: payload.phone, name: payload.name };
        save("imibavu_user", state.user);
      }
      state.cart = [];
      save("imibavu_cart", state.cart);
      state.loyalty = null;
      syncCart();
      notify();

      const whatsapp = () => {
        try {
          const waMsg = `Hello Imibavu Collection, I just placed an order:\nOrder: ${code}\nName: ${order.name}\nPhone: ${order.phone}\nTotal: ${money(order.total)}\nItems:\n${order.items.map(x => `• ${x.name} (${x.size}) × ${x.qty} — ${money(x.price * x.qty)}`).join("\n")}\nZone: ${order.zoneLabel}`;
          window.open(waLink(waMsg), "_blank", "noopener");
        } catch (e) {}
      };
      const online = ["momo", "card"].includes(payload.payment);
      if (online) {
        toast("Order placed ✓ — starting secure payment…");
        api.post("/payments/initiate", { orderId: code, method: payload.payment, phone: payload.phone })
          .then(init => {
            if (init && init.checkoutUrl) {
              toast(init.mode === "console" ? "Dev mode — opening mock payment…" : "Redirecting to secure payment…");
              window.location.href = init.checkoutUrl;
            } else {
              toast("Order placed ✓ — opening WhatsApp");
              whatsapp();
              go("#/order/" + code);
            }
          })
          .catch(() => { toast("Order placed ✓ — opening WhatsApp"); whatsapp(); go("#/order/" + code); });
      } else {
        toast("Order placed ✓ — opening WhatsApp");
        whatsapp();
        go("#/order/" + code);
      }
      if (onDone) onDone();
    })
    .catch(err => {
      toast((err && err.message) || "Could not place order — please try again");
      if (onDone) onDone(err);
    });
}

export function fetchOrder(code) {
  state.orderFetched[code] = true;
  api.get("/orders/" + encodeURIComponent(code)).then(r => {
    if (r && r.order) {
      const fresh = { ...r.order, code: r.order.code, date: new Date(r.order.date || Date.now()).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) };
      const i = state.orders.findIndex(x => x.code === code);
      if (i >= 0) state.orders[i] = fresh; else state.orders.unshift(fresh);
      save("imibavu_orders", state.orders);
      notify();
    }
  }).catch(() => {});
}

export function payForOrder(code) {
  const o = state.orders.find(x => x.code === code) || {};
  toast("Starting secure payment…");
  api.post("/payments/initiate", { orderId: code, method: o.paymentRaw || (String(o.payment || "").toLowerCase().includes("momo") ? "momo" : "card"), phone: o.phone })
    .then(init => {
      if (init && init.checkoutUrl) window.location.href = init.checkoutUrl;
      else toast("Could not start payment — opening WhatsApp");
    })
    .catch(err => toast((err && err.message) || "Could not start payment"));
}

/* -------- admin -------- */
export function loadAdminData() {
  if (!api.getAccessToken()) return;
  if (!state.adm.products.length || !state.adm.orders.length) {
    setTimeout(() => {
      Promise.all([
        api.get("/admin/products").catch(() => null),
        api.get("/admin/orders").catch(() => null),
      ]).then(([p, o]) => { if (p) state.adm.products = p.items; if (o) state.adm.orders = o.items; notify(); });
    }, 0);
  }
  if (state.adm.tab === "reviews" && !state.adm.reviewsLoaded) {
    state.adm.reviewsLoaded = true;
    setTimeout(() => {
      api.get("/admin/reviews").catch(() => null).then(r => {
        if (r) { state.adm.reviews = r.items; notify(); }
      });
    }, 0);
  }
}

export function admTab(k) { state.adm.tab = k; notify(); }

export function admHide(id) {
  const i = state.hidden.indexOf(id);
  if (i >= 0) state.hidden.splice(i, 1); else state.hidden.push(id);
  save("imibavu_hidden", state.hidden); notify();
}

export function admStock(id) {
  const p = prod(id), cur = stockOf(p);
  state.stock[p.id] = cur === "in" ? "out" : cur === "out" ? "in" : "in";
  save("imibavu_stock", state.stock); notify();
}

export function admPrice(id, v) {
  const p = prod(id);
  if (v && !isNaN(+v)) { p.price = +v; p.sizes = p.sizes.map(s => [s[0], +v]); toast("Price updated"); notify(); }
}

export function admBulk(raw) {
  const csv = (raw || "").trim();
  if (!csv) { toast("Paste some CSV rows first"); return; }
  let n = 0;
  csv.split("\n").forEach(line => {
    const [name, brand, category, price, color] = line.split(",").map(s => (s || "").trim());
    if (!name || !price) return;
    PRODUCTS.push({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36),
      name, brand: BRANDS.some(b => b.id === brand) ? brand : "imibavu",
      category: ["perfumes", "oils", "jewelry"].includes(category) ? category : "perfumes",
      gender: "Unisex", family: "Woody", longevity: "moderate",
      price: +price, sizes: [["50", +price]], stock: "in", trending: false, isNew: true, inspired: null,
      color: /^#[0-9a-f]{6}$/i.test(color || "") ? color : "#6b4f2f",
      notes: { top: [], heart: [], base: [] }, rating: 4.5, reviews: 0,
      season: "All year", desc: "Newly added to the Imibavu catalog."
    });
    n++;
  });
  toast(`${n} product(s) imported`); notify();
}

export function admStatus(i, v) {
  state.orders[i].status = v; save("imibavu_orders", state.orders);
  toast("Order status: " + v); notify();
}

export function admOrderStatus(code, v) {
  let hit = state.orders.find(x => x.code === code);
  if (hit) { hit.status = v; save("imibavu_orders", state.orders); }
  const srv = state.adm.orders.find(x => x.code === code);
  if (srv) srv.status = v;
  toast("Order status: " + v); notify();
}

export function admPromo(i) {
  state.promos[i].active = !state.promos[i].active;
  save("imibavu_promos", state.promos); notify();
}

export function admPromoAdd(code, label) {
  const c = (code || "").trim().toUpperCase();
  if (!c) { toast("Enter a code"); return; }
  state.promos.push({ code: c, label: label || "Custom offer", active: true });
  save("imibavu_promos", state.promos); toast("Promo created"); notify();
}

export function admRev2(id) {
  const r = (state.adm.reviews || []).find(x => x._id === id);
  if (r) {
    const next = r.status === "hidden" ? "approved" : "hidden";
    api.patch("/admin/reviews/" + id, { status: next }).then(() => { r.status = next; notify(); }).catch(() => {});
  }
}

/* -------- boot -------- */
function withTimeout(p, ms) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

async function restoreSession() {
  if (!state.user || !state.user.id) return false;
  try {
    const r = await api.refresh();
    if (r && r.user) {
      state.user = { id: r.user.id, name: r.user.name, phone: r.user.phone, email: r.user.email, role: r.user.role, isVerified: r.user.isVerified };
      save("imibavu_user", state.user);
      return true;
    }
  } catch (e) {}
  return false;
}

async function loadCatalog() {
  try {
    const first = await api.get("/products?limit=100&sort=featured");
    let items = first.items || [];
    for (let page = 2; page <= (first.pages || 1); page++) {
      const next = await api.get(`/products?limit=100&page=${page}&sort=featured`);
      items = items.concat(next.items || []);
    }
    if (items.length) { PRODUCTS.splice(0, PRODUCTS.length, ...items); }
    const brands = await api.get("/brands");
    if (brands.items && brands.items.length) { BRANDS.splice(0, BRANDS.length, ...brands.items); }
    notify();
  } catch (e) { /* keep static data fallback */ }
}

export function init() {
  Promise.all([
    withTimeout(restoreSession(), 2500).catch(() => {}),
    withTimeout(loadCatalog(), 3000).catch(() => {}),
  ]).then(() => {
    syncCart().catch(() => {});
    loadBlends();
    loadWishlist();
    if (state.user && state.user.id) loadLoyalty();
    notify();
  });
}