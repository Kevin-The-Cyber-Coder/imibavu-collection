/* Imibavu Collection — shared helpers */
import { BRANDS, WA_NUM } from "./data";

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const money = n => new Intl.NumberFormat("en-US").format(Math.round(n)) + " RWF";

export const stars = r => "★★★★★".slice(0, Math.round(r)) + "☆☆☆☆☆".slice(0, 5 - Math.round(r));

export const waLink = m => `https://wa.me/${WA_NUM}?text=${encodeURIComponent(m)}`;

export const sizeLabel = s => typeof s[0] === "number" ? s[0] + " ml" : String(s[0]);

export const brandName = id => (BRANDS.find(b => b.id === id) || {}).name || id;

export const prodUrl = p => (typeof window !== "undefined" ? window.location.origin + window.location.pathname : "") + "#/product/" + p.id;

export const waProductMsg = (p, sizeIdx = 0) =>
  `Hello Imibavu Collection, I would like to order:\n• ${p.name} — ${brandName(p.brand)}\n• Size: ${sizeLabel(p.sizes[sizeIdx])} — ${money(p.sizes[sizeIdx][1])}\n• ${prodUrl(p)}\n\nIs it available?`;

/* ---- generated product art (offline fallback / legacy renderer) ---- */
const hex2rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mix = (h, amt) => {
  const [r, g, b] = hex2rgb(h);
  const f = c => Math.max(0, Math.min(255, Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
};

export function productImg(p, v = 0) {
  const c = p.color;
  const bgA = mix(c, v === 1 ? -0.55 : -0.35);
  const bgB = mix(c, v === 2 ? 0.28 : 0.1);
  const glass = mix(c, 0.18);
  const cap = v === 3 ? "#2a2620" : "#d9c08a";
  let art = "";
  if (p.category === "jewelry") {
    art = `
      <circle cx="300" cy="330" r="128" fill="none" stroke="${glass}" stroke-width="14"/>
      <circle cx="300" cy="330" r="104" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="3"/>
      <path d="M300 202 q-64 96 0 190 q64 -94 0 -190" fill="none" stroke="${cap}" stroke-width="6"/>
      <circle cx="300" cy="452" r="34" fill="${cap}"/>
      <circle cx="290" cy="442" r="10" fill="rgba(255,255,255,.5)"/>`;
  } else if (p.category === "oils") {
    art = `
      <rect x="238" y="330" width="124" height="250" rx="46" fill="${glass}"/>
      <rect x="238" y="330" width="124" height="250" rx="46" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3"/>
      <rect x="262" y="248" width="76" height="92" rx="16" fill="${cap}"/>
      <rect x="278" y="322" width="44" height="22" rx="6" fill="rgba(0,0,0,.35)"/>
      <rect x="256" y="420" width="88" height="96" rx="8" fill="rgba(255,255,255,.82)"/>
      <text x="300" y="462" text-anchor="middle" font-family="Georgia,serif" font-size="21" fill="#1d1712">${esc(p.name.split(" ")[0])}</text>
      <text x="300" y="490" text-anchor="middle" font-family="Arial" font-size="11" letter-spacing="3" fill="#8b7350">OIL</text>`;
  } else {
    art = `
      <rect x="176" y="262" width="248" height="326" rx="34" fill="${glass}"/>
      <rect x="176" y="262" width="248" height="326" rx="34" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3"/>
      <rect x="252" y="166" width="96" height="104" rx="14" fill="${cap}"/>
      <rect x="276" y="244" width="48" height="30" rx="6" fill="rgba(0,0,0,.32)"/>
      <rect x="204" y="360" width="192" height="150" rx="10" fill="rgba(255,255,255,.86)"/>
      <text x="300" y="416" text-anchor="middle" font-family="Arial" font-size="12" letter-spacing="5" fill="#a08149">${esc(brandName(p.brand).toUpperCase())}</text>
      <text x="300" y="456" text-anchor="middle" font-family="Georgia,serif" font-size="30" fill="#171310">${esc(p.name.split(" ").slice(0, 2).join(" "))}</text>
      <line x1="248" y1="474" x2="352" y2="474" stroke="#c9a86a" stroke-width="2"/>
      <text x="300" y="496" text-anchor="middle" font-family="Arial" font-size="11" letter-spacing="3" fill="#6b6156">EAU DE PARFUM</text>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750" width="600" height="750">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bgA}"/><stop offset="1" stop-color="${bgB}"/></linearGradient>
      <radialGradient id="r" cx="75%" cy="18%" r="70%">
      <stop offset="0" stop-color="rgba(255,255,255,.35)"/><stop offset="1" stop-color="rgba(255,255,255,0)"/></radialGradient></defs>
    <rect width="600" height="750" fill="url(#g)"/><rect width="600" height="750" fill="url(#r)"/>
    <ellipse cx="300" cy="640" rx="180" ry="26" fill="rgba(0,0,0,.28)"/>
    ${art}
    <text x="46" y="76" font-family="Arial" font-size="14" letter-spacing="6" fill="rgba(255,255,255,.7)">IMIBAVU</text>
    <text x="554" y="700" text-anchor="end" font-family="Arial" font-size="13" letter-spacing="3" fill="rgba(255,255,255,.6)">${esc(p.name.toUpperCase())}</text>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/* ---- real photo placeholders (swap real product photos in later) ----
   Stable per product via the seed; ProductImage falls back to the art on error. */
export const realImg = (seed, w = 600, h = 750) =>
  `https://picsum.photos/seed/${encodeURIComponent(String(seed))}/${w}/${h}`;

export const neutralImg = () =>
  "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750"><defs><linearGradient id="n" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a332b"/><stop offset="1" stop-color="#16120e"/></linearGradient></defs><rect width="600" height="750" fill="url(#n)"/><text x="300" y="380" text-anchor="middle" font-family="Georgia,serif" font-size="34" fill="#c9a86a">Imibavu</text><text x="300" y="410" text-anchor="middle" font-family="Arial" font-size="13" letter-spacing="4" fill="#a99e8e">COLLECTION</text></svg>`
  );