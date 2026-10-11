const Blend = require("../models/Blend");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { resolveOwner } = require("../utils/owner");
const { findBase, findSize, cleanNotes, priceBlend } = require("../config/blends");

function toPublicBlend(b) {
  const doc = b.toObject ? b.toObject() : b;
  return {
    id: String(doc._id),
    name: doc.name,
    baseId: doc.baseId,
    baseLabel: doc.baseLabel,
    basePrice: doc.basePrice,
    notes: doc.notes || [],
    sizeLabel: doc.sizeLabel,
    sizePrice: doc.sizePrice,
    total: doc.total,
    status: doc.status,
    createdAt: doc.createdAt,
  };
}

const requireOwner = (req) => {
  const owner = resolveOwner(req);
  if (!owner) throw ApiError.validation([{ path: "guestId", message: "guestId is required for guests" }]);
  return owner;
};

const listBlends = asyncHandler(async (req, res) => {
  const owner = requireOwner(req);
  const blends = await Blend.find({ ...owner, status: "active" }).sort({ createdAt: -1 }).limit(50);
  res.json({ blends: blends.map(toPublicBlend) });
});

const createBlend = asyncHandler(async (req, res) => {
  const owner = requireOwner(req);
  const { name, baseId, notes, sizeIndex } = req.body;

  const base = findBase(baseId);
  if (!base) throw ApiError.validation([{ path: "baseId", message: "Unknown base oil" }]);
  const size = findSize(sizeIndex);
  if (!size) throw ApiError.validation([{ path: "sizeIndex", message: "Unknown bottle size" }]);
  const clean = cleanNotes(notes);
  const pricing = priceBlend(base.id, size.index);

  const blend = await Blend.create({
    ...owner,
    name: String(name).trim(),
    baseId: base.id,
    baseLabel: base.label,
    basePrice: base.price,
    notes: clean,
    sizeLabel: size.label,
    sizePrice: size.price,
    total: pricing.total,
  });

  res.status(201).json({ blend: toPublicBlend(blend) });
});

const deleteBlend = asyncHandler(async (req, res) => {
  const owner = requireOwner(req);
  const blend = await Blend.findOneAndDelete({ _id: req.params.id, ...owner });
  if (!blend) throw ApiError.notFound("Blend not found");
  res.json({ ok: true, id: req.params.id });
});

module.exports = { listBlends, createBlend, deleteBlend, toPublicBlend };
