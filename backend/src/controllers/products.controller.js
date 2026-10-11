const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// Convert a Mongo product into the exact shape js/data.js products have,
// so the existing frontend render code keeps working unchanged.
function toPublicProduct(p) {
  const doc = p.toObject ? p.toObject() : p;
  const tags = doc.tags || [];
  return {
    id: doc.slug,
    slug: doc.slug,
    name: doc.name,
    brand: doc.brand,
    category: doc.category,
    gender: doc.gender,
    family: doc.family,
    longevity: doc.longevity,
    price: doc.price,
    sizes: (doc.sizes || []).map((s) => [s.label, s.price]),
    stock: doc.stock,
    trending: tags.includes("trending"),
    isNew: tags.includes("new"),
    tags,
    inspired: doc.inspired ?? null,
    color: doc.color,
    notes: doc.notes || { top: [], heart: [], base: [] },
    rating: doc.rating,
    reviews: doc.reviewCount,
    season: doc.season,
    desc: doc.desc,
    images: doc.images || [],
  };
}

const SORTS = {
  featured: { createdAt: 1 },
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  rating: { rating: -1 },
  name: { name: 1 },
};

const listProducts = asyncHandler(async (req, res) => {
  const {
    category,
    brand,
    tag,
    gender,
    family,
    q,
    minPrice,
    maxPrice,
    sort = "newest",
    page = 1,
    limit = 24,
  } = req.query;

  const filter = { isActive: true };
  if (category) filter.category = category;
  if (brand) filter.brand = brand.toLowerCase();
  if (tag) filter.tags = tag;
  if (gender) filter.gender = gender;
  if (family) filter.family = family;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (q) {
    filter.$or = [
      { name: { $regex: String(q), $options: "i" } },
      { desc: { $regex: String(q), $options: "i" } },
      { family: { $regex: String(q), $options: "i" } },
      { brand: { $regex: String(q), $options: "i" } },
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 24));
  const sortBy = SORTS[sort] || SORTS.newest;

  const [items, total] = await Promise.all([
    Product.find(filter).sort(sortBy).skip((pageNum - 1) * limitNum).limit(limitNum),
    Product.countDocuments(filter),
  ]);

  res.json({
    items: items.map(toPublicProduct),
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
  });
});

const getProduct = asyncHandler(async (req, res) => {
  const p = await Product.findOne({
    slug: req.params.slug.toLowerCase(),
    isActive: true,
  });
  if (!p) throw ApiError.notFound("Product not found");
  res.json({ product: toPublicProduct(p) });
});

module.exports = { listProducts, getProduct, toPublicProduct };
