const express = require("express");
const { Router } = require("express");
const { z } = require("zod");
const validate = require("../middleware/validate");
const { optionalAuth } = require("../middleware/auth");
const c = require("../controllers/payments.controller");

const router = Router();

const initiateSchema = z.object({
  orderId: z.string().trim().min(1).optional(),
  code: z.string().trim().min(1).optional(),
  method: z.enum(["momo", "card", "cash", "pickup"]).optional(),
  network: z.enum(["MTN", "AIRTEL"]).optional(),
  phone: z.string().trim().min(7).max(20).optional(),
  email: z.string().trim().max(160).optional(),
});

/* Provider webhook — no auth, verified via verif-hash header. */
router.post("/webhook", c.webhook);

/* Local mock checkout (only active when PAYMENTS_MODE=console). */
router.get("/mock-checkout", c.mockCheckout);
router.get("/mock-checkout/complete", c.mockComplete);
router.post(
  "/mock-checkout/complete",
  express.urlencoded({ extended: false }),
  c.mockComplete
);

router.post("/initiate", optionalAuth, validate(initiateSchema), c.initiatePayment);
router.post("/:txRef/verify", optionalAuth, c.verifyPayment);
router.get("/:txRef", optionalAuth, c.getPayment);

module.exports = router;
