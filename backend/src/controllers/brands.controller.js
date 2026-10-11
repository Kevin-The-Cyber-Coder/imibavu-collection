const Brand = require("../models/Brand");
const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { toPublicProduct } = require("./products.controller");

const listBrands = asyncHandler(async (req, res) => {
  const brands = await Brand.find({ isActive: true }).sort({ name: 1 });
  res.json({
    items: brands.map((b) => ({ id: b.id, name: b.name, tag: b.tag })),
  });
});

const getBrand = asyncHandler(async (req, res) => {
  const id = req.params.id.toLowerCase();
  const brand = await Brand.findOne({ id, isActive: true });
  if (!brand) throw ApiError.notFound("Brand not found");
  const products = await Product.find({ brand: id, isActive: true }).sort({ createdAt: -1 });
  res.json({
    brand: { id: brand.id, name: brand.name, tag: brand.tag },
    products: products.map(toPublicProduct),
  });
});

module.exports = { listBrands, getBrand };
