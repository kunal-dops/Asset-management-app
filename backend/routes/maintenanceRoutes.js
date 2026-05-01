const express = require("express");
const router = express.Router();
const db = require("../config/db");
const ensureMaintenanceSchema = require("../config/maintenanceSchema");
const requireRole = require("../middleware/roleMiddleware");

const VALID_STATUSES = new Set(["pending", "in_progress", "resolved"]);
const VALID_PRIORITIES = new Set(["normal", "urgent"]);

const editableFields = [
  "asset_id",
  "reported_by",
  "issue_description",
  "request_date",
  "priority",
  "request_type",
  "location",
  "sublocation",
  "department",
  "technician_id",
  "status",
  "resolution_notes",
  "resolved_date",
  "checked_by",
];

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)));
  });

const getActor = (req) => ({
  userId: req.user?.user_id || req.body.edited_by || null,
  role: req.user?.role || null,
});

const canManageMaintenance = (req) => ["admin", "technician"].includes(req.user?.role);

const normalizeEmpty = (value) => (value === "" || value === undefined ? null : value);

const getRequestById = async (id) => {
  const rows = await run("SELECT * FROM maintenance_requests WHERE request_id = ?", [id]);
  return rows[0] || null;
};

const writeAudit = async ({ requestId, action, actor, changes = {}, notes = null }) => {
  await ensureMaintenanceSchema();
  await run(
    `
      INSERT INTO maintenance_request_audit
      (request_id, action, edited_by, edited_role, changes_json, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      requestId,
      action,
      actor?.userId || null,
      actor?.role || null,
      JSON.stringify(changes),
      notes,
    ]
  );
};

const buildChanges = (before, after) => {
  const changes = {};
  editableFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(after, field)) {
      const oldValue = before ? normalizeEmpty(before[field]) : null;
      const newValue = normalizeEmpty(after[field]);
      if (String(oldValue ?? "") !== String(newValue ?? "")) {
        changes[field] = { from: oldValue, to: newValue };
      }
    }
  });
  return changes;
};

router.use(async (req, res, next) => {
  try {
    await ensureMaintenanceSchema();
    next();
  } catch (err) {
    console.error("MAINTENANCE SCHEMA ERROR:", err);
    res.status(500).json({ error: "Maintenance schema initialization failed" });
  }
});

// GET all maintenance requests
router.get("/", (req, res) => {
  const onlyOwnRequests = req.user?.role === "user";
  const sql = `
    SELECT mr.*,
           a.asset_name,
           a.asset_tag,
           a.status AS asset_status,
           u.full_name AS reported_by_name,
           t.full_name AS technician_name,
           ab.full_name AS assigned_by_name,
           cb.full_name AS checked_by_name,
           eb.full_name AS last_edited_by_name
    FROM maintenance_requests mr
    JOIN assets a ON mr.asset_id = a.asset_id
    JOIN users u ON mr.reported_by = u.user_id
    LEFT JOIN users t ON mr.technician_id = t.user_id
    LEFT JOIN users ab ON mr.assigned_by = ab.user_id
    LEFT JOIN users cb ON mr.checked_by = cb.user_id
    LEFT JOIN users eb ON mr.last_edited_by = eb.user_id
    ${onlyOwnRequests ? "WHERE mr.reported_by = ?" : ""}
    ORDER BY mr.request_id DESC
  `;

  db.query(sql, onlyOwnRequests ? [req.user.user_id] : [], (err, result) => {
    if (err) {
      console.error("GET MAINTENANCE ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

// GET audit history for one request
router.get("/:id/audit", requireRole("admin", "technician"), (req, res) => {
  const sql = `
    SELECT a.*, u.full_name AS edited_by_name
    FROM maintenance_request_audit a
    LEFT JOIN users u ON a.edited_by = u.user_id
    WHERE a.request_id = ?
    ORDER BY a.audit_id DESC
  `;

  db.query(sql, [req.params.id], (err, result) => {
    if (err) {
      console.error("GET MAINTENANCE AUDIT ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

// ADD maintenance request
router.post("/", requireRole("admin", "technician", "user"), async (req, res) => {
  const actor = getActor(req);
  let {
    asset_id,
    reported_by,
    issue_description,
    request_date,
    priority = "normal",
    request_type,
    location,
    sublocation,
    department,
  } = req.body;

  if (actor.role === "user") {
    reported_by = actor.userId;
  }

  if (!asset_id || !reported_by || !issue_description || !request_date) {
    return res.status(400).json({ error: "Asset, reported by, description and request date are required" });
  }
  if (!VALID_PRIORITIES.has(priority)) {
    return res.status(400).json({ error: "Invalid priority" });
  }

  try {
    const result = await run(
      `
        INSERT INTO maintenance_requests
        (asset_id, reported_by, issue_description, request_date, priority, request_type, location, sublocation, department, last_edited_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        asset_id,
        reported_by,
        issue_description,
        request_date,
        priority,
        normalizeEmpty(request_type),
        normalizeEmpty(location),
        normalizeEmpty(sublocation),
        normalizeEmpty(department),
        actor.userId,
      ]
    );

    await run("UPDATE assets SET status = 'maintenance' WHERE asset_id = ?", [asset_id]);
    await writeAudit({
      requestId: result.insertId,
      action: "created",
      actor,
      changes: {
        asset_id: { from: null, to: asset_id },
        reported_by: { from: null, to: reported_by },
        issue_description: { from: null, to: issue_description },
        request_date: { from: null, to: request_date },
        priority: { from: null, to: priority },
        request_type: { from: null, to: normalizeEmpty(request_type) },
        location: { from: null, to: normalizeEmpty(location) },
        sublocation: { from: null, to: normalizeEmpty(sublocation) },
        department: { from: null, to: normalizeEmpty(department) },
      },
      notes: "Service request created by user",
    });

    res.status(201).json({ message: "Maintenance request created successfully", result });
  } catch (err) {
    console.error("ADD MAINTENANCE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ASSIGN request to a technician
router.put("/:id/assign", requireRole("admin", "technician"), async (req, res) => {
  const actor = getActor(req);
  const { id } = req.params;
  const { technician_id } = req.body;

  if (!technician_id) {
    return res.status(400).json({ error: "technician_id is required" });
  }

  try {
    const before = await getRequestById(id);
    if (!before) return res.status(404).json({ error: "Maintenance request not found" });

    const update = {
      technician_id,
      assigned_by: actor.userId,
      status: before.status === "resolved" ? "resolved" : "in_progress",
      last_edited_by: actor.userId,
    };

    await run(
      `
        UPDATE maintenance_requests
        SET technician_id = ?, assigned_by = ?, status = ?, last_edited_by = ?
        WHERE request_id = ?
      `,
      [update.technician_id, update.assigned_by, update.status, update.last_edited_by, id]
    );

    await writeAudit({
      requestId: id,
      action: "assigned",
      actor,
      changes: buildChanges(before, update),
      notes: "Work assigned to technician",
    });

    res.json({ message: "Request assigned successfully" });
  } catch (err) {
    console.error("ASSIGN MAINTENANCE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE / EDIT maintenance request
router.put("/:id", requireRole("admin", "technician"), async (req, res) => {
  const actor = getActor(req);
  const { id } = req.params;
  const before = await getRequestById(id).catch((err) => {
    console.error("GET MAINTENANCE REQUEST ERROR:", err);
    return null;
  });

  if (!before) {
    return res.status(404).json({ error: "Maintenance request not found" });
  }

  const nextValues = {
    asset_id: req.body.asset_id ?? before.asset_id,
    reported_by: req.body.reported_by ?? before.reported_by,
    issue_description: req.body.issue_description ?? before.issue_description,
    request_date: req.body.request_date ?? before.request_date,
    priority: req.body.priority ?? before.priority ?? "normal",
    request_type: normalizeEmpty(req.body.request_type ?? before.request_type),
    location: normalizeEmpty(req.body.location ?? before.location),
    sublocation: normalizeEmpty(req.body.sublocation ?? before.sublocation),
    department: normalizeEmpty(req.body.department ?? before.department),
    status: req.body.status ?? before.status ?? "pending",
    technician_id: normalizeEmpty(req.body.technician_id ?? before.technician_id),
    resolution_notes: normalizeEmpty(req.body.resolution_notes ?? before.resolution_notes),
    resolved_date: normalizeEmpty(req.body.resolved_date ?? before.resolved_date),
    checked_by: normalizeEmpty(req.body.checked_by ?? before.checked_by),
    last_edited_by: actor.userId,
  };

  if (!VALID_PRIORITIES.has(nextValues.priority)) {
    return res.status(400).json({ error: "Invalid priority" });
  }
  if (!VALID_STATUSES.has(nextValues.status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  if (nextValues.status === "resolved" && !nextValues.resolved_date) {
    nextValues.resolved_date = new Date().toISOString().split("T")[0];
  }

  try {
    await run(
      `
        UPDATE maintenance_requests
        SET asset_id = ?,
            reported_by = ?,
            issue_description = ?,
            request_date = ?,
            priority = ?,
            request_type = ?,
            location = ?,
            sublocation = ?,
            department = ?,
            status = ?,
            technician_id = ?,
            resolution_notes = ?,
            resolved_date = ?,
            checked_by = ?,
            last_edited_by = ?
        WHERE request_id = ?
      `,
      [
        nextValues.asset_id,
        nextValues.reported_by,
        nextValues.issue_description,
        nextValues.request_date,
        nextValues.priority,
        nextValues.request_type,
        nextValues.location,
        nextValues.sublocation,
        nextValues.department,
        nextValues.status,
        nextValues.technician_id,
        nextValues.resolution_notes,
        nextValues.resolved_date,
        nextValues.checked_by,
        nextValues.last_edited_by,
        id,
      ]
    );

    await run("UPDATE assets SET status = ? WHERE asset_id = ?", [
      nextValues.status === "resolved" ? "available" : "maintenance",
      nextValues.asset_id,
    ]);

    const changes = buildChanges(before, nextValues);
    const action = nextValues.status === "resolved" && before.status !== "resolved" ? "resolved" : "updated";
    await writeAudit({
      requestId: id,
      action,
      actor,
      changes,
      notes: req.body.audit_note || "Service request edited",
    });

    res.json({ message: action === "resolved" ? "Maintenance request resolved successfully" : "Maintenance request updated successfully" });
  } catch (err) {
    console.error("UPDATE MAINTENANCE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
