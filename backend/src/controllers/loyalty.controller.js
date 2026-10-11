const asyncHandler = require("../utils/asyncHandler");
const loyalty = require("../services/loyalty.service");

const getLoyalty = asyncHandler(async (req, res) => {
  const account = await loyalty.getOrCreate(req.user.id);
  res.json({ loyalty: loyalty.summary(account) });
});

module.exports = { getLoyalty };
