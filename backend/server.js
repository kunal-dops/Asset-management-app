const express = require("express");
const cors = require("cors");
require("dotenv").config();
const db = require("./config/db");
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

const app = express();

validateEnv();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(requestContext);
app.use(securityHeaders);
app.use(requestLogger);
app.use(createRateLimiter());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000", "http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

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

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found`, requestId: req.requestId });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error", requestId: req.requestId });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

function shutdown(signal) {
  console.log(`${signal} received. Closing server...`);
  server.close(() => {
    db.end((err) => {
      if (err) {
        console.error("Database pool shutdown failed:", err.message);
        process.exit(1);
      }
      console.log("Server closed cleanly.");
      process.exit(0);
    });
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
