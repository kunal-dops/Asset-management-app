const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "changeme_in_production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

exports.login = (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // Hardcoded Admin Access
if (email === "admin@example.com" && password === "Admin@123") {
  const token = jwt.sign(
    { user_id: 0, role: "admin" },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return res.status(200).json({
    message: "Login successful",
    token,
    user: {
      user_id: 0,
      full_name: "System Administrator",
      email: "admin@example.com",
      role: "admin"
    },
  });
}
  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], (err, result) => {
    if (err) {
      console.error("Login DB Error:", err);
      return res.status(500).json({ message: "Server error" });
    }

    if (result.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = result[0];

    // Support both hashed passwords (bcrypt) and plain text (legacy)
    const finishLogin = (isMatch) => {
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Normalize role to lowercase for consistent frontend access control
      const normalizedRole = String(user.role || "user").toLowerCase();

      const token = jwt.sign(
        { user_id: user.user_id, role: normalizedRole },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Never send password back
      const { password: _pw, ...safeUser } = user;
      safeUser.role = normalizedRole;

      res.status(200).json({
        message: "Login successful",
        token,
        user: safeUser,
      });
    };

    // Support both hashed passwords (bcrypt) and plain text (legacy)
    if (user.password && (String(user.password).startsWith("$2a$") || String(user.password).startsWith("$2b$"))) {
      bcrypt.compare(password, user.password, (compareErr, isMatch) => {
        if (compareErr) {
          console.error("Password compare error:", compareErr);
          return res.status(500).json({ message: "Server error" });
        }
        finishLogin(isMatch);
      });
    } else {
      // Fallback for legacy plain text passwords in the database
      finishLogin(password === user.password);
    }
  });
};
