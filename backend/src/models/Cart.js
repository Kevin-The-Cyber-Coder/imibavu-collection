const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    slug: { type: String, required: true },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    variant: { type: String, default: "" },
    sizeLabel: { type: String, required: true },
    sizePrice: { type: Number, required: true, min: 0 },
    priceAtAdd: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1, max: 50 },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    guestId: { type: String },
    items: { type: [cartItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: "RWF" },
  },
  { timestamps: true }
);

cartSchema.index({ user: 1 }, { unique: true, sparse: true });
cartSchema.index({ guestId: 1 }, { unique: true, sparse: true });

cartSchema.methods.recompute = function recompute() {
  this.subtotal = this.items.reduce((n, i) => n + i.sizePrice * i.qty, 0);
  this.total = this.subtotal;
  return this;
};

module.exports = mongoose.model("Cart", cartSchema);
