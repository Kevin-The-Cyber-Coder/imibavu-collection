/* Imibavu Collection — shared access areas.
   Kept in sync with the frontend (frontend/src/components/Portal.jsx) so the
   permission checkboxes the Super Admin ticks map 1:1 to backend enforcement. */

const PERMISSION_AREAS = [
  "orders",
  "products",
  "inventory",
  "customers",
  "reviews",
  "returns",
  "messages",
  "bookings",
  "marketing",
  "brands",
  "money",
  "employees",
  "settings",
  "audit",
  "export",
];

/* Presets are templates only; the exact granted areas live on the user. */
const ROLE_PRESETS = {
  order_handler: { label: "Order Handler", areas: ["orders", "customers"] },
  inventory_clerk: { label: "Inventory Clerk", areas: ["products", "inventory"] },
  support_agent: { label: "Support Agent", areas: ["messages", "returns", "reviews", "bookings"] },
  marketing_assistant: { label: "Marketing Assistant", areas: ["marketing"] },
};

const DEFAULT_STAFF_AREAS = ["orders"];

/* Resolve the effective areas for a user.
   - admin         -> null ("everything")
   - customer      -> [] (nothing: customers never reach back-office areas)
   - staff         -> their exact permissions, else their preset, else the
                      conservative default. The default only ever applies to
                      staff, so a customer can never inherit it. */
function areasFor(user) {
  if (!user) return [];
  if (user.role === "admin") return null;
  if (user.role !== "staff") return [];
  if (Array.isArray(user.permissions) && user.permissions.length) return user.permissions;
  if (user.permissionPreset && ROLE_PRESETS[user.permissionPreset]) {
    return ROLE_PRESETS[user.permissionPreset].areas;
  }
  return DEFAULT_STAFF_AREAS;
}

function hasArea(user, area) {
  const areas = areasFor(user);
  if (areas === null) return true; // admin
  if (!area) return true;
  return areas.includes(area);
}

module.exports = {
  PERMISSION_AREAS,
  ROLE_PRESETS,
  DEFAULT_STAFF_AREAS,
  areasFor,
  hasArea,
};
