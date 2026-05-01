const db = require("../config/db");

// Get maintenance requests
exports.getMaintenanceRequests = (req, res) => {
  const sql = `
    SELECT mr.*, a.asset_name, u.full_name AS reported_by_name
    FROM maintenance_requests mr
    JOIN assets a ON mr.asset_id = a.asset_id
    JOIN users u ON mr.reported_by = u.user_id
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

// Add maintenance request
exports.addMaintenanceRequest = (req, res) => {
  const { asset_id, reported_by, issue_description, request_date } = req.body;

  const sql = `
    INSERT INTO maintenance_requests
    (asset_id, reported_by, issue_description, request_date)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [asset_id, reported_by, issue_description, request_date], (err, result) => {
    if (err) return res.status(500).json(err);

    db.query(
      "UPDATE assets SET status='maintenance' WHERE asset_id=?",
      [asset_id],
      (updateErr) => {
        if (updateErr) return res.status(500).json(updateErr);
        res.json({ message: "Maintenance request created successfully" });
      }
    );
  });
};

// Update maintenance status
exports.updateMaintenanceStatus = (req, res) => {
  const { id } = req.params;
  const { status, technician_id, resolution_notes, resolved_date } = req.body;

  const sql = `
    UPDATE maintenance_requests
    SET status=?, technician_id=?, resolution_notes=?, resolved_date=?
    WHERE request_id=?
  `;

  db.query(sql, [status, technician_id, resolution_notes, resolved_date, id], (err, result) => {
    if (err) return res.status(500).json(err);

    if (status === "resolved") {
      db.query(
        `UPDATE assets 
         SET status='available' 
         WHERE asset_id = (SELECT asset_id FROM maintenance_requests WHERE request_id=?)`,
        [id],
        (updateErr) => {
          if (updateErr) return res.status(500).json(updateErr);
          res.json({ message: "Maintenance request updated successfully" });
        }
      );
    } else {
      res.json({ message: "Maintenance request updated successfully" });
    }
  });
};