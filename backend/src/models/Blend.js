const mongoose = require("mongoose");

const blendSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    guestId: { type: String, default: "", index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    baseId: { type: String, required: true },
    baseLabel: { type: String, required: true },
    basePrice: { type: Number, required: true, min: 0 },
    notes: { type: [String], default: [] },
    sizeLabel: { type: String, required: true },
    sizePrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["active", "archived"], default: "active" },
  },
  { timestamps: true }
);

blendSchema.index({ user: 1, createdAt: -1 });
blendSchema.index({ guestId: 1, createdAt: -1 });

module.exports = mongoose.model("Blend", blendSchema);
