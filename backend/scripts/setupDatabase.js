const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const DB_NAME = process.env.DB_NAME || "it_asset_management_node";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin@12345";

if (!/^[a-zA-Z0-9_]+$/.test(DB_NAME)) {
  throw new Error("DB_NAME may only contain letters, numbers, and underscores.");
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE \`${DB_NAME}\``);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin','technician','user') NOT NULL DEFAULT 'user',
        department VARCHAR(150) NULL,
        phone VARCHAR(40) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS categories (
        category_id INT AUTO_INCREMENT PRIMARY KEY,
        category_name VARCHAR(120) NOT NULL UNIQUE,
        description TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS assets (
        asset_id INT AUTO_INCREMENT PRIMARY KEY,
        asset_name VARCHAR(150) NOT NULL,
        asset_tag VARCHAR(100) NOT NULL UNIQUE,
        serial_number VARCHAR(120) NULL UNIQUE,
        category_id INT NOT NULL,
        brand VARCHAR(120) NULL,
        model VARCHAR(120) NULL,
        purchase_date DATE NULL,
        purchase_cost DECIMAL(12,2) NULL,
        vendor VARCHAR(150) NULL,
        warranty_expiry DATE NULL,
        status ENUM('available','assigned','maintenance','retired') NOT NULL DEFAULT 'available',
        location VARCHAR(150) NULL,
        description TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_assets_category (category_id),
        INDEX idx_assets_status (status),
        CONSTRAINT fk_assets_category
          FOREIGN KEY (category_id) REFERENCES categories(category_id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS asset_assignments (
        assignment_id INT AUTO_INCREMENT PRIMARY KEY,
        asset_id INT NOT NULL,
        user_id INT NOT NULL,
        assigned_date DATE NOT NULL,
        expected_return_date DATE NULL,
        actual_return_date DATE NULL,
        assignment_status ENUM('assigned','returned') NOT NULL DEFAULT 'assigned',
        remarks TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_assignments_asset (asset_id),
        INDEX idx_assignments_user (user_id),
        CONSTRAINT fk_assignments_asset
          FOREIGN KEY (asset_id) REFERENCES assets(asset_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_assignments_user
          FOREIGN KEY (user_id) REFERENCES users(user_id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS maintenance_requests (
        request_id INT AUTO_INCREMENT PRIMARY KEY,
        asset_id INT NOT NULL,
        reported_by INT NOT NULL,
        issue_description TEXT NOT NULL,
        request_date DATE NOT NULL,
        status ENUM('pending','in_progress','resolved') NOT NULL DEFAULT 'pending',
        technician_id INT NULL,
        resolution_notes TEXT NULL,
        resolved_date DATE NULL,
        priority ENUM('normal','urgent') DEFAULT 'normal',
        request_type VARCHAR(100) NULL,
        location VARCHAR(150) NULL,
        sublocation VARCHAR(150) NULL,
        department VARCHAR(150) NULL,
        assigned_by INT NULL,
        checked_by INT NULL,
        last_edited_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_maintenance_asset (asset_id),
        INDEX idx_maintenance_reported_by (reported_by),
        INDEX idx_maintenance_technician (technician_id),
        INDEX idx_maintenance_status (status),
        CONSTRAINT fk_maintenance_asset
          FOREIGN KEY (asset_id) REFERENCES assets(asset_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_maintenance_reported_by
          FOREIGN KEY (reported_by) REFERENCES users(user_id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT fk_maintenance_technician
          FOREIGN KEY (technician_id) REFERENCES users(user_id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      )
    `);

    await connection.query(`
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
        INDEX idx_maintenance_audit_user (edited_by),
        CONSTRAINT fk_maintenance_audit_request
          FOREIGN KEY (request_id) REFERENCES maintenance_requests(request_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_maintenance_audit_user
          FOREIGN KEY (edited_by) REFERENCES users(user_id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      )
    `);

    await connection.query(
      `
        INSERT IGNORE INTO categories (category_name, description)
        VALUES
          ('Laptop', 'Portable computers and notebooks'),
          ('Desktop', 'Desktop workstations'),
          ('Monitor', 'Display screens'),
          ('Printer', 'Printing and scanning devices'),
          ('Network', 'Routers, switches, and access points')
      `
    );

    const [existingAdmins] = await connection.query("SELECT user_id FROM users WHERE email = ?", [
      ADMIN_EMAIL,
    ]);

    if (existingAdmins.length === 0) {
      const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
      await connection.query(
        `
          INSERT INTO users (full_name, email, password, role, department)
          VALUES (?, ?, ?, 'admin', ?)
        `,
        ["System Admin", ADMIN_EMAIL, passwordHash, "IT"]
      );
      console.log(`Seeded admin user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    } else {
      console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
    }

    console.log(`Database setup complete: ${DB_NAME}`);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error("Database setup failed:", err.message);
  process.exit(1);
});
