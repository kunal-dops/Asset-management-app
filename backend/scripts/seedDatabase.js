require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Category = require("../models/Category");
const Asset = require("../models/Asset");
const AssetAssignment = require("../models/AssetAssignment");
const MaintenanceRequest = require("../models/MaintenanceRequest");
const MaintenanceAudit = require("../models/MaintenanceAudit");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/it_asset_management";

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // Clear all collections
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Asset.deleteMany({}),
    AssetAssignment.deleteMany({}),
    MaintenanceRequest.deleteMany({}),
    MaintenanceAudit.deleteMany({}),
  ]);
  console.log("Cleared existing data");

  // ── USERS ──────────────────────────────────────────────────────────────────
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  const users = await User.insertMany([
    { full_name: "Ravi Sharma",    email: "ravi.sharma@amrita.edu",    password: hash("Ravi@1234"),    role: "admin",      department: "IT",          phone: "9876543210" },
    { full_name: "Priya Nair",     email: "priya.nair@amrita.edu",     password: hash("Priya@1234"),   role: "technician", department: "IT Support",   phone: "9876543211" },
    { full_name: "Arjun Menon",    email: "arjun.menon@amrita.edu",    password: hash("Arjun@1234"),   role: "technician", department: "IT Support",   phone: "9876543212" },
    { full_name: "Sneha Pillai",   email: "sneha.pillai@amrita.edu",   password: hash("Sneha@1234"),   role: "user",       department: "Finance",      phone: "9876543213" },
    { full_name: "Kiran Das",      email: "kiran.das@amrita.edu",      password: hash("Kiran@1234"),   role: "user",       department: "HR",           phone: "9876543214" },
    { full_name: "Meena Iyer",     email: "meena.iyer@amrita.edu",     password: hash("Meena@1234"),   role: "user",       department: "Operations",   phone: "9876543215" },
    { full_name: "Rahul Gupta",    email: "rahul.gupta@amrita.edu",    password: hash("Rahul@1234"),   role: "user",       department: "Marketing",    phone: "9876543216" },
    { full_name: "Divya Krishnan", email: "divya.krishnan@amrita.edu", password: hash("Divya@1234"),   role: "user",       department: "Procurement",  phone: "9876543217" },
  ]);
  console.log(`Inserted ${users.length} users`);

  const [admin, tech1, tech2, user1, user2, user3, user4, user5] = users;

  // ── CATEGORIES ─────────────────────────────────────────────────────────────
  const categories = await Category.insertMany([
    { category_name: "Laptop",               description: "Portable computers and notebooks" },
    { category_name: "Desktop",              description: "Stationary desktop computers" },
    { category_name: "Monitor",              description: "Display screens and monitors" },
    { category_name: "Printer",              description: "Laser and inkjet printers" },
    { category_name: "Networking Equipment", description: "Routers, switches, and access points" },
    { category_name: "Mobile Device",        description: "Smartphones and tablets" },
    { category_name: "Server",               description: "On-premise servers and rack units" },
    { category_name: "Peripherals",          description: "Keyboards, mice, and accessories" },
  ]);
  console.log(`Inserted ${categories.length} categories`);

  const [catLaptop, catDesktop, catMonitor, catPrinter, catNetwork, catMobile, catServer, catPeripheral] = categories;

  // ── ASSETS ─────────────────────────────────────────────────────────────────
  const assets = await Asset.insertMany([
    {
      asset_name: "Dell Latitude 5540",  asset_tag: "asset_01", serial_number: "DL5540-SN001",
      category_id: catLaptop._id,  brand: "Dell",    model: "Latitude 5540",
      purchase_date: new Date("2023-06-15"), purchase_cost: 72000, vendor: "Dell India Pvt Ltd",
      warranty_expiry: new Date("2026-06-15"), status: "assigned", location: "Block A - Floor 2", description: "Core i7 16GB RAM 512GB SSD",
    },
    {
      asset_name: "HP EliteBook 840",    asset_tag: "asset_02", serial_number: "HP840-SN002",
      category_id: catLaptop._id,  brand: "HP",      model: "EliteBook 840 G9",
      purchase_date: new Date("2023-08-10"), purchase_cost: 85000, vendor: "HP India",
      warranty_expiry: new Date("2026-08-10"), status: "assigned", location: "Block B - Floor 1", description: "Core i5 8GB RAM 256GB SSD",
    },
    {
      asset_name: "Lenovo ThinkPad E14", asset_tag: "asset_03", serial_number: "LNVE14-SN003",
      category_id: catLaptop._id,  brand: "Lenovo",  model: "ThinkPad E14 Gen 4",
      purchase_date: new Date("2024-01-20"), purchase_cost: 68000, vendor: "Lenovo Authorised Dealer",
      warranty_expiry: new Date("2027-01-20"), status: "available", location: "IT Storeroom", description: "Ryzen 5 8GB RAM 512GB SSD",
    },
    {
      asset_name: "HP ProDesk 400 G9",   asset_tag: "asset_04", serial_number: "HPD400-SN004",
      category_id: catDesktop._id, brand: "HP",      model: "ProDesk 400 G9",
      purchase_date: new Date("2022-11-05"), purchase_cost: 45000, vendor: "HP India",
      warranty_expiry: new Date("2025-11-05"), status: "assigned", location: "Finance Dept", description: "Core i5 8GB RAM 1TB HDD",
    },
    {
      asset_name: "Dell OptiPlex 7010",  asset_tag: "asset_05", serial_number: "DLOP7010-SN005",
      category_id: catDesktop._id, brand: "Dell",    model: "OptiPlex 7010",
      purchase_date: new Date("2022-03-18"), purchase_cost: 52000, vendor: "Dell India Pvt Ltd",
      warranty_expiry: new Date("2025-03-18"), status: "maintenance", location: "HR Dept", description: "Core i7 16GB RAM 512GB SSD",
    },
    {
      asset_name: "LG 24\" FHD Monitor", asset_tag: "asset_06", serial_number: "LG24-SN006",
      category_id: catMonitor._id, brand: "LG",      model: "24MK430H",
      purchase_date: new Date("2023-02-14"), purchase_cost: 14000, vendor: "LG Electronics",
      warranty_expiry: new Date("2026-02-14"), status: "assigned", location: "Block A - Floor 2", description: "24 inch Full HD IPS panel",
    },
    {
      asset_name: "Dell 27\" 4K Monitor", asset_tag: "asset_07", serial_number: "DL27-SN007",
      category_id: catMonitor._id, brand: "Dell",    model: "U2722D",
      purchase_date: new Date("2023-09-01"), purchase_cost: 38000, vendor: "Dell India Pvt Ltd",
      warranty_expiry: new Date("2026-09-01"), status: "available", location: "IT Storeroom", description: "27 inch 4K USB-C monitor",
    },
    {
      asset_name: "HP LaserJet Pro M404", asset_tag: "asset_08", serial_number: "HPM404-SN008",
      category_id: catPrinter._id, brand: "HP",      model: "LaserJet Pro M404dn",
      purchase_date: new Date("2022-07-22"), purchase_cost: 22000, vendor: "HP India",
      warranty_expiry: new Date("2024-07-22"), status: "assigned", location: "Finance Dept", description: "Monochrome laser printer duplex",
    },
    {
      asset_name: "Cisco Catalyst 2960",  asset_tag: "asset_09", serial_number: "CISCO2960-SN009",
      category_id: catNetwork._id, brand: "Cisco",   model: "Catalyst 2960-24TC-L",
      purchase_date: new Date("2021-05-10"), purchase_cost: 95000, vendor: "Cisco Systems India",
      warranty_expiry: new Date("2026-05-10"), status: "assigned", location: "Server Room", description: "24-port gigabit managed switch",
    },
    {
      asset_name: "TP-Link WiFi 6 Router", asset_tag: "asset_10", serial_number: "TPWIFI6-SN010",
      category_id: catNetwork._id, brand: "TP-Link", model: "Archer AX73",
      purchase_date: new Date("2023-04-05"), purchase_cost: 12000, vendor: "TP-Link India",
      warranty_expiry: new Date("2026-04-05"), status: "assigned", location: "Block B - Networking Rack", description: "WiFi 6 AX5400 dual-band router",
    },
    {
      asset_name: "Samsung Galaxy Tab S8", asset_tag: "asset_11", serial_number: "SAMS8-SN011",
      category_id: catMobile._id,  brand: "Samsung", model: "Galaxy Tab S8",
      purchase_date: new Date("2023-10-12"), purchase_cost: 58000, vendor: "Samsung India",
      warranty_expiry: new Date("2025-10-12"), status: "assigned", location: "Marketing Dept", description: "11 inch tablet 128GB WiFi+LTE",
    },
    {
      asset_name: "Dell PowerEdge R740",  asset_tag: "asset_12", serial_number: "DLPE740-SN012",
      category_id: catServer._id,  brand: "Dell",    model: "PowerEdge R740",
      purchase_date: new Date("2021-08-30"), purchase_cost: 350000, vendor: "Dell India Pvt Ltd",
      warranty_expiry: new Date("2026-08-30"), status: "assigned", location: "Server Room", description: "2U rack server Xeon 64GB RAM 4TB",
    },
    {
      asset_name: "Logitech MK540 Combo", asset_tag: "asset_13", serial_number: null,
      category_id: catPeripheral._id, brand: "Logitech", model: "MK540 Advanced",
      purchase_date: new Date("2024-02-01"), purchase_cost: 3500, vendor: "Logitech India",
      warranty_expiry: new Date("2026-02-01"), status: "available", location: "IT Storeroom", description: "Wireless keyboard and mouse combo",
    },
    {
      asset_name: "HP Laptop 15s",        asset_tag: "asset_14", serial_number: "HP15S-SN014",
      category_id: catLaptop._id,  brand: "HP",      model: "Laptop 15s-eq3",
      purchase_date: new Date("2024-03-10"), purchase_cost: 55000, vendor: "HP India",
      warranty_expiry: new Date("2027-03-10"), status: "retired", location: "IT Storeroom", description: "Ryzen 3 8GB 256GB — battery degraded",
    },
    {
      asset_name: "Canon PIXMA G3010",    asset_tag: "asset_15", serial_number: "CANG3010-SN015",
      category_id: catPrinter._id, brand: "Canon",   model: "PIXMA G3010",
      purchase_date: new Date("2023-01-18"), purchase_cost: 13500, vendor: "Canon India",
      warranty_expiry: new Date("2026-01-18"), status: "available", location: "Operations Dept", description: "Colour inkjet all-in-one printer",
    },
  ]);
  console.log(`Inserted ${assets.length} assets`);

  const [ast001, ast002, ast003, ast004, ast005, ast006, ast007, ast008, ast009, ast010, ast011, ast012, ast013, ast014, ast015] = assets;

  // ── ASSET ASSIGNMENTS ──────────────────────────────────────────────────────
  const assignments = await AssetAssignment.insertMany([
    {
      asset_id: ast001._id, user_id: user1._id,
      assigned_date: new Date("2023-07-01"), expected_return_date: new Date("2025-07-01"),
      assignment_status: "assigned", remarks: "Assigned for Finance operations",
    },
    {
      asset_id: ast002._id, user_id: user2._id,
      assigned_date: new Date("2023-09-01"), expected_return_date: new Date("2025-09-01"),
      assignment_status: "assigned", remarks: "Primary work laptop for HR",
    },
    {
      asset_id: ast004._id, user_id: user1._id,
      assigned_date: new Date("2022-12-01"), expected_return_date: null,
      assignment_status: "assigned", remarks: "Desktop for Finance department",
    },
    {
      asset_id: ast006._id, user_id: user1._id,
      assigned_date: new Date("2023-03-01"), expected_return_date: null,
      assignment_status: "assigned", remarks: "Secondary display for Finance",
    },
    {
      asset_id: ast008._id, user_id: user1._id,
      assigned_date: new Date("2022-08-01"), expected_return_date: null,
      assignment_status: "assigned", remarks: "Shared printer in Finance dept",
    },
    {
      asset_id: ast011._id, user_id: user4._id,
      assigned_date: new Date("2023-11-01"), expected_return_date: new Date("2025-11-01"),
      assignment_status: "assigned", remarks: "For client presentations",
    },
    {
      asset_id: ast003._id, user_id: user3._id,
      assigned_date: new Date("2024-02-01"), actual_return_date: new Date("2024-06-01"),
      expected_return_date: new Date("2024-06-01"), assignment_status: "returned",
      remarks: "Temporary assignment — returned",
    },
  ]);
  console.log(`Inserted ${assignments.length} assignments`);

  // ── MAINTENANCE REQUESTS ───────────────────────────────────────────────────
  const maintenance = await MaintenanceRequest.insertMany([
    {
      asset_id: ast005._id, reported_by: user2._id, issue_description: "Computer not booting. Stuck on BIOS screen after Windows update.",
      request_date: new Date("2026-06-01"), status: "in_progress", priority: "urgent",
      request_type: "Hardware", location: "Block A", sublocation: "Floor 1", department: "HR",
      technician_id: tech1._id, assigned_by: admin._id, last_edited_by: admin._id,
    },
    {
      asset_id: ast001._id, reported_by: user1._id, issue_description: "Laptop battery drains very fast. Full charge lasts less than 2 hours.",
      request_date: new Date("2026-06-10"), status: "pending", priority: "normal",
      request_type: "Hardware", location: "Block A", sublocation: "Floor 2", department: "Finance",
      last_edited_by: user1._id,
    },
    {
      asset_id: ast009._id, reported_by: tech2._id, issue_description: "Switch port 14-18 showing intermittent link drops causing network outages.",
      request_date: new Date("2026-05-20"), status: "resolved", priority: "urgent",
      request_type: "Networking", location: "Server Room", sublocation: null, department: "IT",
      technician_id: tech2._id, assigned_by: admin._id, checked_by: admin._id,
      resolution_notes: "Replaced SFP module on affected ports. Network stable for 72 hours post-fix.",
      resolved_date: new Date("2026-05-23"), last_edited_by: tech2._id,
    },
    {
      asset_id: ast008._id, reported_by: user1._id, issue_description: "Printer shows paper jam error even after clearing paper path.",
      request_date: new Date("2026-06-15"), status: "pending", priority: "normal",
      request_type: "Hardware", location: "Block B", sublocation: "Floor 1", department: "Finance",
      last_edited_by: user1._id,
    },
    {
      asset_id: ast002._id, reported_by: user2._id, issue_description: "Keyboard keys (F5, Backspace) not responding. Likely physical damage.",
      request_date: new Date("2026-06-12"), status: "in_progress", priority: "normal",
      request_type: "Hardware", location: "Block B", sublocation: "Floor 1", department: "HR",
      technician_id: tech1._id, assigned_by: admin._id, last_edited_by: tech1._id,
    },
  ]);
  console.log(`Inserted ${maintenance.length} maintenance requests`);

  const [mr1, mr2, mr3, mr4, mr5] = maintenance;

  // ── MAINTENANCE AUDIT ──────────────────────────────────────────────────────
  await MaintenanceAudit.insertMany([
    {
      request_id: mr1._id, action: "created", edited_by: user2._id, edited_role: "user",
      changes_json: JSON.stringify({ asset_id: { from: null, to: ast005._id }, issue_description: { from: null, to: mr1.issue_description }, priority: { from: null, to: "urgent" } }),
      notes: "Service request created by user",
    },
    {
      request_id: mr1._id, action: "assigned", edited_by: admin._id, edited_role: "admin",
      changes_json: JSON.stringify({ technician_id: { from: null, to: tech1._id }, status: { from: "pending", to: "in_progress" } }),
      notes: "Work assigned to technician",
    },
    {
      request_id: mr3._id, action: "created", edited_by: tech2._id, edited_role: "technician",
      changes_json: JSON.stringify({ asset_id: { from: null, to: ast009._id }, issue_description: { from: null, to: mr3.issue_description }, priority: { from: null, to: "urgent" } }),
      notes: "Service request created by user",
    },
    {
      request_id: mr3._id, action: "assigned", edited_by: admin._id, edited_role: "admin",
      changes_json: JSON.stringify({ technician_id: { from: null, to: tech2._id }, status: { from: "pending", to: "in_progress" } }),
      notes: "Work assigned to technician",
    },
    {
      request_id: mr3._id, action: "resolved", edited_by: tech2._id, edited_role: "technician",
      changes_json: JSON.stringify({ status: { from: "in_progress", to: "resolved" }, resolution_notes: { from: null, to: mr3.resolution_notes }, resolved_date: { from: null, to: "2026-05-23" } }),
      notes: "SFP module replaced. Issue resolved.",
    },
    {
      request_id: mr5._id, action: "created", edited_by: user2._id, edited_role: "user",
      changes_json: JSON.stringify({ asset_id: { from: null, to: ast002._id }, issue_description: { from: null, to: mr5.issue_description }, priority: { from: null, to: "normal" } }),
      notes: "Service request created by user",
    },
    {
      request_id: mr5._id, action: "assigned", edited_by: admin._id, edited_role: "admin",
      changes_json: JSON.stringify({ technician_id: { from: null, to: tech1._id }, status: { from: "pending", to: "in_progress" } }),
      notes: "Work assigned to technician",
    },
  ]);
  console.log("Inserted maintenance audit logs");

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  console.log("\n✓ Seed complete!");
  console.log("─────────────────────────────────────────");
  console.log("Login credentials:");
  console.log("  Admin (hardcoded): admin@example.com / Admin@123");
  console.log("  Admin (DB):        ravi.sharma@amrita.edu / Ravi@1234");
  console.log("  Technician:        priya.nair@amrita.edu / Priya@1234");
  console.log("  Technician:        arjun.menon@amrita.edu / Arjun@1234");
  console.log("  User:              sneha.pillai@amrita.edu / Sneha@1234");
  console.log("  User:              kiran.das@amrita.edu / Kiran@1234");
  console.log("─────────────────────────────────────────");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
