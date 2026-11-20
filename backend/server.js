require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const interviewRoutes = require("./routes/interviewRoutes");
const answerRoutes = require("./routes/answerRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const codingRoutes = require("./routes/codingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const historyRoutes = require("./routes/historyRoutes");
const resultRoutes = require("./routes/resultRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({
  limit: "15mb",
}));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/answer", answerRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/coding", codingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/result", resultRoutes);

// Home Route
app.get("/", (req, res) => {
  res.send("AI Mock Interview API Running");
});

// Health Check
app.get("/api/status", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server Running",
    timestamp: new Date(),
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found",
  });
});

// Start Server
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});
