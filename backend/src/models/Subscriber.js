const mongoose = require("mongoose");

/* WhatsApp / newsletter subscribers collected from the storefront footer and
   the homepage band. A subscriber is identified by one contact string — either
   a phone number or an email address — so re-subscribing just updates the row. */
const subscriberSchema = new mongoose.Schema(
  {
    contact: { type: String, required: true, trim: true, unique: true, index: true },
    channel: { type: String, enum: ["whatsapp", "email"], default: "whatsapp" },
    name: { type: String, default: "", trim: true, maxlength: 80 },
    source: { type: String, default: "footer", trim: true, maxlength: 40 },
    language: { type: String, enum: ["en", "rw", "fr"], default: "en" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isActive: { type: Boolean, default: true, index: true },
    unsubscribeCode: { type: String, required: true, index: true },
    subscribedAt: { type: Date, default: Date.now },
    unsubscribedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

subscriberSchema.methods.toPublic = function () {
  return {
    id: this._id,
    contact: this.contact,
    channel: this.channel,
    name: this.name,
    source: this.source,
    language: this.language,
    isActive: this.isActive,
    subscribedAt: this.subscribedAt,
  };
};

module.exports = mongoose.model("Subscriber", subscriberSchema);
