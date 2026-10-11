const Booking = require("../models/Booking");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { toPublicBooking } = require("./bookings.controller");
const { notifyBookingStatus } = require("../services/notifications.service");

const adminListBookings = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const status = req.query.status ? String(req.query.status) : null;
  const filter = {};
  if (status) filter.status = status;
  const [items, total] = await Promise.all([
    Booking.find(filter).sort({ date: -1 }).skip((page - 1) * limit).limit(limit),
    Booking.countDocuments(filter),
  ]);
  res.json({
    items: items.map((b) => {
      const obj = b.toObject ? b.toObject() : b;
      return { ...toPublicBooking(b), _id: obj._id };
    }),
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
  });
});

const adminUpdateBookingStatus = asyncHandler(async (req, res) => {
  const allowed = ["requested", "confirmed", "completed", "cancelled"];
  const status = String(req.body.status || "").toLowerCase();
  if (!allowed.includes(status)) throw ApiError.validation([{ path: "status", message: "Invalid status" }]);
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound("Booking not found");
  booking.status = status;
  booking.history = booking.history.concat([
    { status, at: new Date(), by: req.user && req.user.id ? req.user.id : undefined },
  ]);
  await booking.save();
  notifyBookingStatus(booking);
  res.json({ booking: toPublicBooking(booking) });
});

module.exports = { adminListBookings, adminUpdateBookingStatus };
