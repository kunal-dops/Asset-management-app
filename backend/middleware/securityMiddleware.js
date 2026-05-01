const crypto = require("crypto");

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_LIMIT = 300;
const buckets = new Map();

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  next();
}

function requestContext(req, res, next) {
  req.requestId = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}

function requestLogger(req, res, next) {
  const startedAt = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - startedAt;
    console.log(`${req.requestId} ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
}

function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || DEFAULT_WINDOW_MS;
  const limit = options.limit || DEFAULT_LIMIT;
  const keyPrefix = options.keyPrefix || "global";

  return (req, res, next) => {
    const now = Date.now();
    const key = `${keyPrefix}:${req.ip || req.socket.remoteAddress || "unknown"}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > limit) {
      const retryAfter = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: "Too many requests",
        message: `Please retry after ${retryAfter} seconds.`,
      });
    }

    next();
  };
}

module.exports = {
  createRateLimiter,
  requestContext,
  requestLogger,
  securityHeaders,
};
