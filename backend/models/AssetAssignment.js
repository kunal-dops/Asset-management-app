const mongoose = require("mongoose");

const assetAssignmentSchema = new mongoose.Schema(
  {
    asset_id: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assigned_date: { type: Date, required: true },
    expected_return_date: { type: Date, default: null },
    actual_return_date: { type: Date, default: null },
    assignment_status: { type: String, enum: ["assigned", "returned"], default: "assigned" },
    remarks: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

module.exports = mongoose.model("AssetAssignment", assetAssignmentSchema);
