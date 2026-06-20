const mongoose = require("mongoose");
const Asset = require("../models/Asset");
const AssetAssignment = require("../models/AssetAssignment");
const MaintenanceRequest = require("../models/MaintenanceRequest");

const VALID_ASSET_STATUSES = new Set(["available", "assigned", "maintenance", "retired"]);

function emptyToNull(v) {
  return v === "" || v === undefined ? null : v;
}

function toFloatOrNull(v) {
  const val = emptyToNull(v);
  if (val === null) return null;
  const n = Number.parseFloat(String(val));
  return Number.isFinite(n) ? n : null;
}

function toDateOrNull(v) {
  const val = emptyToNull(v);
  return val === null ? null : val;
}

function validateStatus(status) {
  const normalized = emptyToNull(status);
  if (normalized === null) return "available";
  return VALID_ASSET_STATUSES.has(normalized) ? normalized : null;
}

function toObjectIdOrNull(v) {
  const val = emptyToNull(v);
  if (val === null) return null;
  return mongoose.Types.ObjectId.isValid(val) ? val : null;
}

// GET ALL ASSETS
exports.getAssets = async (req, res) => {
  try {
    const assets = await Asset.find()
      .populate("category_id", "category_name")
      .sort({ _id: -1 })
      .lean();

    res.json(
      assets.map(({ _id, category_id, ...a }) => ({
        asset_id: _id,
        ...a,
        category_id: category_id?._id || null,
        category_name: category_id?.category_name || null,
      }))
    );
  } catch (err) {
    console.error("Get Assets Error:", err);
    res.status(500).json({ error: "Failed to fetch assets" });
  }
};

// ADD NEW ASSET
exports.addAsset = async (req, res) => {
  const {
    asset_name,
    asset_tag,
    serial_number,
    category_id,
    brand,
    model,
    purchase_date,
    purchase_cost,
    vendor,
    warranty_expiry,
    status,
    location,
    description,
  } = req.body;

  if (!asset_name || !String(asset_name).trim()) {
    return res.status(400).json({ error: "asset_name is required" });
  }
  if (!asset_tag || !String(asset_tag).trim()) {
    return res.status(400).json({ error: "asset_tag is required" });
  }

  const normalizedCategoryId = toObjectIdOrNull(category_id);
  if (!normalizedCategoryId) {
    return res.status(400).json({ error: "category_id is required and must be valid" });
  }

  const normalizedStatus = validateStatus(status);
  if (!normalizedStatus) {
    return res.status(400).json({ error: "Invalid asset status" });
  }

  try {
    await Asset.create({
      asset_name: String(asset_name).trim(),
      asset_tag: String(asset_tag).trim(),
      serial_number: emptyToNull(serial_number),
      category_id: normalizedCategoryId,
      brand: emptyToNull(brand),
      model: emptyToNull(model),
      purchase_date: toDateOrNull(purchase_date),
      purchase_cost: toFloatOrNull(purchase_cost),
      vendor: emptyToNull(vendor),
      warranty_expiry: toDateOrNull(warranty_expiry),
      status: normalizedStatus,
      location: emptyToNull(location),
      description: emptyToNull(description),
    });
    res.status(201).json({ message: "Asset added successfully" });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: "Asset tag or serial number already exists",
        details: "Please use unique asset tag and serial number values.",
      });
    }
    console.error("Add Asset Error:", err);
    res.status(500).json({ error: "Failed to add asset", details: err.message });
  }
};

// UPDATE ASSET
exports.updateAsset = async (req, res) => {
  const { id } = req.params;
  const {
    asset_name,
    asset_tag,
    serial_number,
    category_id,
    brand,
    model,
    purchase_date,
    purchase_cost,
    vendor,
    warranty_expiry,
    status,
    location,
    description,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid asset id" });
  }
  if (status !== undefined && !validateStatus(status)) {
    return res.status(400).json({ error: "Invalid asset status" });
  }
  if (category_id !== undefined && !toObjectIdOrNull(category_id)) {
    return res.status(400).json({ error: "category_id is required and must be valid" });
  }
  if (asset_name !== undefined && !String(asset_name).trim()) {
    return res.status(400).json({ error: "asset_name cannot be empty" });
  }
  if (asset_tag !== undefined && !String(asset_tag).trim()) {
    return res.status(400).json({ error: "asset_tag cannot be empty" });
  }

  try {
    const result = await Asset.findByIdAndUpdate(id, {
      asset_name: emptyToNull(asset_name),
      asset_tag: emptyToNull(asset_tag),
      serial_number: emptyToNull(serial_number),
      category_id: toObjectIdOrNull(category_id),
      brand: emptyToNull(brand),
      model: emptyToNull(model),
      purchase_date: toDateOrNull(purchase_date),
      purchase_cost: toFloatOrNull(purchase_cost),
      vendor: emptyToNull(vendor),
      warranty_expiry: toDateOrNull(warranty_expiry),
      status: validateStatus(status) || "available",
      location: emptyToNull(location),
      description: emptyToNull(description),
    });

    if (!result) {
      return res.status(404).json({ error: "Asset not found" });
    }
    res.json({ message: "Asset updated successfully" });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: "Asset tag or serial number already exists",
        details: "Please use unique asset tag and serial number values.",
      });
    }
    console.error("Update Asset Error:", err);
    res.status(500).json({ error: "Failed to update asset", details: err.message });
  }
};

// DELETE ASSET (cascades to assignments and maintenance requests)
exports.deleteAsset = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid asset id" });
  }

  try {
    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    await AssetAssignment.deleteMany({ asset_id: id });
    await MaintenanceRequest.deleteMany({ asset_id: id });
    await Asset.findByIdAndDelete(id);

    res.json({ message: "Asset deleted successfully" });
  } catch (err) {
    console.error("Delete Asset Error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
};
