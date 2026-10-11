const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    tag: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Brand", brandSchema);
