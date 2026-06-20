const mongoose = require("mongoose");

const maintenanceRequestSchema = new mongoose.Schema(
  {
    asset_id: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true },
    reported_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    issue_description: { type: String, required: true },
    request_date: { type: Date, required: true },
    status: { type: String, enum: ["pending", "in_progress", "resolved"], default: "pending" },
    technician_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolution_notes: { type: String, default: null },
    resolved_date: { type: Date, default: null },
    priority: { type: String, enum: ["normal", "urgent"], default: "normal" },
    request_type: { type: String, default: null },
    location: { type: String, default: null },
    sublocation: { type: String, default: null },
    department: { type: String, default: null },
    assigned_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    checked_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    last_edited_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("MaintenanceRequest", maintenanceRequestSchema);
