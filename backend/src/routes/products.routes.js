const { Router } = require("express");
const { z } = require("zod");
const validate = require("../middleware/validate");
const c = require("../controllers/products.controller");

const router = Router();

const listQuery = z.object({
  category: z.enum(["perfumes", "oils", "jewelry"]).optional(),
  brand: z.string().trim().optional(),
  tag: z.string().trim().optional(),
  gender: z.string().trim().optional(),
  family: z.string().trim().optional(),
  q: z.string().trim().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(["featured", "newest", "price_asc", "price_desc", "rating", "name"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

router.get("/", validate(listQuery, "query"), c.listProducts);
router.get("/:slug", c.getProduct);

module.exports = router;
