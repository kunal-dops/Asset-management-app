require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { connectDB, mongoose } = require("./config/db");
const { validateEnv } = require("./config/env");

const authMiddleware = require("./middleware/authMiddleware");
const {
  createRateLimiter,
  requestContext,
  requestLogger,
  securityHeaders,
} = require("./middleware/securityMiddleware");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const assetRoutes = require("./routes/assetRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();

validateEnv();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(requestContext);
app.use(securityHeaders);
app.use(requestLogger);
app.use(createRateLimiter());

app.use(cors({ origin: true, credentials: true }));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "IT Asset Management API Running", requestId: req.requestId });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "it-asset-management-api",
    environment: process.env.NODE_ENV || "development",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/categories", authMiddleware, categoryRoutes);
app.use("/api/assets", authMiddleware, assetRoutes);
app.use("/api/assignments", authMiddleware, assignmentRoutes);
app.use("/api/maintenance", authMiddleware, maintenanceRoutes);
app.use("/api/ai", authMiddleware, aiRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found`, requestId: req.requestId });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error", requestId: req.requestId });
});

const PORT = process.env.PORT || 5000;
let server;

connectDB().then(() => {
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

function shutdown(signal) {
  console.log(`${signal} received. Closing server...`);
  server.close(async () => {
    try {
      await mongoose.connection.close();
      console.log("Server closed cleanly.");
      process.exit(0);
    } catch (err) {
      console.error("Database shutdown failed:", err.message);
      process.exit(1);
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
