const { Router } = require("express");
const { z } = require("zod");
const validate = require("../middleware/validate");
const { protect, optionalAuth } = require("../middleware/auth");
const c = require("../controllers/cart.controller");

const router = Router();

const addSchema = z.object({
  slug: z.string().trim().min(1),
  sizeLabel: z.string().trim().optional(),
  variant: z.string().trim().max(60).optional(),
  qty: z.coerce.number().int().min(1).max(50).optional(),
});

const qtySchema = z.object({ qty: z.coerce.number() });
const replaceSchema = z.object({
  items: z
    .array(
      z.object({
        slug: z.string().trim().min(1),
        sizeLabel: z.string().trim().optional(),
        variant: z.string().trim().max(60).optional(),
        qty: z.coerce.number().int().min(1).max(50),
      })
    )
    .max(50),
});
const mergeSchema = z.object({ guestId: z.string().trim().min(6).max(64) });

router.get("/", optionalAuth, c.getCart);
router.put("/", optionalAuth, validate(replaceSchema), c.replaceCart);
router.post("/items", optionalAuth, validate(addSchema), c.addItem);
router.patch("/items/:itemId", optionalAuth, validate(qtySchema), c.updateItem);
router.delete("/items/:itemId", optionalAuth, c.removeItem);
router.delete("/", optionalAuth, c.clearCart);
router.post("/merge", protect, validate(mergeSchema), c.mergeCart);

module.exports = router;
