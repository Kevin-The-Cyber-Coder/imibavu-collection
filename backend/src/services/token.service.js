const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");

function signAccess(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessTtl }
  );
}

function signRefresh(user) {
  return jwt.sign(
    { sub: user._id.toString() },
    env.jwt.refreshSecret,
    { expiresIn: `${env.jwt.refreshDays}d` }
  );
}

function verifyAccess(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

function verifyRefresh(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

const REFRESH_COOKIE = "imibavu_rt";

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? "none" : "lax",
    path: "/api/v1/auth",
    maxAge: env.jwt.refreshDays * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, {
    path: "/api/v1/auth",
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? "none" : "lax",
  });
}

async function issueTokenPair(res, user) {
  const access = signAccess(user);
  const refresh = signRefresh(user);
  user.refreshHash = sha256(refresh);
  await user.save();
  if (res) setRefreshCookie(res, refresh);
  return { accessToken: access };
}

async function rotateRefresh(res, user, token) {
  if (!user.refreshHash || user.refreshHash !== sha256(token)) {
    throw Object.assign(new Error("Refresh token revoked"), {
      code: "REFRESH_REVOKED",
    });
  }
  return issueTokenPair(res, user);
}

module.exports = {
  REFRESH_COOKIE,
  sha256,
  signAccess,
  signRefresh,
  verifyAccess,
  verifyRefresh,
  setRefreshCookie,
  clearRefreshCookie,
  issueTokenPair,
  rotateRefresh,
};
