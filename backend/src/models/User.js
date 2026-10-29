const mongoose = require("mongoose");

const mfaSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    secret: { type: String, select: false },
    otpauth: { type: String },
  },
  { _id: false }
);

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
    isActive: { type: Boolean, default: true },
    language: { type: String, enum: ["en", "rw", "fr"], default: "en" },
    // Employee access control: a preset is only a template; `permissions` holds
    // the exact granted areas the backend enforces.
    permissionPreset: { type: String, default: null },
    permissions: { type: [String], default: [] },
    addresses: [addressSchema],
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    mustChangePassword: { type: Boolean, default: false },
    mfa: mfaSchema,
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
    isActive: this.isActive !== false,
    mustChangePassword: this.mustChangePassword,
    mfaEnabled: Boolean(this.mfa && this.mfa.enabled),
    permissionPreset: this.permissionPreset || null,
    permissions: this.permissions || [],
    language: this.language,
    addresses: this.addresses,
    createdAt: this.createdAt,
    lastLoginAt: this.lastLoginAt || null,
  };
};

module.exports = mongoose.model("User", userSchema);
