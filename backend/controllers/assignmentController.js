const db = require("../config/db");

// Get assignments
exports.getAssignments = (req, res) => {
  const sql = `
    SELECT aa.*, a.asset_name, a.asset_tag, u.full_name
    FROM asset_assignments aa
    JOIN assets a ON aa.asset_id = a.asset_id
    JOIN users u ON aa.user_id = u.user_id
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

// Assign asset
exports.assignAsset = (req, res) => {
  const { asset_id, user_id, assigned_date, expected_return_date, remarks } = req.body;

  const sql = `
    INSERT INTO asset_assignments
    (asset_id, user_id, assigned_date, expected_return_date, remarks)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [asset_id, user_id, assigned_date, expected_return_date, remarks], (err, result) => {
    if (err) return res.status(500).json(err);

    db.query(
      "UPDATE assets SET status='assigned' WHERE asset_id=?",
      [asset_id],
      (updateErr) => {
        if (updateErr) return res.status(500).json(updateErr);
        res.json({ message: "Asset assigned successfully" });
      }
    );
  });
};

// Return asset
exports.returnAsset = (req, res) => {
  const { id } = req.params;
  const { actual_return_date } = req.body;

  const getAssetSql = "SELECT asset_id FROM asset_assignments WHERE assignment_id = ?";

  db.query(getAssetSql, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.status(404).json({ message: "Assignment not found" });

    const asset_id = result[0].asset_id;

    const sql = `
      UPDATE asset_assignments
      SET actual_return_date=?, assignment_status='returned'
      WHERE assignment_id=?
    `;

    db.query(sql, [actual_return_date, id], (err2, result2) => {
      if (err2) return res.status(500).json(err2);

      db.query(
        "UPDATE assets SET status='available' WHERE asset_id=?",
        [asset_id],
        (updateErr) => {
          if (updateErr) return res.status(500).json(updateErr);
          res.json({ message: "Asset returned successfully" });
        }
      );
    });
  });
};