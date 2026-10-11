const { Router } = require("express");
const { protect } = require("../middleware/auth");
const c = require("../controllers/loyalty.controller");

const router = Router();

router.get("/", protect, c.getLoyalty);

module.exports = router;
