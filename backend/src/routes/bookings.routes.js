const { Router } = require("express");
const { z } = require("zod");
const validate = require("../middleware/validate");
const { protect, optionalAuth } = require("../middleware/auth");
const c = require("../controllers/bookings.controller");

const router = Router();

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().email().optional().or(z.literal("")),
  date: z.string().trim().min(1),
  time: z.string().trim().min(1).max(12),
  msg: z.string().trim().max(600).optional(),
  guestId: z.string().trim().max(64).optional(),
});

router.post("/", optionalAuth, validate(createSchema), c.createBooking);
router.get("/", protect, c.listMyBookings);

module.exports = router;
