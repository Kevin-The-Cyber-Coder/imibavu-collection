/* Imibavu Collection — employee (staff) management.
   Only a Super Admin reaches these routes (the route applies requireArea).
   Creating an employee issues a temporary password and forces a change at
   first login; permissions are stored exactly as granted. */
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { PERMISSION_AREAS, ROLE_PRESETS } = require("../constants/permissions");

function normPhone(raw) {
  let p = String(raw || "").replace(/[\s\-().]/g, "");
  if (/^0\d{9}$/.test(p)) p = "+250" + p.slice(1);
  if (/^250\d{9}$/.test(p)) p = "+" + p;
  return p;
}

function cleanAreas(list) {
  const set = new Set(Array.isArray(list) ? list : []);
  return PERMISSION_AREAS.filter((a) => set.has(a));
}

function genTempPassword() {
  // Readable but strong: e.g. Imibavu-7K2QF9
  return `Imibavu-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

const adminListEmployees = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const q = String(req.query.q || "").trim();
  const filter = { role: { $in: ["staff", "admin"] } };
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { phone: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ];
  }
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({
    items: items.map((u) => u.toPublic()),
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
  });
});

const adminCreateEmployee = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const phone = normPhone(req.body.phone);
  const email = String(req.body.email || "").trim().toLowerCase() || undefined;
  if (!name) throw ApiError.validation([{ path: "name", message: "Name is required" }]);
  if (!/^\+250\d{9}$/.test(phone)) throw ApiError.validation([{ path: "phone", message: "Phone must look like +2507XXXXXXXX" }]);

  const permissionPreset = ROLE_PRESETS[req.body.permissionPreset] ? req.body.permissionPreset : null;
  let permissions = cleanAreas(req.body.permissions);
  if (!permissions.length && permissionPreset) permissions = [...ROLE_PRESETS[permissionPreset].areas];
  if (!permissions.length) throw ApiError.validation([{ path: "permissions", message: "Grant at least one permission area" }]);

  const exists = await User.findOne({ $or: [{ phone }, ...(email ? [{ email }] : [])] });
  if (exists) throw ApiError.conflict("An account with that phone or email already exists");

  const tempPassword = genTempPassword();
  const user = await User.create({
    name,
    phone,
    email,
    role: "staff",
    passwordHash: await bcrypt.hash(tempPassword, 10),
    isVerified: true,
    isActive: true,
    mustChangePassword: true,
    permissionPreset,
    permissions,
  });

  res.status(201).json({ employee: user.toPublic(), tempPassword });
});

const adminUpdateEmployee = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("Employee not found");
  if (user.role === "customer") throw ApiError.validation([{ path: "id", message: "Not an employee account" }]);

  if (req.body.name !== undefined) user.name = String(req.body.name).trim();
  if (req.body.phone !== undefined) {
    const phone = normPhone(req.body.phone);
    if (!/^\+250\d{9}$/.test(phone)) throw ApiError.validation([{ path: "phone", message: "Phone must look like +2507XXXXXXXX" }]);
    user.phone = phone;
  }
  if (req.body.email !== undefined) user.email = String(req.body.email).trim().toLowerCase() || undefined;
  if (req.body.permissionPreset !== undefined) {
    user.permissionPreset = ROLE_PRESETS[req.body.permissionPreset] ? req.body.permissionPreset : null;
  }
  if (req.body.permissions !== undefined) {
    const areas = cleanAreas(req.body.permissions);
    if (!areas.length) throw ApiError.validation([{ path: "permissions", message: "Grant at least one permission area" }]);
    user.permissions = areas;
  }
  if (req.body.isActive !== undefined) user.isActive = !!req.body.isActive;
  await user.save();
  res.json({ employee: user.toPublic() });
});

const adminSetEmployeeActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("Employee not found");
  if (user.role === "admin") throw ApiError.forbidden("The Super Admin account cannot be deactivated here");
  user.isActive = !!req.body.isActive;
  if (!user.isActive) user.refreshHash = undefined; // sign them out everywhere
  await user.save();
  res.json({ employee: user.toPublic() });
});

module.exports = {
  adminListEmployees,
  adminCreateEmployee,
  adminUpdateEmployee,
  adminSetEmployeeActive,
};
