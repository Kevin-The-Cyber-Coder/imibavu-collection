const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    guestId: { type: String, default: "", index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    slug: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    stars: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: ["pending", "approved", "hidden"], default: "pending", index: true },
    rewarded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reviewSchema.index({ slug: 1, status: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
