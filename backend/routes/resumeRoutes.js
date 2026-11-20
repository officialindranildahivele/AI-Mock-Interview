const express = require("express");
const router = express.Router();

const multer = require("multer");
const protect =
require("../middleware/authMiddleware");

const {
  uploadResume,
  scanResumeAts,
} = require("../controllers/resumeController");

const storage =
  multer.diskStorage({
    destination:
      "./uploads",
    filename:
      (req, file, cb) => {
        cb(
          null,
          Date.now() +
            "-" +
            file.originalname
        );
      },
  });

const upload =
  multer({ storage });

router.post(
  "/upload",
  protect,
  upload.single("resume"),
  uploadResume
);

router.post(
  "/ats",
  protect,
  upload.single("resume"),
  scanResumeAts
);

module.exports = router;
