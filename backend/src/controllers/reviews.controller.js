const Review = require("../models/Review");
const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { resolveOwner } = require("../utils/owner");

function toPublicReview(r) {
  const d = r.toObject ? r.toObject() : r;
  return {
    id: String(d._id),
    slug: d.slug,
    name: d.name,
    stars: d.stars,
    text: d.text,
    status: d.status,
    mine: !!d.mine,
    createdAt: d.createdAt,
  };
}

/* Public: approved reviews for one product. */
const listProductReviews = asyncHandler(async (req, res) => {
  const slug = String(req.params.slug || "").toLowerCase();
  const reviews = await Review.find({ slug, status: "approved" }).sort({ createdAt: -1 }).limit(50);
  res.json({ reviews: reviews.map(toPublicReview) });
});

/* Submit a review — always starts as pending moderation. */
const createReview = asyncHandler(async (req, res) => {
  const slug = String(req.params.slug || "").toLowerCase();
  const product = await Product.findOne({ slug, isActive: true });
  if (!product) throw ApiError.notFound("Product not found");

  const { name, stars, text } = req.body;
  const owner = resolveOwner(req) || {};

  const review = await Review.create({
    ...owner,
    product: product._id,
    slug,
    name,
    stars,
    text,
    status: "pending",
  });

  res.status(201).json({ review: toPublicReview(review) });
});

/* Signed-in customer's own reviews (any status). */
const listMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(100);
  res.json({ reviews: reviews.map(toPublicReview) });
});

module.exports = { listProductReviews, createReview, listMyReviews, toPublicReview };
