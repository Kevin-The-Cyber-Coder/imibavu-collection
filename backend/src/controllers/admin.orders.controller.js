const Order = require("../models/Order");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { notifyStatus } = require("../services/notifications.service");

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

const adminListOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const status = req.query.status ? String(req.query.status) : null;
  const filter = {};
  if (status) filter.status = status;
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);
  res.json({ items: items.map((o) => { const p = toPublicOrder(o); const obj = o.toObject ? o.toObject() : o; return { ...p, _id: obj._id }; }), total, page, pages: Math.ceil(total / limit) || 1 });
});

const adminUpdateOrderStatus = asyncHandler(async (req, res) => {
  const allowed = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
  const status = String(req.body.status || "").toLowerCase();
  if (!allowed.includes(status)) throw ApiError.validation([{ path: "status", message: "Invalid status" }]);
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound("Order not found");
  order.status = status;
  order.history = order.history.concat([{ status, at: new Date(), by: req.user && req.user.id ? req.user.id : undefined }]);
  await order.save();
  notifyStatus(order);
  res.json({ order: toPublicOrder(order) });
});

module.exports = { adminListOrders, adminUpdateOrderStatus };

