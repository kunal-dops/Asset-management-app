const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema(
  {
    asset_name: { type: String, required: true, trim: true },
    asset_tag: { type: String, required: true, unique: true, trim: true },
    serial_number: { type: String, default: null },
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    brand: { type: String, default: null },
    model: { type: String, default: null },
    purchase_date: { type: Date, default: null },
    purchase_cost: { type: Number, default: null },
    vendor: { type: String, default: null },
    warranty_expiry: { type: Date, default: null },
    status: {
      type: String,
      enum: ["available", "assigned", "maintenance", "retired"],
      default: "available",
    },
    location: { type: String, default: null },
    description: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

assetSchema.index({ serial_number: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Asset", assetSchema);
