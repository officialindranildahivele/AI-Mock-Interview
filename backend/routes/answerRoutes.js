const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  submitAnswer,
  transcribeVoiceAnswer,
} = require("../controllers/answerController");

router.post(
  "/submit",
  protect,
  submitAnswer
);

router.post(
  "/transcribe",
  protect,
  transcribeVoiceAnswer
);

module.exports = router;
