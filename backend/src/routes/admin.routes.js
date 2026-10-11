const { Router } = require("express");
const { z } = require("zod");
const validate = require("../middleware/validate");
const { protect, requireRole } = require("../middleware/auth");
const admin = require("../controllers/admin.controller");
const adminOrders = require("../controllers/admin.orders.controller");
const adminBookings = require("../controllers/admin.bookings.controller");
const adminReviews = require("../controllers/admin.reviews.controller");
const brands = require("../controllers/brands.controller");

const router = Router();
router.use(protect, requireRole("admin", "staff"));

const productSchema = z.object({
  slug: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1),
  desc: z.string().trim().optional(),
  brand: z.string().trim().min(1),
  category: z.enum(["perfumes", "oils", "jewelry"]),
  price: z.coerce.number().min(0),
  sizes: z.array(z.object({ label: z.string().trim(), price: z.coerce.number().min(0) })).optional(),
  stock: z.enum(["in", "low", "out"]).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  images: z.array(z.string()).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  reviewCount: z.coerce.number().min(0).optional(),
  color: z.string().optional(),
  family: z.string().optional(),
  longevity: z.enum(["light", "moderate", "long"]).optional(),
  season: z.string().optional(),
  inspired: z.string().nullable().optional(),
  notes: z.any().optional(),
});

const brandSchema = z.object({ id: z.string().trim().optional(), name: z.string().trim().min(1), logo: z.string().trim().optional() });
const statusSchema = z.object({ status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]) });
const bookingStatusSchema = z.object({ status: z.enum(["requested", "confirmed", "completed", "cancelled"]) });
const reviewStatusSchema = z.object({ status: z.enum(["pending", "approved", "hidden"]) });

router.get("/products", admin.adminListProducts);
router.post("/products", validate(productSchema), admin.adminCreateProduct);
router.patch("/products/:id", validate(productSchema.partial()), admin.adminUpdateProduct);
router.delete("/products/:id", admin.adminDeleteProduct);

router.get("/brands", brands.listBrands);
router.post("/brands", validate(brandSchema), admin.adminUpsertBrand);

router.get("/orders", adminOrders.adminListOrders);
router.patch("/orders/:id", validate(statusSchema), adminOrders.adminUpdateOrderStatus);

router.get("/bookings", adminBookings.adminListBookings);
router.patch("/bookings/:id", validate(bookingStatusSchema), adminBookings.adminUpdateBookingStatus);

router.get("/reviews", adminReviews.adminListReviews);
router.patch("/reviews/:id", validate(reviewStatusSchema), adminReviews.adminUpdateReviewStatus);

module.exports = router;
