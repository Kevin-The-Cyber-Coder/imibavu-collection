const { Router } = require("express");
const { z } = require("zod");
const validate = require("../middleware/validate");
const { optionalAuth } = require("../middleware/auth");
const c = require("../controllers/blends.controller");

const router = Router();

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  baseId: z.string().trim().min(1),
  notes: z.array(z.string().trim()).max(6).optional(),
  sizeIndex: z.coerce.number().int().min(0).max(2),
  guestId: z.string().trim().max(64).optional(),
});

router.get("/", optionalAuth, c.listBlends);
router.post("/", optionalAuth, validate(createSchema), c.createBlend);
router.delete("/:id", optionalAuth, c.deleteBlend);

module.exports = router;
