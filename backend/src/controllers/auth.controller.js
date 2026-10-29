const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Otp = require("../models/Otp");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const sms = require("../services/sms.service");
const tokens = require("../services/token.service");
const totp = require("../services/totp.service");
const env = require("../config/env");

const OTP_TTL_MIN = 5;
const MAX_OTP_ATTEMPTS = 5;
const MAX_FAILED_LOGINS = env.auth.maxFailedLogins;
const LOCK_MINUTES = env.auth.lockMinutes;
const isDev = env.nodeEnv !== "production";
const STAFF_ROLES = ["staff", "admin"];

function normalizePhone(raw) {
  if (!raw) return null;
  let p = String(raw).replace(/[\s\-().]/g, "");
  if (/^0\d{9}$/.test(p)) p = "+250" + p.slice(1);
  if (/^250\d{9}$/.test(p)) p = "+" + p;
  return p;
}

/* Short-lived JWT that carries a login in progress (password change, MFA
   setup, MFA challenge). Once the required step completes we issue the real
   access/refresh pair. */
function issuePending(user, step) {
  return tokens.signAccess(user, "10m", step);
}

function verifyPending(token) {
  if (!token) throw ApiError.unauthorized("Session expired — sign in again");
  let payload;
  try {
    payload = tokens.verifyAccess(token);
  } catch {
    throw ApiError.unauthorized("Session expired — sign in again");
  }
  return { sub: payload.sub, step: payload.step };
}

/* Decides what a login still needs: password change -> MFA setup -> MFA
   challenge -> full session. Kept as one place so login, password change and
   MFA setup all finalize identically. */
async function finishLoginFlow(res, user) {
  if (user.mustChangePassword) {
    return res.json({ pending: { step: "password", token: issuePending(user, "password") }, user: user.toPublic() });
  }
  if (env.auth.mfaRequired && STAFF_ROLES.includes(user.role) && !(user.mfa && user.mfa.enabled)) {
    return res.json({ pending: { step: "mfa-setup", token: issuePending(user, "mfa-setup") }, user: user.toPublic() });
  }
  if (user.mfa && user.mfa.enabled) {
    const devCode = isDev ? totp.totp(user.mfa.secret) : undefined;
    return res.json({
      pending: { step: "mfa-login", token: issuePending(user, "mfa-login") },
      user: user.toPublic(),
      ...(devCode ? { devCode } : {}),
    });
  }
  const { accessToken } = await tokens.issueTokenPair(res, user);
  return res.json({ user: user.toPublic(), accessToken });
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
  const { identifier, password, role } = req.body;
  const normPhone = normalizePhone(identifier);
  const isEmail = /^\S+@\S+$/.test(identifier);

  const user = await User.findOne(
    normPhone && !isEmail ? { phone: normPhone } : { email: identifier.toLowerCase() }
  ).select("+passwordHash +mfa.secret");
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

  /* The role selector on the login screen is purely a UI convenience — the
     server decides the real role. When it does not match the selected one we
     answer with the same neutral error and never reveal which accounts exist. */
  if (role && user.role !== role) throw genericError;

  if (user.isActive === false) {
    throw ApiError.forbidden("This account has been deactivated — contact an administrator");
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  return finishLoginFlow(res, user);
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

/* ---- first-login + MFA ---- */

const changePassword = asyncHandler(async (req, res) => {
  const { pendingToken, newPassword } = req.body;
  const pending = verifyPending(pendingToken);
  const user = await User.findById(pending.sub).select("+passwordHash +mfa.secret");
  if (!user) throw ApiError.unauthorized("Account no longer exists");

  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    throw ApiError.badRequest("New password must be different from your current one");
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.mustChangePassword = false;
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  await user.save();

  return finishLoginFlow(res, user);
});

const mfaSetup = asyncHandler(async (req, res) => {
  const { pendingToken } = req.body;
  const pending = verifyPending(pendingToken);
  const user = await User.findById(pending.sub).select("+mfa.secret");
  if (!user) throw ApiError.unauthorized("Account no longer exists");
  if (!["mfa", "mfa-setup"].includes(pending.step)) {
    throw ApiError.badRequest("Two-step verification is not needed right now");
  }

  if (!user.mfa || !user.mfa.secret) {
    user.mfa = { enabled: false, secret: totp.generateSecret() };
    await user.save();
  }
  const account = user.email || user.phone || user._id.toString();
  const otpauth = totp.otpauthUri(user.mfa.secret, account, env.auth.mfaIssuer);
  if (user.mfa.otpauth !== otpauth) {
    user.mfa.otpauth = otpauth;
    await user.save();
  }
  res.json({ secret: user.mfa.secret, otpauth });
});

const mfaVerify = asyncHandler(async (req, res) => {
  const { pendingToken, code } = req.body;
  const pending = verifyPending(pendingToken);
  const user = await User.findById(pending.sub).select("+mfa.secret");
  if (!user) throw ApiError.unauthorized("Account no longer exists");

  if (pending.step === "mfa-login") {
    if (!(user.mfa && user.mfa.enabled && user.mfa.secret)) {
      throw ApiError.badRequest("Two-step verification is not enabled for this account");
    }
    if (!totp.verify(user.mfa.secret, code)) throw ApiError.unauthorized("Incorrect code");
  } else if (pending.step === "mfa" || pending.step === "mfa-setup") {
    if (!user.mfa || !user.mfa.secret) throw ApiError.badRequest("Set up two-step verification first");
    if (!totp.verify(user.mfa.secret, code)) throw ApiError.unauthorized("Incorrect code");
    if (!user.mfa.enabled) {
      user.mfa.enabled = true;
      await user.save();
    }
  } else {
    throw ApiError.badRequest("Nothing to verify right now");
  }

  const { accessToken } = await tokens.issueTokenPair(res, user);
  res.json({ user: user.toPublic(), accessToken });
});

const mfaDisable = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const user = await User.findById(req.user.id).select("+mfa.secret");
  if (!user || !(user.mfa && user.mfa.enabled && user.mfa.secret)) {
    throw ApiError.notFound("Two-step verification is not enabled");
  }
  if (!totp.verify(user.mfa.secret, code)) throw ApiError.unauthorized("Incorrect code");

  user.mfa.enabled = false;
  user.mfa.secret = undefined;
  user.mfa.otpauth = undefined;
  await user.save();
  res.json({ disabled: true });
});

/* ---- account unlock (after repeated failed logins) ---- */

const unlock = asyncHandler(async (req, res) => {
  const normPhone = normalizePhone(req.body.phone);
  if (!normPhone) throw ApiError.validation([{ path: "phone", message: "Phone required" }]);
  const result = await createAndSendOtp(normPhone, "unlock");
  res.json({ sent: true, ...(result.mode === "console" ? { devCode: result.devCode } : {}) });
});

const unlockVerify = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const normPhone = normalizePhone(req.body.phone);

  const otp = await Otp.findOne({ phone: normPhone, purpose: "unlock" }).sort({ createdAt: -1 });
  if (!otp) throw ApiError.notFound("Request an unlock code first");
  if (otp.expiresAt < new Date()) throw ApiError.badRequest("Code expired — request a new one");
  if (otp.attempts >= MAX_OTP_ATTEMPTS) throw ApiError.tooMany("Too many attempts — request a new code");

  otp.attempts += 1;
  if (otp.code !== code) {
    await otp.save();
    throw ApiError.badRequest("Incorrect code");
  }

  await Otp.deleteMany({ phone: normPhone, purpose: "unlock" });
  const user = await User.findOne({ phone: normPhone });
  if (user) {
    user.lockedUntil = null;
    user.failedLoginAttempts = 0;
    await user.save();
  }
  res.json({ unlocked: true });
});

/* ---- Google sign-in (customers only) ---- */

const google = asyncHandler(async (req, res) => {
  if (!env.auth.googleClientId) {
    throw new ApiError(501, "NOT_CONFIGURED", "Google sign-in is not configured on this server");
  }
  const { idToken } = req.body;
  let payload;
  try {
    const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!resp.ok) throw new Error("invalid token");
    payload = await resp.json();
  } catch {
    throw ApiError.unauthorized("Could not verify that Google account");
  }
  if (payload.aud !== env.auth.googleClientId || payload.email_verified !== "true" || !payload.email) {
    throw ApiError.unauthorized("Could not verify that Google account");
  }

  const email = String(payload.email).toLowerCase();
  let user = await User.findOne({ email });
  if (user && STAFF_ROLES.includes(user.role)) {
    throw ApiError.forbidden("Staff accounts must sign in with a password");
  }
  if (!user) {
    user = await User.create({
      name: payload.name || email.split("@")[0],
      email,
      passwordHash: await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10),
      role: "customer",
      isVerified: true,
    });
  }

  const { accessToken } = await tokens.issueTokenPair(res, user);
  res.json({ user: user.toPublic(), accessToken });
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
  changePassword,
  mfaSetup,
  mfaVerify,
  mfaDisable,
  unlock,
  unlockVerify,
  google,
  normalizePhone,
};
