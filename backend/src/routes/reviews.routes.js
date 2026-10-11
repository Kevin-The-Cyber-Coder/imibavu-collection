const { Router } = require("express");
const { z } = require("zod");
const validate = require("../middleware/validate");
const { protect, optionalAuth } = require("../middleware/auth");
const c = require("../controllers/reviews.controller");

const router = Router();

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  stars: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().min(3).max(1000),
});

router.get("/mine", protect, c.listMyReviews);
router.get("/product/:slug", c.listProductReviews);
router.post("/product/:slug", optionalAuth, validate(createSchema), c.createReview);

module.exports = router;
