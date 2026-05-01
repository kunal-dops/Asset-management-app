const db = require("../config/db");
const VALID_ASSET_STATUSES = new Set(["available", "assigned", "maintenance", "retired"]);

function emptyToNull(v) {
  return v === "" || v === undefined ? null : v;
}

function toIntOrNull(v) {
  const val = emptyToNull(v);
  if (val === null) return null;
  const n = Number.parseInt(String(val), 10);
  return Number.isFinite(n) ? n : null;
}

function toFloatOrNull(v) {
  const val = emptyToNull(v);
  if (val === null) return null;
  const n = Number.parseFloat(String(val));
  return Number.isFinite(n) ? n : null;
}

function toDateOrNull(v) {
  const val = emptyToNull(v);
  // react date input sends YYYY-MM-DD; MySQL accepts that or NULL
  return val === null ? null : val;
}

function validateStatus(status) {
  const normalized = emptyToNull(status);
  if (normalized === null) return "available";
  return VALID_ASSET_STATUSES.has(normalized) ? normalized : null;
}

function parseAssetId(rawId) {
  const id = Number.parseInt(String(rawId), 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

// ===============================
// GET ALL ASSETS
// ===============================
exports.getAssets = (req, res) => {
  const sql = `
    SELECT a.*, c.category_name
    FROM assets a
    LEFT JOIN categories c ON a.category_id = c.category_id
    ORDER BY a.asset_id DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Get Assets Error:", err);
      return res.status(500).json({ error: "Failed to fetch assets" });
    }
    res.json(result);
  });
};

// ===============================
// ADD NEW ASSET
// ===============================
exports.addAsset = (req, res) => {
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
    description
  } = req.body;

  if (!asset_name || !String(asset_name).trim()) {
    return res.status(400).json({ error: "asset_name is required" });
  }
  if (!asset_tag || !String(asset_tag).trim()) {
    return res.status(400).json({ error: "asset_tag is required" });
  }

  const normalizedCategoryId = toIntOrNull(category_id);
  if (!normalizedCategoryId) {
    return res.status(400).json({ error: "category_id is required" });
  }
  const normalizedStatus = validateStatus(status);
  if (!normalizedStatus) {
    return res.status(400).json({ error: "Invalid asset status" });
  }

  const sql = `
    INSERT INTO assets 
    (asset_name, asset_tag, serial_number, category_id, brand, model, purchase_date, purchase_cost, vendor, warranty_expiry, status, location, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      String(asset_name).trim(),
      String(asset_tag).trim(),
      emptyToNull(serial_number),
      normalizedCategoryId,
      emptyToNull(brand),
      emptyToNull(model),
      toDateOrNull(purchase_date),
      toFloatOrNull(purchase_cost),
      emptyToNull(vendor),
      toDateOrNull(warranty_expiry),
      normalizedStatus,
      emptyToNull(location),
      emptyToNull(description)
    ],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({
            error: "Asset tag or serial number already exists",
            details: "Please use unique asset tag and serial number values.",
          });
        }
        console.error("Add Asset Error:", err);
        return res.status(500).json({
          error: "Failed to add asset",
          details: err.sqlMessage || err.message,
        });
      }
      res.status(201).json({ message: "Asset added successfully" });
    }
  );
};

// ===============================
// UPDATE ASSET
// ===============================
exports.updateAsset = (req, res) => {
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
    description
  } = req.body;

  const normalizedCategoryId = toIntOrNull(category_id);
  const normalizedAssetId = parseAssetId(id);
  const normalizedStatus = validateStatus(status);

  if (!normalizedAssetId) {
    return res.status(400).json({ error: "Invalid asset id" });
  }
  if (status !== undefined && !normalizedStatus) {
    return res.status(400).json({ error: "Invalid asset status" });
  }
  if (category_id !== undefined && !normalizedCategoryId) {
    return res.status(400).json({ error: "category_id is required" });
  }
  if (asset_name !== undefined && !String(asset_name).trim()) {
    return res.status(400).json({ error: "asset_name cannot be empty" });
  }
  if (asset_tag !== undefined && !String(asset_tag).trim()) {
    return res.status(400).json({ error: "asset_tag cannot be empty" });
  }

  const sql = `
    UPDATE assets SET
      asset_name = ?,
      asset_tag = ?,
      serial_number = ?,
      category_id = ?,
      brand = ?,
      model = ?,
      purchase_date = ?,
      purchase_cost = ?,
      vendor = ?,
      warranty_expiry = ?,
      status = ?,
      location = ?,
      description = ?
    WHERE asset_id = ?
  `;

  db.query(
    sql,
    [
      emptyToNull(asset_name),
      emptyToNull(asset_tag),
      emptyToNull(serial_number),
      normalizedCategoryId,
      emptyToNull(brand),
      emptyToNull(model),
      toDateOrNull(purchase_date),
      toFloatOrNull(purchase_cost),
      emptyToNull(vendor),
      toDateOrNull(warranty_expiry),
      normalizedStatus || "available",
      emptyToNull(location),
      emptyToNull(description),
      normalizedAssetId
    ],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({
            error: "Asset tag or serial number already exists",
            details: "Please use unique asset tag and serial number values.",
          });
        }
        console.error("Update Asset Error:", err);
        return res.status(500).json({
          error: "Failed to update asset",
          details: err.sqlMessage || err.message,
        });
      }
      if (!result.affectedRows) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json({ message: "Asset updated successfully" });
    }
  );
};

// ===============================
// DELETE ASSET (SAFE DELETE)
// ===============================
exports.deleteAsset = (req, res) => {
  const assetId = parseAssetId(req.params.id);
  if (!assetId) {
    return res.status(400).json({ error: "Invalid asset id" });
  }

  db.getConnection((connectionErr, connection) => {
    if (connectionErr) {
      console.error("Delete Asset Connection Error:", connectionErr);
      return res.status(500).json({ error: "Delete failed" });
    }

    connection.beginTransaction((beginErr) => {
      if (beginErr) {
        connection.release();
        console.error("Delete Asset Transaction Start Error:", beginErr);
        return res.status(500).json({ error: "Delete failed" });
      }

      const rollbackWithError = (logLabel, err, responseError) => {
        connection.rollback(() => {
          connection.release();
          console.error(logLabel, err);
          res.status(500).json({ error: responseError });
        });
      };

      connection.query("DELETE FROM asset_assignments WHERE asset_id = ?", [assetId], (err1) => {
        if (err1) {
          return rollbackWithError("Delete Assignments Error:", err1, "Failed to delete related assignments");
        }

        connection.query("DELETE FROM maintenance_requests WHERE asset_id = ?", [assetId], (err2) => {
          if (err2) {
            return rollbackWithError("Delete Maintenance Error:", err2, "Failed to delete related maintenance requests");
          }

          connection.query("DELETE FROM assets WHERE asset_id = ?", [assetId], (err3, result) => {
            if (err3) {
              return rollbackWithError("Delete Asset Error:", err3, "Delete failed");
            }
            if (!result.affectedRows) {
              return connection.rollback(() => {
                connection.release();
                res.status(404).json({ error: "Asset not found" });
              });
            }

            connection.commit((commitErr) => {
              if (commitErr) {
                return rollbackWithError("Delete Asset Commit Error:", commitErr, "Delete failed");
              }
              connection.release();
              res.json({ message: "Asset deleted successfully" });
            });
          });
        });
      });
    });
  });
};