require("dotenv").config();

const REQUIRED_IN_PRODUCTION = [
  "JWT_SECRET",
  "DB_HOST",
  "DB_USER",
  "DB_NAME",
];

function validateEnv() {
  const isProduction = process.env.NODE_ENV === "production";
  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);

  if (isProduction && missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }

  if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
    throw new Error("JWT_SECRET must be at least 32 characters in production.");
  }

  if (isProduction && process.env.DB_USER === "root") {
    throw new Error("Do not use the MySQL root user in production. Configure a dedicated DB user.");
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "changeme_in_production") {
    console.warn("WARNING: JWT_SECRET is not configured for production use.");
  }
}

module.exports = {
  validateEnv,
};
