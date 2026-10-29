const crypto = require("crypto");
const Subscriber = require("../models/Subscriber");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

/* Normalise a phone number the same way the auth controller does. */
function normPhone(raw) {
  let p = String(raw || "").replace(/[\s\-().]/g, "");
  if (/^0\d{9}$/.test(p)) p = "+250" + p.slice(1);
  if (/^250\d{9}$/.test(p)) p = "+" + p;
  return p;
}

/* Accepts either a phone number or an email address. */
function resolveContact(input) {
  const raw = String(input || "").trim();
  if (!raw) throw ApiError.badRequest("Enter a phone number or an email address");
  if (raw.includes("@")) {
    const email = raw.toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw ApiError.badRequest("That email address does not look right");
    return { contact: email, channel: "email" };
  }
  const phone = normPhone(raw);
  if (!/^\+250\d{9}$/.test(phone)) {
    throw ApiError.badRequest("Use a Rwandan number like +250 7XX XXX XXX");
  }
  return { contact: phone, channel: "whatsapp" };
}

/* Public: join the broadcast list. Idempotent — re-subscribing reactivates. */
const subscribe = asyncHandler(async (req, res) => {
  const { contact, channel } = resolveContact(req.body.contact);

  let sub = await Subscriber.findOne({ contact });
  if (sub) {
    const wasInactive = !sub.isActive;
    sub.isActive = true;
    sub.unsubscribedAt = null;
    sub.channel = channel;
    if (req.body.name) sub.name = String(req.body.name).trim().slice(0, 80);
    if (req.body.source) sub.source = String(req.body.source).trim().slice(0, 40);
    if (req.body.language) sub.language = req.body.language;
    if (!sub.user && req.user) sub.user = req.user.id;
    await sub.save();
    return res.json({
      success: true,
      alreadySubscribed: !wasInactive,
      subscriber: sub.toPublic(),
    });
  }

  sub = await Subscriber.create({
    contact,
    channel,
    name: req.body.name ? String(req.body.name).trim().slice(0, 80) : "",
    source: req.body.source ? String(req.body.source).trim().slice(0, 40) : "footer",
    language: req.body.language || "en",
    user: req.user ? req.user.id : null,
    unsubscribeCode: crypto.randomBytes(6).toString("hex"),
  });

  res.status(201).json({ success: true, alreadySubscribed: false, subscriber: sub.toPublic() });
});

/* Opt out from a link in a message (no auth needed — the code is the secret). */
const unsubscribe = asyncHandler(async (req, res) => {
  const sub = await Subscriber.findOne({ unsubscribeCode: String(req.params.code || "") });
  if (!sub) throw ApiError.notFound("That unsubscribe link is not valid");
  sub.isActive = false;
  sub.unsubscribedAt = new Date();
  await sub.save();
  res.json({ success: true });
});

/* Staff: the broadcast list. Gated by the marketing area on the route. */
const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Number(req.query.limit) || 100);
  const filter = req.query.includeInactive === "true" ? {} : { isActive: true };

  const [items, total, active] = await Promise.all([
    Subscriber.find(filter).sort({ subscribedAt: -1 }).skip((page - 1) * limit).limit(limit),
    Subscriber.countDocuments(filter),
    Subscriber.countDocuments({ isActive: true }),
  ]);

  res.json({
    items: items.map((s) => s.toPublic()),
    total,
    active,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

/* Staff: take someone off the list. */
const remove = asyncHandler(async (req, res) => {
  const sub = await Subscriber.findById(req.params.id);
  if (!sub) throw ApiError.notFound("Subscriber not found");
  sub.isActive = false;
  sub.unsubscribedAt = new Date();
  await sub.save();
  res.json({ success: true, subscriber: sub.toPublic() });
});

module.exports = { subscribe, unsubscribe, list, remove };
