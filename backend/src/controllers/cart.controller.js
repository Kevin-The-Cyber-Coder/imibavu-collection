const Cart = require("../models/Cart");
const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const MAX_QTY = 50;

function resolveOwner(req) {
  if (req.user && req.user.id) return { user: req.user.id };
  const guestId = req.headers["x-guest-id"] || (req.body && req.body.guestId) || req.query.guestId;
  if (guestId) return { guestId: String(guestId).slice(0, 64) };
  return null;
}

function toPublicCart(cart) {
  const c = cart.toObject ? cart.toObject() : cart;
  return {
    items: (c.items || []).map((i) => ({
      id: String(i._id),
      pid: i.slug,
      slug: i.slug,
      name: i.name,
      image: i.image,
      variant: i.variant,
      sizeLabel: i.sizeLabel,
      sizePrice: i.sizePrice,
      priceAtAdd: i.priceAtAdd,
      qty: i.qty,
    })),
    subtotal: c.subtotal || 0,
    total: c.total || 0,
    currency: c.currency || "RWF",
    count: (c.items || []).reduce((n, i) => n + i.qty, 0),
  };
}

async function findOrCreate(owner) {
  let cart = await Cart.findOne(owner);
  if (!cart) {
    try {
      cart = await Cart.create({ ...owner, items: [] });
    } catch (err) {
      if (err && err.code === 11000) cart = await Cart.findOne(owner);
      else throw err;
    }
  }
  return cart;
}

const getCart = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  if (!owner) throw ApiError.validation([{ path: "guestId", message: "guestId is required for guests" }]);
  const cart = await findOrCreate(owner);
  res.json({ cart: toPublicCart(cart) });
});

const addItem = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  if (!owner) throw ApiError.validation([{ path: "guestId", message: "guestId is required for guests" }]);
  const { slug, sizeLabel, variant = "", qty = 1 } = req.body;

  const product = await Product.findOne({ slug: String(slug || "").toLowerCase(), isActive: true });
  if (!product) throw ApiError.notFound("Product not found");
  if (product.stock === "out") throw ApiError.badRequest("This product is out of stock");

  const size =
    (product.sizes || []).find((s) => s.label === sizeLabel) ||
    (product.sizes || [])[0] || { label: "Standard", price: product.price };

  const q = Math.min(MAX_QTY, Math.max(1, Number(qty) || 1));
  const cart = await findOrCreate(owner);

  const existing = cart.items.find(
    (i) =>
      String(i.product) === String(product._id) &&
      i.sizeLabel === size.label &&
      (i.variant || "") === (variant || "")
  );

  if (existing) {
    existing.qty = Math.min(MAX_QTY, existing.qty + q);
  } else {
    cart.items.push({
      product: product._id,
      slug: product.slug,
      name: product.name,
      image: (product.images && product.images[0]) || "",
      variant: variant || "",
      sizeLabel: size.label,
      sizePrice: size.price,
      priceAtAdd: size.price,
      qty: q,
    });
  }

  cart.recompute();
  await cart.save();
  res.status(201).json({ cart: toPublicCart(cart) });
});

const updateItem = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  if (!owner) throw ApiError.validation([{ path: "guestId", message: "guestId is required for guests" }]);
  const cart = await findOrCreate(owner);
  const item = cart.items.id(req.params.itemId);
  if (!item) throw ApiError.notFound("Cart item not found");

  const qty = Number(req.body.qty);
  if (!Number.isFinite(qty)) throw ApiError.validation([{ path: "qty", message: "qty must be a number" }]);
  if (qty <= 0) item.deleteOne();
  else item.qty = Math.min(MAX_QTY, Math.floor(qty));

  cart.recompute();
  await cart.save();
  res.json({ cart: toPublicCart(cart) });
});

const removeItem = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  if (!owner) throw ApiError.validation([{ path: "guestId", message: "guestId is required for guests" }]);
  const cart = await findOrCreate(owner);
  const item = cart.items.id(req.params.itemId);
  if (item) item.deleteOne();
  cart.recompute();
  await cart.save();
  res.json({ cart: toPublicCart(cart) });
});

const clearCart = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  if (!owner) throw ApiError.validation([{ path: "guestId", message: "guestId is required for guests" }]);
  const cart = await findOrCreate(owner);
  cart.items = [];
  cart.recompute();
  await cart.save();
  res.json({ cart: toPublicCart(cart) });
});

/* Merge a guest cart into the signed-in user's cart (called right after login). */
const mergeCart = asyncHandler(async (req, res) => {
  const guestId = String(req.body.guestId || "").slice(0, 64);
  const owner = { user: req.user.id };
  const userCart = await findOrCreate(owner);

  if (guestId) {
    const guestCart = await Cart.findOne({ guestId });
    if (guestCart) {
      for (const gi of guestCart.items) {
        const existing = userCart.items.find(
          (i) =>
            String(i.product) === String(gi.product) &&
            i.sizeLabel === gi.sizeLabel &&
            (i.variant || "") === (gi.variant || "")
        );
        if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + gi.qty);
        else userCart.items.push(gi.toObject());
      }
      await Cart.deleteOne({ _id: guestCart._id });
    }
  }

  userCart.recompute();
  await userCart.save();
  res.json({ cart: toPublicCart(userCart) });
});

/* Replace the whole cart with a client-supplied list (used to sync the local UI cart). */
const replaceCart = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  if (!owner) throw ApiError.validation([{ path: "guestId", message: "guestId is required for guests" }]);
  const cart = await findOrCreate(owner);
  cart.items = [];

  for (const it of req.body.items || []) {
    const product = await Product.findOne({ slug: String(it.slug || "").toLowerCase(), isActive: true });
    if (!product || product.stock === "out") continue;
    const size =
      (product.sizes || []).find((s) => s.label === it.sizeLabel) ||
      (product.sizes || [])[0] || { label: "Standard", price: product.price };
    const qty = Math.min(MAX_QTY, Math.max(1, Math.floor(Number(it.qty) || 1)));
    const existing = cart.items.find(
      (i) =>
        String(i.product) === String(product._id) &&
        i.sizeLabel === size.label &&
        (i.variant || "") === (it.variant || "")
    );
    if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + qty);
    else
      cart.items.push({
        product: product._id,
        slug: product.slug,
        name: product.name,
        image: (product.images && product.images[0]) || "",
        variant: it.variant || "",
        sizeLabel: size.label,
        sizePrice: size.price,
        priceAtAdd: size.price,
        qty,
      });
  }

  cart.recompute();
  await cart.save();
  res.json({ cart: toPublicCart(cart) });
});

module.exports = { getCart, addItem, updateItem, removeItem, clearCart, replaceCart, mergeCart, resolveOwner, toPublicCart };
