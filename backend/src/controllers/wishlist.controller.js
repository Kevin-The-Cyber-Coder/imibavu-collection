const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { resolveOwner } = require("../utils/owner");

const requireOwner = (req) => {
  const owner = resolveOwner(req);
  if (!owner) throw ApiError.validation([{ path: "guestId", message: "guestId is required for guests" }]);
  return owner;
};

const listWishlist = asyncHandler(async (req, res) => {
  const owner = requireOwner(req);
  const items = await Wishlist.find(owner).sort({ createdAt: -1 }).limit(200);
  res.json({ slugs: items.map((w) => w.slug) });
});

const addToWishlist = asyncHandler(async (req, res) => {
  const owner = requireOwner(req);
  const slug = String(req.body.slug || "").toLowerCase();
  const product = await Product.findOne({ slug, isActive: true });
  if (!product) throw ApiError.notFound("Product not found");
  await Wishlist.updateOne({ ...owner, slug }, { $set: { ...owner, slug, product: product._id } }, { upsert: true });
  const items = await Wishlist.find(owner).sort({ createdAt: -1 }).limit(200);
  res.status(201).json({ slugs: items.map((w) => w.slug) });
});

const removeFromWishlist = asyncHandler(async (req, res) => {
  const owner = requireOwner(req);
  const slug = String(req.params.slug || "").toLowerCase();
  await Wishlist.deleteOne({ ...owner, slug });
  const items = await Wishlist.find(owner).sort({ createdAt: -1 }).limit(200);
  res.json({ slugs: items.map((w) => w.slug) });
});

/* Move a guest wishlist to the signed-in user right after login. */
const mergeWishlist = asyncHandler(async (req, res) => {
  const user = req.user.id;
  const guestId = String(req.body.guestId || "").slice(0, 64);
  const slugs = new Set((Array.isArray(req.body.slugs) ? req.body.slugs : []).map((s) => String(s).toLowerCase()));

  if (guestId) {
    const guestItems = await Wishlist.find({ guestId });
    guestItems.forEach((w) => slugs.add(w.slug));
    await Wishlist.deleteMany({ guestId });
  }

  for (const slug of slugs) {
    const product = await Product.findOne({ slug, isActive: true });
    if (!product) continue;
    await Wishlist.updateOne({ user, slug }, { $set: { user, slug, product: product._id } }, { upsert: true });
  }

  const items = await Wishlist.find({ user }).sort({ createdAt: -1 }).limit(200);
  res.json({ slugs: items.map((w) => w.slug) });
});

module.exports = { listWishlist, addToWishlist, removeFromWishlist, mergeWishlist };
