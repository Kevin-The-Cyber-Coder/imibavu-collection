const Product = require("../models/Product");
const ScentProfile = require("../models/ScentProfile");
const asyncHandler = require("../utils/asyncHandler");
const { resolveOwner } = require("../utils/owner");
const { toPublicProduct } = require("./products.controller");

const MOOD_FAMILIES = {
  fresh: ["Fresh", "Citrus"],
  sweet: ["Sweet", "Floral"],
  oud: ["Oud", "Woody", "Amber"],
  musky: ["Musky", "Floral"],
};

const ALLOWED_NOTES = ["Oud", "Vanilla", "Rose", "Musk", "Citrus", "Amber"];
const TOP = 3;

/* Same scoring rules as quizResults() in js/app.js, run server-side. */
function scoreProduct(p, a) {
  let s = 0;
  const fams = MOOD_FAMILIES[a.mood];
  if (fams && fams.includes(p.family)) s += 3;

  const allNotes = [...(p.notes?.top || []), ...(p.notes?.heart || []), ...(p.notes?.base || [])];
  for (const n of a.notes) {
    if (allNotes.some((x) => String(x).toLowerCase().includes(String(n).toLowerCase()))) s += 2;
  }

  const season = p.season || "";
  if (a.season === "summer" && (season.includes("Summer") || p.family === "Fresh" || p.family === "Citrus")) s += 2;
  if (a.season === "evening" && season.includes("Evening")) s += 2;
  if (a.season === "day" && (season.includes("Office") || season.includes("Day"))) s += 2;
  if (a.season === "winter" && (season.includes("Winter") || p.longevity === "long")) s += 2;

  return s + (p.rating || 0) / 2;
}

function cleanAnswers(body) {
  const mood = String(body.mood || "").toLowerCase();
  const season = String(body.season || "").toLowerCase();
  const notes = Array.isArray(body.notes)
    ? body.notes
        .map((n) => ALLOWED_NOTES.find((x) => x.toLowerCase() === String(n).toLowerCase()))
        .filter(Boolean)
        .slice(0, 3)
    : [];
  return { mood, season, notes };
}

async function recommendProducts(answers) {
  const products = await Product.find({ isActive: true }).limit(200);
  const scored = products
    .map((p) => ({ p: toPublicProduct(p), s: scoreProduct(toPublicProduct(p), answers) }))
    .sort((x, y) => y.s - x.s)
    .slice(0, TOP);
  return scored.map((x) => x.p);
}

const recommend = asyncHandler(async (req, res) => {
  const answers = cleanAnswers(req.body);
  const results = await recommendProducts(answers);

  let profile = null;
  const owner = resolveOwner(req);
  if (owner && req.body.save !== false) {
    profile = await ScentProfile.create({
      ...owner,
      mood: answers.mood,
      season: answers.season,
      notes: answers.notes,
      results: results.map((p) => p.slug),
    });
  }

  res.json({
    results,
    profile: profile ? { id: String(profile._id), mood: answers.mood, season: answers.season, notes: answers.notes } : null,
  });
});

const listProfiles = asyncHandler(async (req, res) => {
  const profiles = await ScentProfile.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(20);
  res.json({
    profiles: profiles.map((p) => ({
      id: String(p._id),
      mood: p.mood,
      season: p.season,
      notes: p.notes || [],
      results: p.results || [],
      createdAt: p.createdAt,
    })),
  });
});

module.exports = { recommend, listProfiles };
