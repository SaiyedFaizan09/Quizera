const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");
const { startQuizScheduleJob } = require("./services/quizScheduler");

const app = express();

app.use(cors());
app.use(express.json());

// Simple request logger to help debug endpoints
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

connectDB();

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
// Quiz management routes MUST come before generic quiz routes
app.use("/api/quizzes", require("./routes/quizManageRoutes"));
app.use("/api/quizzes", require("./routes/quizRoutes"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Quiz management routes loaded`);
  startQuizScheduleJob();
});