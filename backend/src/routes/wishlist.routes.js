const { Router } = require("express");
const { z } = require("zod");
const validate = require("../middleware/validate");
const { protect, optionalAuth } = require("../middleware/auth");
const c = require("../controllers/wishlist.controller");

const router = Router();

const addSchema = z.object({ slug: z.string().trim().min(1) });
const mergeSchema = z.object({
  guestId: z.string().trim().max(64).optional(),
  slugs: z.array(z.string().trim()).max(200).optional(),
});

router.post("/merge", protect, validate(mergeSchema), c.mergeWishlist);
router.get("/", optionalAuth, c.listWishlist);
router.post("/", optionalAuth, validate(addSchema), c.addToWishlist);
router.delete("/:slug", optionalAuth, c.removeFromWishlist);

module.exports = router;
