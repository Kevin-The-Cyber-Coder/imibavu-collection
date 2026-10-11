const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    guestId: { type: String, default: "", index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 24 },
    email: { type: String, default: "", trim: true, lowercase: true },
    date: { type: Date, required: true },
    time: { type: String, required: true, trim: true, maxlength: 12 },
    msg: { type: String, default: "", trim: true, maxlength: 600 },
    status: {
      type: String,
      enum: ["requested", "confirmed", "completed", "cancelled"],
      default: "requested",
      index: true,
    },
    history: {
      type: [
        {
          status: String,
          at: { type: Date, default: Date.now },
          by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

bookingSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
