const db = require("../config/db");
const bcrypt = require("bcryptjs");

const VALID_ROLES = new Set(["admin", "technician", "user"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeUserInput(body) {
  return {
    full_name: String(body.full_name || "").trim(),
    email: String(body.email || "").trim().toLowerCase(),
    password: body.password,
    role: VALID_ROLES.has(body.role) ? body.role : "user",
    department: body.department ? String(body.department).trim() : null,
    phone: body.phone ? String(body.phone).trim() : null,
  };
}

// Get all users (never return passwords)
exports.getUsers = (req, res) => {
  db.query(
    "SELECT user_id, full_name, email, role, department, phone, created_at FROM users",
    (err, result) => {
      if (err) {
        console.error("GET USERS ERROR:", err);
        return res.status(500).json({ error: "Failed to fetch users" });
      }
      res.json(result);
    }
  );
};

// Add user with hashed password
exports.addUser = (req, res) => {
  const { full_name, email, password, role, department, phone } = normalizeUserInput(req.body);

  if (!full_name || !email || !password) {
    return res.status(400).json({ error: "full_name, email, and password are required" });
  }
  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: "A valid email address is required" });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const sql = `
    INSERT INTO users (full_name, email, password, role, department, phone)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [full_name, email, hashedPassword, role || "user", department || null, phone || null],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ error: "Email already exists" });
        }
        console.error("ADD USER ERROR:", err);
        return res.status(500).json({ error: "Failed to add user" });
      }
      res.status(201).json({ message: "User added successfully", user_id: result.insertId });
    }
  );
};

// Update user (no password update here — separate endpoint recommended)
exports.updateUser = (req, res) => {
  const { id } = req.params;
  const { full_name, email, role, department, phone } = normalizeUserInput(req.body);

  if (!full_name || !email) {
    return res.status(400).json({ error: "full_name and email are required" });
  }
  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: "A valid email address is required" });
  }

  const sql = `
    UPDATE users
    SET full_name = ?, email = ?, role = ?, department = ?, phone = ?
    WHERE user_id = ?
  `;

  db.query(sql, [full_name, email, role, department, phone, id], (err, result) => {
    if (err) {
      console.error("UPDATE USER ERROR:", err);
      return res.status(500).json({ error: "Failed to update user" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User updated successfully" });
  });
};

// Delete user
exports.deleteUser = (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM users WHERE user_id = ?", [id], (err, result) => {
    if (err) {
      console.error("DELETE USER ERROR:", err);
      return res.status(500).json({ error: "Failed to delete user" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  });
};
