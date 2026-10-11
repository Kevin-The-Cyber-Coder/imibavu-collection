const path = require("path");
const crypto = require("crypto");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const isProd = process.env.NODE_ENV === "production";

function required(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "" || v === null) {
    console.error(`[env] Missing required variable: ${name}`);
    process.exit(1);
  }
  return v;
}

const devSecret = (label) =>
  crypto.createHash("sha256").update(`imibavu-dev-${label}`).digest("hex");

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProd,
  port: Number(process.env.PORT || 5000),
  mongoUri: required("MONGODB_URI"),
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:8000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  jwt: {
    accessSecret: required(
      "JWT_ACCESS_SECRET",
      isProd ? "" : devSecret("access")
    ),
    refreshSecret: required(
      "JWT_REFRESH_SECRET",
      isProd ? "" : devSecret("refresh")
    ),
    accessTtl: process.env.ACCESS_TOKEN_TTL || "15m",
    refreshDays: Number(process.env.REFRESH_TOKEN_DAYS || 7),
  },
  admin: {
    name: process.env.ADMIN_NAME || "Imibavu Admin",
    phone: process.env.ADMIN_PHONE || "",
    email: process.env.ADMIN_EMAIL || "",
    password: process.env.ADMIN_PASSWORD || "",
  },
  sms: {
    // "console" logs OTPs to the server log (dev default); "sms" sends real
    // messages via Africa's Talking (requires AT_API_KEY + AT_USERNAME).
    mode: process.env.SMS_MODE || (isProd ? "sms" : "console"),
    apiKey: process.env.AT_API_KEY || "",
    username: process.env.AT_USERNAME || "",
    senderId: process.env.AT_SENDER_ID || "",
  },
  payments: {
    // "console" simulates the Flutterwave hosted checkout locally (dev default);
    // "flutterwave" calls the live Flutterwave API (requires FLW_SECRET_KEY).
    mode: process.env.PAYMENTS_MODE || (isProd ? "flutterwave" : "console"),
    publicKey: process.env.FLW_PUBLIC_KEY || "",
    secretKey: process.env.FLW_SECRET_KEY || "",
    secretHash: process.env.FLW_SECRET_HASH || "",
    currency: process.env.PAYMENTS_CURRENCY || "RWF",
    // Frontend base URL — the order page route is appended in code.
    redirectUrl: process.env.PAYMENTS_REDIRECT_URL || "http://localhost:8000",
    // Public base URL of this API — used to build the local mock checkout link.
    apiBaseUrl: process.env.API_BASE_URL || `http://localhost:${Number(process.env.PORT || 5000)}/api/v1`,
  },
  storePhone: process.env.STORE_PHONE || "+250784804739",
};

module.exports = env;
