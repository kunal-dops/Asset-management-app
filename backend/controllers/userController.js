const User = require("../models/User");
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

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-password -__v").lean();
    res.json(users.map(({ _id, ...u }) => ({ user_id: _id, ...u })));
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

exports.addUser = async (req, res) => {
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

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = await User.create({
      full_name,
      email,
      password: hashedPassword,
      role: role || "user",
      department,
      phone,
    });
    res.status(201).json({ message: "User added successfully", user_id: user._id });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Email already exists" });
    }
    console.error("ADD USER ERROR:", err);
    res.status(500).json({ error: "Failed to add user" });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { full_name, email, role, department, phone } = normalizeUserInput(req.body);

  if (!full_name || !email) {
    return res.status(400).json({ error: "full_name and email are required" });
  }
  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: "A valid email address is required" });
  }

  try {
    const result = await User.findByIdAndUpdate(id, { full_name, email, role, department, phone });
    if (!result) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User updated successfully" });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ error: "Invalid user id" });
    }
    console.error("UPDATE USER ERROR:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await User.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ error: "Invalid user id" });
    }
    console.error("DELETE USER ERROR:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
};
