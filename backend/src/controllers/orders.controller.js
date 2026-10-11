const crypto = require("crypto");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { findZone, deliveryFee } = require("../config/pricing");
const { notifyOrderPlaced } = require("../services/notifications.service");
const loyalty = require("../services/loyalty.service");

function normalizePhone(raw) {
  if (!raw) return null;
  let p = String(raw).replace(/[\s\-().]/g, "");
  if (/^0\d{9}$/.test(p)) p = "+250" + p.slice(1);
  if (/^250\d{9}$/.test(p)) p = "+" + p;
  return p;
}

function newOrderId() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) s += alphabet[bytes[i] % alphabet.length];
  return "IMB-" + s;
}

function toPublicOrder(o) {
  const d = o.toObject ? o.toObject() : o;
  return {
    code: d.orderId,
    orderId: d.orderId,
    name: d.name,
    phone: d.phone,
    email: d.email,
    note: d.note,
    zone: d.zone,
    zoneLabel: d.zoneLabel,
    payment: d.payment,
    paymentStatus: d.paymentStatus || "unpaid",
    paymentRef: d.paymentRef || "",
    paidAt: d.paidAt || null,
    promo: d.promo,
    items: (d.items || []).map((i) => ({
      pid: i.slug,
      name: i.name,
      size: i.sizeLabel,
      price: i.price,
      qty: i.qty,
      image: i.image,
    })),
    subtotal: d.subtotal,
    discount: d.discount || 0,
    loyaltyPoints: d.loyaltyPoints || 0,
    pointsEarned: d.pointsEarned || 0,
    deliveryFee: d.deliveryFee,
    total: d.total,
    currency: d.currency,
    status: d.status,
    date: d.createdAt,
  };
}

/* Build authoritative order items from the request.
   Prefers the server-side cart, falls back to client-supplied items. */
async function buildItems(req, owner) {
  const cart = owner ? await Cart.findOne(owner) : null;
  if (cart && cart.items.length) {
    return cart.items.map((i) => ({
      product: i.product,
      slug: i.slug,
      snapshot: { product: i.product, slug: i.slug, name: i.name, image: i.image, variant: i.variant, sizeLabel: i.sizeLabel, price: i.sizePrice, qty: i.qty },
    }));
  }
  const raw = Array.isArray(req.body.items) ? req.body.items : [];
  const out = [];
  for (const it of raw) {
    const slug = String(it.slug || it.pid || "").toLowerCase();
    const product = await Product.findOne({ slug, isActive: true });
    if (!product) continue;
    if (product.stock === "out") throw ApiError.badRequest(`${product.name} is out of stock`);
    const size =
      (product.sizes || []).find((s) => s.label === it.sizeLabel || s.label === it.size) ||
      (product.sizes || [])[0] || { label: "Standard", price: product.price };
    const qty = Math.max(1, Math.min(50, Math.floor(Number(it.qty) || 1)));
    out.push({
      product: product._id,
      slug: product.slug,
      snapshot: {
        product: product._id,
        slug: product.slug,
        name: product.name,
        image: (product.images && product.images[0]) || "",
        variant: it.variant || "",
        sizeLabel: size.label,
        price: size.price,
        qty,
      },
    });
  }
  return out;
}

const createOrder = asyncHandler(async (req, res) => {
  const { name, phone, email = "", note = "", zone = "kk", payment = "momo", promo = "" } = req.body;

  const normPhone = normalizePhone(phone);
  if (!name || !normPhone) {
    throw ApiError.validation([{ path: "phone", message: "Name and a valid phone are required" }]);
  }

  let owner = null;
  if (req.user && req.user.id) {
    owner = { user: req.user.id };
  } else {
    const gid = req.headers["x-guest-id"] || req.body.guestId;
    if (gid) owner = { guestId: String(gid).slice(0, 64) };
  }

  const built = await buildItems(req, owner);
  if (!built.length) throw ApiError.badRequest("Your cart is empty");

  const items = built.map((b) => b.snapshot);
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const z = findZone(zone);
  const fee = deliveryFee(z.id, subtotal);

  /* Loyalty: registered customers may redeem points for an order discount.
     Points are deducted up-front and refunded if the order cannot be saved. */
  let redeem = null;
  const requested = Math.floor(Number(req.body.loyaltyPoints) || 0);
  if (requested > 0) {
    if (!(owner && owner.user)) {
      throw ApiError.validation([{ path: "loyaltyPoints", message: "Sign in to redeem points" }]);
    }
    const acc = await loyalty.getOrCreate(owner.user);
    const check = loyalty.validateRedeem(requested, acc.points);
    if (!check.ok) throw ApiError.validation([{ path: "loyaltyPoints", message: check.message }]);
    if (check.discount > subtotal) {
      throw ApiError.validation([{ path: "loyaltyPoints", message: "Order total is too small for that many points" }]);
    }
    const r = await loyalty.redeem(owner.user, check.points, { reason: "order discount" });
    if (r.error) throw ApiError.validation([{ path: "loyaltyPoints", message: r.error }]);
    redeem = { points: check.points, discount: check.discount };
  }

  const discount = redeem ? redeem.discount : 0;
  const total = Math.max(0, subtotal - discount + fee);
  const pointsEarned = owner && owner.user ? loyalty.earnPointsFor(total) : 0;

  let order = null;
  for (let attempt = 0; attempt < 5 && !order; attempt++) {
    try {
      order = await Order.create({
        orderId: newOrderId(),
        user: owner && owner.user ? owner.user : undefined,
        guestId: owner && owner.guestId ? owner.guestId : undefined,
        name: String(name).trim().slice(0, 120),
        phone: normPhone,
        email: String(email).trim().slice(0, 160),
        note: String(note).slice(0, 500),
        zone: z.id,
        zoneLabel: z.label + (fee ? ` (+${fee.toLocaleString()} RWF)` : " — free"),
        payment: String(payment).slice(0, 40),
        promo: String(promo).toUpperCase().slice(0, 40),
        items,
        subtotal,
        discount,
        loyaltyPoints: redeem ? redeem.points : 0,
        pointsEarned,
        deliveryFee: fee,
        total,
        status: "pending",
        history: [{ status: "pending" }],
      });
    } catch (err) {
      if (!(err && err.code === 11000)) throw err;
    }
  }
  if (!order) {
    if (redeem) await loyalty.award(owner.user, redeem.points, { reason: "redemption refund" });
    throw new Error("Could not allocate an order id");
  }

  if (owner) {
    await Cart.updateOne(owner, { $set: { items: [], subtotal: 0, total: 0 } });
  }

  if (owner && owner.user && pointsEarned > 0) {
    try {
      await loyalty.award(owner.user, pointsEarned, { reason: "order placed", orderId: order.orderId });
    } catch (e) {
      /* earning points must never fail the order */
    }
  }

  notifyOrderPlaced(order);

  res.status(201).json({ order: toPublicOrder(order) });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderId: String(req.params.orderId).toUpperCase() });
  if (!order) throw ApiError.notFound("Order not found");
  res.json({ order: toPublicOrder(order) });
});

const listMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(50);
  res.json({ items: orders.map(toPublicOrder) });
});

module.exports = { createOrder, getOrder, listMyOrders, toPublicOrder, normalizePhone };
