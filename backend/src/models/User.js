const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "Home" },
    sector: String,
    district: { type: String, default: "Kigali" },
    street: String,
    note: String,
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 80 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      match: [/^\S+@\S+$/, "Invalid email"],
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      match: [/^\+250\d{9}$/, "Phone must look like +2507XXXXXXXX"],
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["customer", "staff", "admin"],
      default: "customer",
    },
    isVerified: { type: Boolean, default: false },
    language: { type: String, enum: ["en", "rw", "fr"], default: "en" },
    addresses: [addressSchema],
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    refreshHash: { type: String, select: false },
  },
  { timestamps: true }
);

userSchema.index({ name: "text" });

userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    name: this.name || "",
    email: this.email || "",
    phone: this.phone || "",
    role: this.role,
    isVerified: this.isVerified,
    language: this.language,
    addresses: this.addresses,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
