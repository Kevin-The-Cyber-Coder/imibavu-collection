const Booking = require("../models/Booking");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { resolveOwner } = require("../utils/owner");
const { notifyBooking } = require("../services/notifications.service");

function toPublicBooking(b) {
  const doc = b.toObject ? b.toObject() : b;
  return {
    id: String(doc._id),
    name: doc.name,
    phone: doc.phone,
    email: doc.email || "",
    date: doc.date,
    time: doc.time,
    msg: doc.msg || "",
    status: doc.status,
    createdAt: doc.createdAt,
  };
}

/* "2026-06-01" + "14:30" -> Date, or null when unparseable. */
function combineDateTime(date, time) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
  const t = /^(\d{2}):(\d{2})$/.exec(String(time || ""));
  if (!m || !t) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(t[1]), Number(t[2]));
  return Number.isNaN(d.getTime()) ? null : d;
}

const createBooking = asyncHandler(async (req, res) => {
  const { name, phone, email = "", date, time, msg = "" } = req.body;
  const owner = resolveOwner(req) || {};

  const when = combineDateTime(date, time);
  if (!when) throw ApiError.validation([{ path: "date", message: "A valid date and time are required" }]);
  if (when.getTime() < Date.now() - 60 * 1000) {
    throw ApiError.validation([{ path: "date", message: "Please choose a future date and time" }]);
  }

  const booking = await Booking.create({
    ...owner,
    name,
    phone,
    email,
    date: when,
    time,
    msg,
    status: "requested",
    history: [{ status: "requested", at: new Date(), by: req.user ? req.user.id : null }],
  });

  notifyBooking(booking);
  res.status(201).json({ booking: toPublicBooking(booking) });
});

const listMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user: req.user.id }).sort({ date: -1 }).limit(50);
  res.json({ bookings: bookings.map(toPublicBooking) });
});

module.exports = { createBooking, listMyBookings, toPublicBooking, combineDateTime };
