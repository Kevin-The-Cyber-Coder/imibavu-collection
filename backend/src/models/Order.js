const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    slug: { type: String, default: "" },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    variant: { type: String, default: "" },
    sizeLabel: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true, required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    guestId: { type: String },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: "" },
    note: { type: String, default: "" },
    zone: { type: String, default: "" },
    zoneLabel: { type: String, default: "" },
    payment: { type: String, default: "momo" },
    // Payment lifecycle: unpaid -> pending -> paid | failed
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid", "failed", "refunded"],
      default: "unpaid",
    },
    paymentRef: { type: String, default: "" },
    paidAt: { type: Date, default: null },
    promo: { type: String, default: "" },
    items: { type: [orderItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    pointsEarned: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "RWF" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    source: { type: String, default: "web" },
    history: {
      type: [
        {
          status: String,
          at: { type: Date, default: Date.now },
          by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ phone: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
