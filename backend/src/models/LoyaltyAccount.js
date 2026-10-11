const mongoose = require("mongoose");

const loyaltyEntrySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["earn", "redeem"], required: true },
    points: { type: Number, required: true, min: 0 },
    reason: { type: String, default: "" },
    orderId: { type: String, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const loyaltySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    points: { type: Number, default: 0, min: 0 },
    lifetime: { type: Number, default: 0, min: 0 },
    history: { type: [loyaltyEntrySchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LoyaltyAccount", loyaltySchema);
