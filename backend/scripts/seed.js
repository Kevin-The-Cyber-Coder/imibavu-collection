/* Seeds MongoDB from the frontend's js/data.js (single source of truth).
   Usage: npm run seed  (safe to re-run — upserts by slug/id) */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const bcrypt = require("bcryptjs");

const env = require("../src/config/env");
const { connectDB } = require("../src/db/connect");
const mongoose = require("mongoose");
const Product = require("../src/models/Product");
const Brand = require("../src/models/Brand");
const User = require("../src/models/User");
const logger = require("../src/utils/logger");

function loadData() {
  const file = path.join(__dirname, "..", "..", "js", "data.js");
  const src = fs.readFileSync(file, "utf8");
  const sandbox = {};
  vm.createContext(sandbox);
  return vm.runInContext(
    `${src}\n;({ PRODUCTS, BRANDS, CATEGORIES, COLLECTIONS, BLEND_BASES, ZONES })`,
    sandbox,
    { filename: "data.js" }
  );
}

function toProductDoc(p, collections) {
  const computedTags = collections
    .filter((c) => {
      try {
        return c.match(p);
      } catch {
        return false;
      }
    })
    .map((c) => c.id);

  const tags = new Set(computedTags);
  if (p.trending) tags.add("trending");
  if (p.isNew) tags.add("new");

  return {
    slug: p.id,
    name: p.name,
    desc: p.desc || "",
    brand: p.brand,
    category: p.category,
    gender: p.gender || "Unisex",
    family: p.family || "",
    longevity: p.longevity || "moderate",
    price: p.price,
    sizes: (p.sizes || []).map(([label, price]) => ({
      label: String(label),
      price,
    })),
    stock: p.stock || "in",
    tags: [...tags],
    inspired: p.inspired ?? null,
    color: p.color || "#b08d4f",
    notes: p.notes || { top: [], heart: [], base: [] },
    rating: p.rating || 0,
    reviewCount: p.reviews || 0,
    season: p.season || "",
    images: p.images || [],
    isActive: true,
  };
}

async function seed() {
  await connectDB();

  const { PRODUCTS, BRANDS, COLLECTIONS } = loadData();

  let brands = 0;
  for (const b of BRANDS) {
    await Brand.updateOne({ id: b.id }, { $set: { name: b.name, tag: b.tag } }, { upsert: true });
    brands++;
  }

  let products = 0;
  for (const p of PRODUCTS) {
    await Product.updateOne({ slug: p.id }, { $set: toProductDoc(p, COLLECTIONS) }, { upsert: true });
    products++;
  }

  /* Demo / admin accounts — safe to re-run (upserted by email/phone) */
  const password = env.admin.password || "Admin123";
  const accounts = [
    {
      name: env.admin.name || "Imibavu Admin",
      email: "admin@imibavucollection.rw",
      phone: env.admin.phone || "+250784804739",
      role: "admin",
    },
    { name: "Demo Admin", email: "admin@imibavu250", phone: "", role: "admin" },
  ];

  const seeded = [];
  for (const a of accounts) {
    const query = a.email
      ? { email: a.email.toLowerCase() }
      : { phone: a.phone };
    let user = await User.findOne(query);
    if (!user) {
      user = await User.create({
        name: a.name,
        email: a.email ? a.email.toLowerCase() : undefined,
        phone: a.phone || undefined,
        passwordHash: await bcrypt.hash(password, 10),
        role: a.role,
        isVerified: true,
      });
    } else {
      /* demo accounts: always sync role + reset password to ADMIN_PASSWORD
         so the published demo credentials always work */
      let changed = false;
      if (user.role !== a.role) { user.role = a.role; changed = true; }
      if (a.phone && !user.phone) { user.phone = a.phone; changed = true; }
      user.passwordHash = await bcrypt.hash(password, 10);
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      await user.save();
    }
    seeded.push(a.email || a.phone);
  }

  logger.warn({ accounts: seeded, password: "(from ADMIN_PASSWORD)" }, "Admin/demo accounts ready");
  await mongoose.disconnect();
}

seed().catch((err) => {
  logger.error({ err }, "Seed failed");
  process.exit(1);
});
