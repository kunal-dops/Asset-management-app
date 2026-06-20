const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "changeme_in_production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

exports.login = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // Hardcoded Admin Access
  if (email === "admin@example.com" && password === "Admin@123") {
    const token = jwt.sign({ user_id: 0, role: "admin" }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.status(200).json({
      message: "Login successful",
      token,
      user: { user_id: 0, full_name: "System Administrator", email: "admin@example.com", role: "admin" },
    });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    let isMatch;
    if (user.password && (user.password.startsWith("$2a$") || user.password.startsWith("$2b$"))) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = password === user.password;
    }

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const normalizedRole = String(user.role || "user").toLowerCase();
    const token = jwt.sign(
      { user_id: user._id.toString(), role: normalizedRole },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        user_id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: normalizedRole,
        department: user.department,
        phone: user.phone,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
