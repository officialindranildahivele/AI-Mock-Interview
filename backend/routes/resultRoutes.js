const express = require("express");

const router = express.Router();

const protect =
require("../middleware/authMiddleware");

const {
  getInterviewResult,
} = require("../controllers/resultController");

router.get(
  "/:id",
  protect,
  getInterviewResult
);

module.exports = router;