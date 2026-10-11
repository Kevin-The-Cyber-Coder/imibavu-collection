const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    guestId: { type: String, default: "", index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    slug: { type: String, required: true },
  },
  { timestamps: true }
);

wishlistSchema.index({ user: 1, slug: 1 });
wishlistSchema.index({ guestId: 1, slug: 1 });

module.exports = mongoose.model("Wishlist", wishlistSchema);
