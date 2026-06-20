const mongoose = require("mongoose");

const maintenanceAuditSchema = new mongoose.Schema(
  {
    request_id: { type: mongoose.Schema.Types.ObjectId, ref: "MaintenanceRequest", required: true },
    action: { type: String, required: true },
    edited_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    edited_role: { type: String, default: null },
    changes_json: { type: String, default: null },
    notes: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

module.exports = mongoose.model("MaintenanceAudit", maintenanceAuditSchema);
