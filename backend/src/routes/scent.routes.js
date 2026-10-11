const { Router } = require("express");
const { z } = require("zod");
const validate = require("../middleware/validate");
const { protect, optionalAuth } = require("../middleware/auth");
const c = require("../controllers/scent.controller");

const router = Router();

const answerSchema = z.object({
  mood: z.enum(["fresh", "sweet", "oud", "musky", ""]).optional(),
  season: z.enum(["summer", "day", "evening", "winter", ""]).optional(),
  notes: z.array(z.string().trim()).max(6).optional(),
  save: z.boolean().optional(),
  guestId: z.string().trim().max(64).optional(),
});

router.post("/recommend", optionalAuth, validate(answerSchema), c.recommend);
router.get("/profiles", protect, c.listProfiles);

module.exports = router;
