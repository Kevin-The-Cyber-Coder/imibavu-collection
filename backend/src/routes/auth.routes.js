const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth");
const c = require("../controllers/auth.controller");

const router = Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Too many code requests — try again later" } },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Too many attempts — try again later" } },
});

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-zA-Z]/, "Password must contain a letter")
  .regex(/\d/, "Password must contain a number");

const registerSchema = z.object({
  name: z.string().trim().max(80).optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Invalid email").optional(),
  password: passwordSchema,
});

const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Enter your phone or email"),
  password: z.string().min(1, "Password required"),
  role: z.enum(["customer", "staff", "admin"]).optional(),
});

const otpSendSchema = z.object({
  phone: z.string().trim().min(8, "Phone required"),
  purpose: z.enum(["verify_phone", "reset_password", "login"]).optional(),
});

const otpVerifySchema = z.object({
  phone: z.string().trim().min(8, "Phone required"),
  code: z.string().regex(/^\d{6}$/, "6-digit code"),
});

const forgotSchema = z.object({ phone: z.string().trim().min(8, "Phone required") });

const resetSchema = z.object({
  phone: z.string().trim().min(8, "Phone required"),
  code: z.string().regex(/^\d{6}$/, "6-digit code"),
  newPassword: passwordSchema,
});

const pendingSchema = z.object({ pendingToken: z.string().min(10, "Missing session token") });

const changePasswordSchema = pendingSchema.extend({ newPassword: passwordSchema });

const mfaVerifySchema = pendingSchema.extend({ code: z.string().regex(/^\d{6}$/, "6-digit code") });

const mfaCodeSchema = z.object({ code: z.string().regex(/^\d{6}$/, "6-digit code") });

const unlockSchema = z.object({ phone: z.string().trim().min(8, "Phone required") });

const unlockVerifySchema = z.object({
  phone: z.string().trim().min(8, "Phone required"),
  code: z.string().regex(/^\d{6}$/, "6-digit code"),
});

const googleSchema = z.object({ idToken: z.string().min(20, "Missing Google token") });

router.post("/register", authLimiter, validate(registerSchema), c.register);
router.post("/login", authLimiter, validate(loginSchema), c.login);
router.post("/otp/send", otpLimiter, validate(otpSendSchema), c.otpSend);
router.post("/otp/verify", otpLimiter, validate(otpVerifySchema), c.otpVerify);
router.post("/forgot-password", otpLimiter, validate(forgotSchema), c.forgotPassword);
router.post("/reset-password", authLimiter, validate(resetSchema), c.resetPassword);
router.post("/password/change", authLimiter, validate(changePasswordSchema), c.changePassword);
router.post("/mfa/setup", authLimiter, validate(pendingSchema), c.mfaSetup);
router.post("/mfa/verify", authLimiter, validate(mfaVerifySchema), c.mfaVerify);
router.post("/mfa/disable", protect, validate(mfaCodeSchema), c.mfaDisable);
router.post("/unlock", otpLimiter, validate(unlockSchema), c.unlock);
router.post("/unlock/verify", otpLimiter, validate(unlockVerifySchema), c.unlockVerify);
router.post("/google", authLimiter, validate(googleSchema), c.google);
router.post("/refresh", c.refresh);
router.post("/logout", c.logout);
router.get("/me", protect, c.me);

module.exports = router;
