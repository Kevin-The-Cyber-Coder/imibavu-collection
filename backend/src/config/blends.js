/* Custom-blend catalogue — mirrors the arrays in js/data.js so the API can
   price and validate blends authoritatively. */
const BLEND_BASES = [
  { id: "jojoba", label: "Jojoba Oil", price: 6000, note: "Light, odourless, best for daily wear" },
  { id: "sweet-almond", label: "Sweet Almond Oil", price: 5000, note: "Soft, nourishing, gentle on skin" },
  { id: "fractionated-coconut", label: "Fractionated Coconut", price: 5500, note: "Clear, non-greasy, long shelf life" },
  { id: "grapeseed", label: "Grapeseed Oil", price: 5000, note: "Thin and fast-absorbing" },
];

const BLEND_NOTES = [
  "Oud", "Rose", "Vanilla", "Sandalwood", "White Musk", "Amber",
  "Bergamot", "Jasmine", "Cardamom", "Leather", "Coconut", "Neroli",
  "Saffron", "Cedar", "Patchouli", "Tonka Bean",
];

const BLEND_SIZES = [
  { label: "10 ml Roll-On", price: 9000 },
  { label: "30 ml Bottle", price: 18000 },
  { label: "50 ml Bottle", price: 26000 },
];

const POPULAR_BLENDS = [
  { name: "Kigali Nights", base: "jojoba", notes: ["Oud", "Saffron", "Amber"], size: 1 },
  { name: "Soft Morning", base: "sweet-almond", notes: ["White Musk", "Vanilla", "Neroli"], size: 1 },
  { name: "Sandal Dusk", base: "fractionated-coconut", notes: ["Sandalwood", "Tonka Bean", "Rose"], size: 2 },
  { name: "Fresh Desk", base: "grapeseed", notes: ["Bergamot", "Cedar", "White Musk"], size: 1 },
];

const MAX_NOTES = 3;

const findBase = (id) =>
  BLEND_BASES.find((b) => b.id === String(id || "").toLowerCase()) || null;

const findSize = (index) => {
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= BLEND_SIZES.length) return null;
  return { index: i, ...BLEND_SIZES[i] };
};

/* Sanitise notes: keep only known notes, de-dupe, cap at MAX_NOTES. */
function cleanNotes(notes) {
  if (!Array.isArray(notes)) return [];
  const out = [];
  for (const raw of notes) {
    const match = BLEND_NOTES.find((n) => n.toLowerCase() === String(raw || "").trim().toLowerCase());
    if (match && !out.includes(match)) out.push(match);
    if (out.length >= MAX_NOTES) break;
  }
  return out;
}

/* Authoritative price for a blend. */
function priceBlend(baseId, sizeIndex) {
  const base = findBase(baseId);
  const size = findSize(sizeIndex);
  if (!base || !size) return null;
  return { base, size, total: base.price + size.price };
}

module.exports = {
  BLEND_BASES,
  BLEND_NOTES,
  BLEND_SIZES,
  POPULAR_BLENDS,
  MAX_NOTES,
  findBase,
  findSize,
  cleanNotes,
  priceBlend,
};
