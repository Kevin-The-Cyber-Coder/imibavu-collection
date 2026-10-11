const env = require("../config/env");
const logger = require("../utils/logger");

const hasProvider = () =>
  env.sms.mode === "sms" && Boolean(env.sms.apiKey && env.sms.username);

async function sendSms(to, message) {
  if (!hasProvider()) {
    logger.info({ to, message }, "[sms] provider not configured — logged instead");
    return { mode: "console" };
  }
  const res = await fetch(
    "https://api.africastalking.com/version1/messaging",
    {
      method: "POST",
      headers: {
        apiKey: env.sms.apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        username: env.sms.username,
        to,
        message,
        ...(env.sms.senderId ? { from: env.sms.senderId } : {}),
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    logger.error({ status: res.status, text }, "[sms] provider error");
    throw new Error("SMS provider error");
  }
  return { mode: "sms" };
}

async function sendOtp(phone, code, purpose) {
  const label =
    purpose === "reset_password" ? "password reset" : "verification";
  return sendSms(
    phone,
    `Imibavu Collection ${label} code: ${code}. Valid 5 minutes. Do not share it.`
  );
}

module.exports = { sendSms, sendOtp };
