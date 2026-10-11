const Product = require("../models/Product");
const Brand = require("../models/Brand");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { toPublicProduct } = require("../controllers/products.controller");

function parseSizes(sizes = []) {
  return (sizes || []).map((s) => ({ label: s.label, price: Number(s.price) })).filter((s) => s.label && s.price >= 0);
}

const adminListProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
  const [items, total] = await Promise.all([
    Product.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(),
  ]);
  res.json({
    items: items.map((p) => {
      const pub = toPublicProduct(p);
      const obj = p.toObject ? p.toObject() : p;
      return { ...pub, _id: obj._id, isActive: obj.isActive };
    }),
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
  });
});

const adminCreateProduct = asyncHandler(async (req, res) => {
  const slug = String(req.body.slug || "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  if (!slug) throw ApiError.validation([{ path: "slug", message: "Slug required" }]);
  const exists = await Product.findOne({ slug });
  if (exists) throw ApiError.conflict("Slug already exists");
  const product = await Product.create({
    slug,
    name: String(req.body.name || "").trim(),
    desc: String(req.body.desc || "").trim(),
    brand: String(req.body.brand || "").trim(),
    category: req.body.category || "perfumes",
    gender: req.body.gender || "Unisex",
    family: String(req.body.family || "").trim(),
    longevity: req.body.longevity || "moderate",
    price: Number(req.body.price || 0),
    sizes: parseSizes(req.body.sizes),
    stock: req.body.stock || "in",
    tags: Array.isArray(req.body.tags) ? req.body.tags : [],
    inspired: req.body.inspired || null,
    color: req.body.color || "#b08d4f",
    notes: req.body.notes || { top: [], heart: [], base: [] },
    rating: Number(req.body.rating || 0),
    reviewCount: Number(req.body.reviewCount || 0),
    season: String(req.body.season || "").trim(),
    images: Array.isArray(req.body.images) ? req.body.images : [],
    isActive: req.body.isActive !== false,
  });
  res.status(201).json({ product: { ...toPublicProduct(product), _id: (product.toObject ? product.toObject()._id : product._id), isActive: product.isActive } });
});

const adminUpdateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound("Product not found");
  if (req.body.slug) product.slug = String(req.body.slug).trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  if (req.body.name) product.name = String(req.body.name).trim();
  if (req.body.desc !== undefined) product.desc = String(req.body.desc).trim();
  if (req.body.brand !== undefined) product.brand = String(req.body.brand).trim();
  if (req.body.category) product.category = req.body.category;
  if (req.body.gender !== undefined) product.gender = req.body.gender;
  if (req.body.family !== undefined) product.family = String(req.body.family).trim();
  if (req.body.longevity) product.longevity = req.body.longevity;
  if (req.body.price !== undefined) product.price = Number(req.body.price);
  if (req.body.sizes) product.sizes = parseSizes(req.body.sizes);
  if (req.body.stock) product.stock = req.body.stock;
  if (req.body.tags) product.tags = req.body.tags;
  if (req.body.inspired !== undefined) product.inspired = req.body.inspired;
  if (req.body.color !== undefined) product.color = req.body.color;
  if (req.body.notes) product.notes = req.body.notes;
  if (req.body.rating !== undefined) product.rating = Number(req.body.rating);
  if (req.body.reviewCount !== undefined) product.reviewCount = Number(req.body.reviewCount);
  if (req.body.season !== undefined) product.season = String(req.body.season).trim();
  if (req.body.images) product.images = req.body.images;
  if (req.body.isActive !== undefined) product.isActive = !!req.body.isActive;
  await product.save();
  res.json({ product: { ...toPublicProduct(product), _id: (product.toObject ? product.toObject()._id : product._id), isActive: product.isActive } });
});

const adminDeleteProduct = asyncHandler(async (req, res) => {
  const p = await Product.findById(req.params.id);
  if (!p) throw ApiError.notFound("Product not found");
  await p.deleteOne();
  res.json({ ok: true });
});

const adminUpsertBrand = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) throw ApiError.validation([{ path: "name", message: "Name required" }]);
  const id = String(req.body.id || name.toLowerCase().replace(/[^a-z0-9-]+/g, "-"));
  const b = await Brand.findOneAndUpdate({ id }, { name, id, logo: req.body.logo || "" }, { upsert: true, new: true });
  res.json({ brand: b });
});

module.exports = { adminListProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct, adminUpsertBrand };

