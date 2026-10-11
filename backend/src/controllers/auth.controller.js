const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Otp = require("../models/Otp");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const sms = require("../services/sms.service");
const tokens = require("../services/token.service");
const env = require("../config/env");

const OTP_TTL_MIN = 5;
const MAX_OTP_ATTEMPTS = 5;
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

function normalizePhone(raw) {
  if (!raw) return null;
  let p = String(raw).replace(/[\s\-().]/g, "");
  if (/^0\d{9}$/.test(p)) p = "+250" + p.slice(1);
  if (/^250\d{9}$/.test(p)) p = "+" + p;
  return p;
}

async function createAndSendOtp(phone, purpose) {
  const code = crypto.randomInt(100000, 1000000).toString();
  await Otp.deleteMany({ phone, purpose });
  await Otp.create({
    phone,
    code,
    purpose,
    expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60 * 1000),
  });
  const result = await sms.sendOtp(phone, code, purpose);
  // In dev (console mode) surface the code so the UI/tests can proceed.
  return { sent: true, mode: result.mode, devCode: result.mode === "console" ? code : undefined };
}

const register = asyncHandler(async (req, res) => {
  const { name, phone, email, password } = req.body;
  const normPhone = normalizePhone(phone);
  if (!normPhone && !email) {
    throw ApiError.validation([{ path: "phone", message: "Phone or email required" }]);
  }

  const existing = await User.findOne({
    $or: [
      ...(normPhone ? [{ phone: normPhone }] : []),
      ...(email ? [{ email }] : []),
    ],
  });
  if (existing) throw ApiError.conflict("An account with that phone or email already exists");

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name || "",
    phone: normPhone || undefined,
    email: email || undefined,
    passwordHash,
    role: "customer",
    isVerified: false,
  });

  let otp = null;
  if (normPhone) otp = await createAndSendOtp(normPhone, "verify_phone");

  const { accessToken } = await tokens.issueTokenPair(res, user);
  res.status(201).json({ user: user.toPublic(), accessToken, otp });
});

const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const normPhone = normalizePhone(identifier);
  const isEmail = /^\S+@\S+$/.test(identifier);

  const user = await User.findOne(
    normPhone && !isEmail ? { phone: normPhone } : { email: identifier.toLowerCase() }
  ).select("+passwordHash");
  const genericError = ApiError.unauthorized("Wrong phone/email or password");

  if (!user) throw genericError;

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw ApiError.tooMany(
      `Account locked after repeated failures. Try again after ${user.lockedUntil.toLocaleTimeString()}.`
    );
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED_LOGINS) {
      user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    throw genericError;
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  const { accessToken } = await tokens.issueTokenPair(res, user);
  res.json({ user: user.toPublic(), accessToken });
});

const otpSend = asyncHandler(async (req, res) => {
  const { phone, purpose } = req.body;
  const normPhone = normalizePhone(phone);
  const result = await createAndSendOtp(normPhone, purpose || "verify_phone");
  res.json({ ...result });
});

const otpVerify = asyncHandler(async (req, res) => {
  const { phone, code } = req.body;
  const normPhone = normalizePhone(phone);
  const otp = await Otp.findOne({
    phone: normPhone,
    purpose: "verify_phone",
  }).sort({ createdAt: -1 });

  if (!otp) throw ApiError.notFound("No active code for that phone number");
  if (otp.expiresAt < new Date()) throw ApiError.badRequest("Code expired — request a new one");
  if (otp.attempts >= MAX_OTP_ATTEMPTS) throw ApiError.tooMany("Too many attempts — request a new code");

  otp.attempts += 1;
  if (otp.code !== code) {
    await otp.save();
    throw ApiError.badRequest("Incorrect code");
  }

  await Otp.deleteMany({ phone: normPhone, purpose: "verify_phone" });
  const user = await User.findOne({ phone: normPhone });
  if (user) {
    user.isVerified = true;
    await user.save();
  }
  res.json({ verified: true });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const normPhone = normalizePhone(req.body.phone);
  const user = await User.findOne({ phone: normPhone });
  // Do not reveal whether the account exists.
  let result = null;
  if (user) result = await createAndSendOtp(normPhone, "reset_password");
  res.json({ sent: true, ...(result && result.devCode ? { devCode: result.devCode } : {}) });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { phone, code, newPassword } = req.body;
  const normPhone = normalizePhone(phone);

  const otp = await Otp.findOne({
    phone: normPhone,
    purpose: "reset_password",
  }).sort({ createdAt: -1 });
  if (!otp) throw ApiError.notFound("Request a reset code first");
  if (otp.expiresAt < new Date()) throw ApiError.badRequest("Code expired — request a new one");
  if (otp.attempts >= MAX_OTP_ATTEMPTS) throw ApiError.tooMany("Too many attempts — request a new code");

  otp.attempts += 1;
  if (otp.code !== code) {
    await otp.save();
    throw ApiError.badRequest("Incorrect code");
  }

  const user = await User.findOne({ phone: normPhone }).select("+passwordHash");
  if (!user) throw ApiError.notFound("Account not found");

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.refreshHash = undefined;
  await user.save();
  await Otp.deleteMany({ phone: normPhone, purpose: "reset_password" });
  tokens.clearRefreshCookie(res);
  res.json({ reset: true });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[tokens.REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized("No refresh token");
  let payload;
  try {
    payload = tokens.verifyRefresh(token);
  } catch {
    tokens.clearRefreshCookie(res);
    throw ApiError.unauthorized("Refresh token expired");
  }
  const user = await User.findById(payload.sub).select("+refreshHash");
  if (!user) {
    tokens.clearRefreshCookie(res);
    throw ApiError.unauthorized("Account no longer exists");
  }
  try {
    const pair = await tokens.rotateRefresh(res, user, token);
    res.json({ ...pair, user: user.toPublic() });
  } catch (err) {
    tokens.clearRefreshCookie(res);
    throw ApiError.unauthorized("Refresh token revoked");
  }
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[tokens.REFRESH_COOKIE];
  if (token) {
    try {
      const payload = tokens.verifyRefresh(token);
      const user = await User.findById(payload.sub).select("+refreshHash");
      if (user) {
        user.refreshHash = undefined;
        await user.save();
      }
    } catch {
      /* already invalid — just clear the cookie */
    }
  }
  tokens.clearRefreshCookie(res);
  res.json({ ok: true });
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.unauthorized("Account no longer exists");
  res.json({ user: user.toPublic() });
});

module.exports = {
  register,
  login,
  otpSend,
  otpVerify,
  forgotPassword,
  resetPassword,
  refresh,
  logout,
  me,
  normalizePhone,
};
