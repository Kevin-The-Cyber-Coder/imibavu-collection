/* RFC 6238 TOTP (HMAC-SHA1, 6 digits, 30s) + RFC 4648 Base32 — zero dependencies. */
const crypto = require("crypto");

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str) {
  const clean = String(str).replace(/[\s=]/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) throw new Error("Invalid base32 character");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateSecret(bytes = 20) {
  return base32Encode(crypto.randomBytes(bytes));
}

function hotp(secret, counter, digits = 6) {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter), 0);
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(bin % 10 ** digits).padStart(digits, "0");
}

function totp(secret, atMs = Date.now(), step = 30, digits = 6) {
  const counter = Math.floor(atMs / 1000 / step);
  return hotp(secret, counter, digits);
}

function verify(secret, token, window = 1, step = 30) {
  const clean = String(token || "").replace(/\s/g, "");
  const now = Date.now();
  for (let i = -window; i <= window; i++) {
    const at = now + i * step * 1000;
    if (totp(secret, at, step) === clean) return true;
  }
  return false;
}

function otpauthUri(secret, account, issuer = "Imibavu Collection") {
  const label = `${issuer}:${account}`;
  const qs = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${qs.toString()}`;
}

module.exports = { generateSecret, totp, verify, otpauthUri };