const LoyaltyAccount = require("../models/LoyaltyAccount");

/* Earning: 1 point per 1,000 RWF spent. */
const EARN_PER_RWF = 1000;
/* Bonus for an approved product review. */
const REVIEW_BONUS = 50;
/* Redemption: points are redeemed in 100-point blocks worth 1,000 RWF each. */
const REDEEM_STEP = 100;
const POINT_VALUE = 10;

const TIERS = [
  { id: "bronze", label: "Bronze", min: 0 },
  { id: "silver", label: "Silver", min: 500 },
  { id: "gold", label: "Gold", min: 1500 },
];

function tierFor(lifetime) {
  let current = TIERS[0];
  for (const t of TIERS) if (lifetime >= t.min) current = t;
  const idx = TIERS.indexOf(current);
  const next = TIERS[idx + 1] || null;
  return {
    tier: current.id,
    label: current.label,
    nextTier: next ? next.id : null,
    nextLabel: next ? next.label : null,
    toNext: next ? next.min - lifetime : 0,
  };
}

function earnPointsFor(total) {
  return Math.floor((Number(total) || 0) / EARN_PER_RWF);
}

/* Validate a requested redemption against a balance. */
function validateRedeem(points, balance) {
  const p = Math.floor(Number(points) || 0);
  if (p <= 0) return { ok: true, points: 0, discount: 0 };
  if (p % REDEEM_STEP !== 0) return { ok: false, message: `Redeem in multiples of ${REDEEM_STEP} points` };
  if (p > balance) return { ok: false, message: "Not enough points" };
  return { ok: true, points: p, discount: p * POINT_VALUE };
}

async function getOrCreate(userId) {
  return LoyaltyAccount.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, points: 0, lifetime: 0, history: [] } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function award(userId, points, { reason = "", orderId = "" } = {}) {
  const p = Math.floor(Number(points) || 0);
  if (!userId || p <= 0) return null;
  return LoyaltyAccount.findOneAndUpdate(
    { user: userId },
    {
      $inc: { points: p, lifetime: p },
      $push: { history: { type: "earn", points: p, reason, orderId } },
      $setOnInsert: { user: userId },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

/* Deduct points atomically, but only if the balance still covers it. */
async function redeem(userId, points, { reason = "", orderId = "" } = {}) {
  const p = Math.floor(Number(points) || 0);
  if (!userId || p <= 0) return null;
  const acc = await getOrCreate(userId);
  const check = validateRedeem(p, acc.points);
  if (!check.ok) return { error: check.message };
  const updated = await LoyaltyAccount.findOneAndUpdate(
    { user: userId, points: { $gte: p } },
    {
      $inc: { points: -p },
      $push: { history: { type: "redeem", points: p, reason, orderId } },
    },
    { new: true }
  );
  if (!updated) return { error: "Not enough points" };
  return { account: updated, discount: p * POINT_VALUE };
}

function summary(account) {
  const acc = account || { points: 0, lifetime: 0, history: [] };
  const t = tierFor(acc.lifetime || 0);
  return {
    points: acc.points || 0,
    lifetime: acc.lifetime || 0,
    tier: t.tier,
    tierLabel: t.label,
    nextTier: t.nextTier,
    nextTierLabel: t.nextLabel,
    toNext: t.toNext,
    earnPerRwf: EARN_PER_RWF,
    redeemStep: REDEEM_STEP,
    pointValue: POINT_VALUE,
    history: (acc.history || []).slice(-20).reverse(),
  };
}

module.exports = {
  EARN_PER_RWF,
  REVIEW_BONUS,
  REDEEM_STEP,
  POINT_VALUE,
  TIERS,
  tierFor,
  earnPointsFor,
  validateRedeem,
  getOrCreate,
  award,
  redeem,
  summary,
};
