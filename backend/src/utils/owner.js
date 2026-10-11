/* Shared ownership resolver: an authenticated user, else a guest id.
   Mirrors the logic in cart.controller so behaviour is consistent. */
function resolveOwner(req) {
  if (req.user && req.user.id) return { user: req.user.id };
  const guestId = req.headers["x-guest-id"] || (req.body && req.body.guestId) || req.query.guestId;
  if (guestId) return { guestId: String(guestId).slice(0, 64) };
  return null;
}

module.exports = { resolveOwner };
