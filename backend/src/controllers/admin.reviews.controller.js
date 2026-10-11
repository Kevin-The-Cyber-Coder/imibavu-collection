const Review = require("../models/Review");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { toPublicReview } = require("./reviews.controller");
const loyalty = require("../services/loyalty.service");

const adminListReviews = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const status = req.query.status ? String(req.query.status) : null;
  const filter = {};
  if (status) filter.status = status;
  const [items, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Review.countDocuments(filter),
  ]);
  res.json({
    items: items.map((r) => {
      const obj = r.toObject ? r.toObject() : r;
      return { ...toPublicReview(r), _id: obj._id, rewarded: obj.rewarded };
    }),
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
  });
});

/* Approve or hide a review. The first approval awards the author a loyalty bonus. */
const adminUpdateReviewStatus = asyncHandler(async (req, res) => {
  const status = String(req.body.status || "").toLowerCase();
  if (!["pending", "approved", "hidden"].includes(status)) {
    throw ApiError.validation([{ path: "status", message: "Invalid status" }]);
  }
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound("Review not found");

  review.status = status;
  if (status === "approved" && review.user && !review.rewarded) {
    review.rewarded = true;
    try {
      await loyalty.award(review.user, loyalty.REVIEW_BONUS, {
        reason: "review approved",
        orderId: review.slug,
      });
    } catch (e) {
      /* points are a bonus — never block moderation on a ledger hiccup */
    }
  }
  await review.save();
  res.json({ review: toPublicReview(review) });
});

module.exports = { adminListReviews, adminUpdateReviewStatus };
