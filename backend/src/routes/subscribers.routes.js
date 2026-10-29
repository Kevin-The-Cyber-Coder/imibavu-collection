const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const validate = require("../middleware/validate");
const { protect, optionalAuth, requireArea } = require("../middleware/auth");
const c = require("../controllers/subscribers.controller");

const router = Router();

/* Joining the list is public, so keep it slow enough to deter abuse. */
const joinLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Too many sign-ups from this device. Try again later." } },
});

const subscribeSchema = z.object({
  contact: z.string().trim().min(6).max(120),
  name: z.string().trim().max(80).optional(),
  source: z.string().trim().max(40).optional(),
  language: z.enum(["en", "rw", "fr"]).optional(),
});

router.post("/", joinLimiter, optionalAuth, validate(subscribeSchema), c.subscribe);
router.get("/unsubscribe/:code", c.unsubscribe);

/* Staff list — needs the marketing area (admin passes automatically). */
router.get("/", protect, requireArea("marketing"), c.list);
router.delete("/:id", protect, requireArea("marketing"), c.remove);

module.exports = router;
