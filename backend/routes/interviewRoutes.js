const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  createInterview,
  getInterviewHistory,
  getInterviewDetails,
  getInterviewResults,
} = require(
  "../controllers/interviewController"
);

router.post(
  "/create",
  protect,
  createInterview
);

router.get(
  "/history",
  protect,
  getInterviewHistory
);
router.get(
  "/results/:id",
  protect,
  getInterviewResults
);
router.get(
  "/:id",
  protect,
  getInterviewDetails
);

module.exports = router;