const express = require("express");

const router = express.Router();

const protect =
require("../middleware/authMiddleware");

const {
  getInterviewHistory,
} = require("../controllers/historyController");

router.get(
  "/",
  protect,
  getInterviewHistory
);

module.exports = router;