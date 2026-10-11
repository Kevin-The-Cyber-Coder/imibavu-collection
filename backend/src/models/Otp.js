const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },
  code: { type: String, required: true },
  purpose: {
    type: String,
    enum: ["verify_phone", "reset_password", "login"],
    default: "verify_phone",
  },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Otp", otpSchema);
