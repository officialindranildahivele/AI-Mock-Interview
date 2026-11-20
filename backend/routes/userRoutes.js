const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const {
  getLeaderboard,
} = require("../controllers/userController");

router.get("/profile", protect, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

router.get(
  "/leaderboard",
  protect,
  getLeaderboard
);

module.exports = router;
