const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const {
  requireAdmin,
} = require("../middleware/adminMiddleware");
const {
  getAdminOverview,
} = require("../controllers/adminController");

router.get(
  "/overview",
  protect,
  requireAdmin,
  getAdminOverview
);

module.exports = router;
