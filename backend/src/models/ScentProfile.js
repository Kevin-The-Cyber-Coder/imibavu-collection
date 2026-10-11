const mongoose = require("mongoose");

const scentProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    guestId: { type: String, default: "", index: true },
    mood: { type: String, default: "" },
    season: { type: String, default: "" },
    notes: { type: [String], default: [] },
    results: { type: [String], default: [] },
  },
  { timestamps: true }
);

scentProfileSchema.index({ user: 1, createdAt: -1 });
scentProfileSchema.index({ guestId: 1, createdAt: -1 });

module.exports = mongoose.model("ScentProfile", scentProfileSchema);
