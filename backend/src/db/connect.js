const mongoose = require("mongoose");
const env = require("../config/env");
const logger = require("../utils/logger");

const MODELS = [
  "User",
  "Otp",
  "Product",
  "Brand",
  "Cart",
  "Order",
  "Payment",
  "Blend",
  "Booking",
  "ScentProfile",
  "Review",
  "Wishlist",
  "LoyaltyAccount",
];

async function ensureIndexes() {
  await Promise.all(
    MODELS.map((name) => {
      const Model = require(`../models/${name}`);
      return Model.init();
    })
  );
  logger.info("MongoDB indexes ensured");
}

async function connectDB() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri);
  logger.info({ db: mongoose.connection.name }, "MongoDB connected");
  await ensureIndexes();
}

module.exports = { connectDB };
