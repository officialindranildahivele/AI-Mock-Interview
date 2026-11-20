const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const {
  runCodingSubmission,
} = require("../controllers/codingController");

router.post(
  "/run",
  protect,
  runCodingSubmission
);

module.exports = router;
