const { Router } = require("express");
const { z } = require("zod");
const validate = require("../middleware/validate");
const { protect, requireRole, requireArea } = require("../middleware/auth");
const { uploadImages } = require("../middleware/upload");
const admin = require("../controllers/admin.controller");
const adminOrders = require("../controllers/admin.orders.controller");
const adminBookings = require("../controllers/admin.bookings.controller");
const adminReviews = require("../controllers/admin.reviews.controller");
const adminEmployees = require("../controllers/admin.employees.controller");
const brands = require("../controllers/brands.controller");

const router = Router();
/* Defence in depth: nothing under /admin is reachable by a customer, even if a
   future route forgets its own requireArea/requireRole. */
router.use(protect, requireRole("admin", "staff"));

const imageSchema = z.object({
  url: z.string().trim().min(1),
  alt: z.string().trim().optional(),
  primary: z.boolean().optional(),
});

const i18nSchema = z.object({
  rw: z.object({ name: z.string().optional(), desc: z.string().optional() }).partial().optional(),
  fr: z.object({ name: z.string().optional(), desc: z.string().optional() }).partial().optional(),
}).partial();

const productSchema = z.object({
  slug: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1),
  desc: z.string().trim().optional(),
  brand: z.string().trim().min(1),
  category: z.enum(["perfumes", "oils", "jewelry"]),
  gender: z.string().trim().optional(),
  price: z.coerce.number().min(0),
  sizes: z.array(z.object({ label: z.string().trim(), price: z.coerce.number().min(0) })).optional(),
  stock: z.enum(["in", "low", "out"]).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  images: z.array(imageSchema).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  reviewCount: z.coerce.number().min(0).optional(),
  color: z.string().optional(),
  family: z.string().optional(),
  longevity: z.enum(["light", "moderate", "long"]).optional(),
  season: z.string().optional(),
  inspired: z.string().nullable().optional(),
  notes: z.any().optional(),
  i18n: i18nSchema.optional(),
  seo: z.object({ title: z.string().optional(), desc: z.string().optional() }).partial().optional(),
});

const brandSchema = z.object({ id: z.string().trim().optional(), name: z.string().trim().min(1), logo: z.string().trim().optional() });
const statusSchema = z.object({ status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]) });
const bookingStatusSchema = z.object({ status: z.enum(["requested", "confirmed", "completed", "cancelled"]) });
const reviewStatusSchema = z.object({ status: z.enum(["pending", "approved", "hidden"]) });

const employeeSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  email: z.string().trim().email().optional().or(z.literal("")),
  permissionPreset: z.string().trim().nullable().optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

/* ---- catalog (products & brands) ---- */
router.get("/products", requireArea("products"), admin.adminListProducts);
router.get("/products/:id", requireArea("products"), admin.adminGetProduct);
router.post("/products", requireArea("products"), validate(productSchema), admin.adminCreateProduct);
router.patch("/products/:id", requireArea("products"), validate(productSchema.partial()), admin.adminUpdateProduct);
router.delete("/products/:id", requireArea("products"), admin.adminDeleteProduct);
router.post("/uploads", requireArea("products"), uploadImages.array("images", 8), admin.adminUploadImages);

router.get("/brands", requireArea("brands"), brands.listBrands);
router.post("/brands", requireArea("brands"), validate(brandSchema), admin.adminUpsertBrand);

/* ---- sales ---- */
router.get("/orders", requireArea("orders"), adminOrders.adminListOrders);
router.patch("/orders/:id", requireArea("orders"), validate(statusSchema), adminOrders.adminUpdateOrderStatus);

router.get("/bookings", requireArea("bookings"), adminBookings.adminListBookings);
router.patch("/bookings/:id", requireArea("bookings"), validate(bookingStatusSchema), adminBookings.adminUpdateBookingStatus);

router.get("/reviews", requireArea("reviews"), adminReviews.adminListReviews);
router.patch("/reviews/:id", requireArea("reviews"), validate(reviewStatusSchema), adminReviews.adminUpdateReviewStatus);

/* ---- people (Super Admin only) ---- */
router.get("/employees", requireRole("admin"), adminEmployees.adminListEmployees);
router.post("/employees", requireRole("admin"), validate(employeeSchema), adminEmployees.adminCreateEmployee);
router.patch("/employees/:id", requireRole("admin"), validate(employeeSchema.partial()), adminEmployees.adminUpdateEmployee);
router.patch("/employees/:id/active", requireRole("admin"), adminEmployees.adminSetEmployeeActive);

module.exports = router;
