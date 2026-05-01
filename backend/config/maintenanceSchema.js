const db = require("./db");

const requiredColumns = [
  { name: "priority", sql: "ALTER TABLE maintenance_requests ADD COLUMN priority ENUM('normal','urgent') DEFAULT 'normal'" },
  { name: "request_type", sql: "ALTER TABLE maintenance_requests ADD COLUMN request_type VARCHAR(100) NULL" },
  { name: "location", sql: "ALTER TABLE maintenance_requests ADD COLUMN location VARCHAR(150) NULL" },
  { name: "sublocation", sql: "ALTER TABLE maintenance_requests ADD COLUMN sublocation VARCHAR(150) NULL" },
  { name: "department", sql: "ALTER TABLE maintenance_requests ADD COLUMN department VARCHAR(150) NULL" },
  { name: "assigned_by", sql: "ALTER TABLE maintenance_requests ADD COLUMN assigned_by INT NULL" },
  { name: "checked_by", sql: "ALTER TABLE maintenance_requests ADD COLUMN checked_by INT NULL" },
  { name: "last_edited_by", sql: "ALTER TABLE maintenance_requests ADD COLUMN last_edited_by INT NULL" },
];

let readyPromise;

async function ensureMaintenanceSchema() {
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    const promisePool = db.promise();

    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'maintenance_requests'
    `);

    const existingColumns = new Set(columns.map((column) => column.COLUMN_NAME));
    for (const column of requiredColumns) {
      if (!existingColumns.has(column.name)) {
        await promisePool.query(column.sql);
      }
    }

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS maintenance_request_audit (
        audit_id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        action VARCHAR(40) NOT NULL,
        edited_by INT NULL,
        edited_role VARCHAR(40) NULL,
        changes_json TEXT NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_maintenance_audit_request (request_id),
        INDEX idx_maintenance_audit_user (edited_by)
      )
    `);
  })().catch((err) => {
    readyPromise = null;
    throw err;
  });

  return readyPromise;
}

module.exports = ensureMaintenanceSchema;
