const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const AssetAssignment = require("../models/AssetAssignment");
const Asset = require("../models/Asset");
const requireRole = require("../middleware/roleMiddleware");

// GET all assignments
router.get("/", async (req, res) => {
  try {
    const assignments = await AssetAssignment.find()
      .populate("asset_id", "asset_name asset_tag")
      .populate("user_id", "full_name")
      .sort({ _id: -1 })
      .lean();

    res.json(
      assignments.map(({ _id, asset_id, user_id, ...a }) => ({
        assignment_id: _id,
        asset_id: asset_id?._id || null,
        user_id: user_id?._id || null,
        asset_name: asset_id?.asset_name || null,
        asset_tag: asset_id?.asset_tag || null,
        full_name: user_id?.full_name || null,
        ...a,
      }))
    );
  } catch (err) {
    console.error("GET ASSIGNMENTS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ADD new assignment
router.post("/", requireRole("admin", "technician"), async (req, res) => {
  const { asset_id, user_id, assigned_date, expected_return_date, remarks } = req.body;

  if (!asset_id || !user_id || !assigned_date) {
    return res.status(400).json({ error: "asset_id, user_id and assigned_date are required" });
  }
  if (!mongoose.Types.ObjectId.isValid(asset_id) || !mongoose.Types.ObjectId.isValid(user_id)) {
    return res.status(400).json({ error: "Invalid asset_id or user_id" });
  }

  try {
    const assignment = await AssetAssignment.create({
      asset_id,
      user_id,
      assigned_date,
      expected_return_date: expected_return_date || null,
      remarks: remarks || null,
    });

    await Asset.findByIdAndUpdate(asset_id, { status: "assigned" });

    res.json({ message: "Asset assigned successfully", assignment_id: assignment._id });
  } catch (err) {
    console.error("ADD ASSIGNMENT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// RETURN asset
router.put("/return/:id", requireRole("admin", "technician"), async (req, res) => {
  const { id } = req.params;
  const { actual_return_date } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid assignment id" });
  }

  try {
    const assignment = await AssetAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    await AssetAssignment.findByIdAndUpdate(id, {
      actual_return_date: actual_return_date || null,
      assignment_status: "returned",
    });

    await Asset.findByIdAndUpdate(assignment.asset_id, { status: "available" });

    res.json({ message: "Asset returned successfully" });
  } catch (err) {
    console.error("RETURN ASSIGNMENT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
