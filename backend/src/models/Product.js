const mongoose = require("mongoose");

const sizeSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const notesSchema = new mongoose.Schema(
  {
    top: { type: [String], default: [] },
    heart: { type: [String], default: [] },
    base: { type: [String], default: [] },
  },
  { _id: false }
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: "" },
    primary: { type: Boolean, default: false },
  },
  { _id: false }
);

const localizedSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    desc: { type: String, default: "" },
  },
  { _id: false }
);

const i18nSchema = new mongoose.Schema(
  {
    rw: { type: localizedSchema, default: () => ({}) },
    fr: { type: localizedSchema, default: () => ({}) },
  },
  { _id: false }
);

const seoSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    desc: { type: String, default: "" },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    desc: { type: String, default: "" },
    brand: { type: String, required: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ["perfumes", "oils", "jewelry"],
      index: true,
    },
    gender: { type: String, default: "Unisex" },
    family: { type: String, default: "" },
    longevity: { type: String, enum: ["light", "moderate", "long"], default: "moderate" },
    price: { type: Number, required: true, min: 0 },
    sizes: { type: [sizeSchema], default: [] },
    stock: { type: String, enum: ["in", "low", "out"], default: "in" },
    tags: { type: [String], default: [], index: true },
    inspired: { type: String, default: null },
    color: { type: String, default: "#b08d4f" },
    notes: { type: notesSchema, default: () => ({}) },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    season: { type: String, default: "" },
    images: { type: [imageSchema], default: [] },
    i18n: { type: i18nSchema, default: () => ({}) },
    seo: { type: seoSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published",
      index: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* Keep `isActive` (used by the public catalog queries) in lock-step with the
   editorial `status` field so the shop only ever shows published products. */
productSchema.pre("save", function syncActive(next) {
  this.isActive = this.status === "published";
  next();
});

productSchema.index({ name: "text", desc: "text", family: "text" });
productSchema.index({ category: 1, brand: 1, price: 1 });

module.exports = mongoose.model("Product", productSchema);
