const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    txRef: { type: String, unique: true, required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", index: true },
    orderCode: { type: String, default: "" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    provider: { type: String, default: "flutterwave" },
    // momo | card | cash | pickup
    method: { type: String, default: "momo" },
    // MTN | AIRTEL | "" (for card/hosted)
    network: { type: String, default: "" },
    phone: { type: String, default: "" },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "RWF" },
    status: {
      type: String,
      enum: ["pending", "processing", "successful", "failed", "cancelled"],
      default: "pending",
    },
    // Flutterwave transaction id after a successful charge
    flwTxId: { type: String, default: "" },
    // Customer-facing link to complete payment (hosted checkout or mock page)
    checkoutUrl: { type: String, default: "" },
    // Last provider payload, for auditing/debugging
    raw: { type: mongoose.Schema.Types.Mixed, default: {} },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ phone: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
