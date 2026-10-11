const { Router } = require("express");
const c = require("../controllers/brands.controller");

const router = Router();

router.get("/", c.listBrands);
router.get("/:id", c.getBrand);

module.exports = router;
