const { Router } = require("express");
const { z } = require("zod");
const validate = require("../middleware/validate");
const { protect, optionalAuth } = require("../middleware/auth");
const c = require("../controllers/orders.controller");

const router = Router();

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().email().optional().or(z.literal("")),
  note: z.string().trim().max(500).optional(),
  zone: z.enum(["kk", "kimironko", "nyamirambo", "remera", "pickup"]).optional(),
  payment: z.enum(["momo", "cash", "pickup"]).optional(),
  promo: z.string().trim().max(40).optional(),
  loyaltyPoints: z.coerce.number().int().min(0).max(1000000).optional(),
  items: z
    .array(
      z.object({
        slug: z.string().trim().optional(),
        pid: z.string().trim().optional(),
        sizeLabel: z.string().trim().optional(),
        size: z.string().trim().optional(),
        variant: z.string().trim().optional(),
        qty: z.coerce.number().int().min(1).max(50),
      })
    )
    .optional(),
  guestId: z.string().trim().max(64).optional(),
});

router.post("/", optionalAuth, validate(createSchema), c.createOrder);
router.get("/", protect, c.listMyOrders);
router.get("/:orderId", optionalAuth, c.getOrder);

module.exports = router;
