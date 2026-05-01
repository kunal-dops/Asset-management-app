const express = require("express");
const router = express.Router();
const db = require("../config/db");
const requireRole = require("../middleware/roleMiddleware");

// GET all assignments
router.get("/", (req, res) => {
  const sql = `
    SELECT aa.*, a.asset_name, a.asset_tag, u.full_name
    FROM asset_assignments aa
    JOIN assets a ON aa.asset_id = a.asset_id
    JOIN users u ON aa.user_id = u.user_id
    ORDER BY aa.assignment_id DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("GET ASSIGNMENTS ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

// ADD new assignment
router.post("/", requireRole("admin", "technician"), (req, res) => {
  const { asset_id, user_id, assigned_date, expected_return_date, remarks } = req.body;

  if (!asset_id || !user_id || !assigned_date) {
    return res.status(400).json({ error: "asset_id, user_id and assigned_date are required" });
  }

  const insertSql = `
    INSERT INTO asset_assignments 
    (asset_id, user_id, assigned_date, expected_return_date, remarks)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    insertSql,
    [asset_id, user_id, assigned_date, expected_return_date || null, remarks || null],
    (err, result) => {
      if (err) {
        console.error("ADD ASSIGNMENT ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      const updateAssetSql = `
        UPDATE assets SET status = 'assigned' WHERE asset_id = ?
      `;

      db.query(updateAssetSql, [asset_id], (updateErr) => {
        if (updateErr) {
          console.error("UPDATE ASSET STATUS ERROR:", updateErr);
          return res.status(500).json({ error: updateErr.message });
        }

        res.json({ message: "Asset assigned successfully", result });
      });
    }
  );
});

// RETURN asset
router.put("/return/:id", requireRole("admin", "technician"), (req, res) => {
  const { id } = req.params;
  const { actual_return_date } = req.body;

  const getAssignmentSql = `
    SELECT asset_id FROM asset_assignments WHERE assignment_id = ?
  `;

  db.query(getAssignmentSql, [id], (err, rows) => {
    if (err) {
      console.error("GET ASSIGNMENT ERROR:", err);
      return res.status(500).json({ error: err.message });
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const assetId = rows[0].asset_id;

    const updateAssignmentSql = `
      UPDATE asset_assignments
      SET actual_return_date = ?, assignment_status = 'returned'
      WHERE assignment_id = ?
    `;

    db.query(updateAssignmentSql, [actual_return_date, id], (updateErr, result) => {
      if (updateErr) {
        console.error("RETURN ASSIGNMENT ERROR:", updateErr);
        return res.status(500).json({ error: updateErr.message });
      }

      const updateAssetSql = `
        UPDATE assets SET status = 'available' WHERE asset_id = ?
      `;

      db.query(updateAssetSql, [assetId], (assetErr) => {
        if (assetErr) {
          console.error("UPDATE ASSET RETURN STATUS ERROR:", assetErr);
          return res.status(500).json({ error: assetErr.message });
        }

        res.json({ message: "Asset returned successfully", result });
      });
    });
  });
});

module.exports = router;
