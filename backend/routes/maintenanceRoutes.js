const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const MaintenanceRequest = require("../models/MaintenanceRequest");
const MaintenanceAudit = require("../models/MaintenanceAudit");
const Asset = require("../models/Asset");
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

const getActor = (req) => ({
  userId: req.user?.user_id || req.body.edited_by || null,
  role: req.user?.role || null,
});

const normalizeEmpty = (value) => (value === "" || value === undefined ? null : value);

const getRequestById = async (id) => {
  return await MaintenanceRequest.findById(id).lean();
};

const writeAudit = async ({ requestId, action, actor, changes = {}, notes = null }) => {
  await MaintenanceAudit.create({
    request_id: requestId,
    action,
    edited_by: actor?.userId && actor.userId !== 0 ? actor.userId : null,
    edited_role: actor?.role || null,
    changes_json: JSON.stringify(changes),
    notes,
  });
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
router.get("/", async (req, res) => {
  try {
    const onlyOwnRequests = req.user?.role === "user";
    const filter = onlyOwnRequests ? { reported_by: req.user.user_id } : {};

    const requests = await MaintenanceRequest.find(filter)
      .populate("asset_id", "asset_name asset_tag status")
      .populate("reported_by", "full_name")
      .populate("technician_id", "full_name")
      .populate("assigned_by", "full_name")
      .populate("checked_by", "full_name")
      .populate("last_edited_by", "full_name")
      .sort({ _id: -1 })
      .lean();

    res.json(
      requests.map(({ _id, asset_id, reported_by, technician_id, assigned_by, checked_by, last_edited_by, ...r }) => ({
        request_id: _id,
        asset_id: asset_id?._id || null,
        asset_name: asset_id?.asset_name || null,
        asset_tag: asset_id?.asset_tag || null,
        asset_status: asset_id?.status || null,
        reported_by: reported_by?._id || null,
        reported_by_name: reported_by?.full_name || null,
        technician_id: technician_id?._id || null,
        technician_name: technician_id?.full_name || null,
        assigned_by: assigned_by?._id || null,
        assigned_by_name: assigned_by?.full_name || null,
        checked_by: checked_by?._id || null,
        checked_by_name: checked_by?.full_name || null,
        last_edited_by: last_edited_by?._id || null,
        last_edited_by_name: last_edited_by?.full_name || null,
        ...r,
      }))
    );
  } catch (err) {
    console.error("GET MAINTENANCE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET audit history for one request
router.get("/:id/audit", requireRole("admin", "technician"), async (req, res) => {
  try {
    const audits = await MaintenanceAudit.find({ request_id: req.params.id })
      .populate("edited_by", "full_name")
      .sort({ _id: -1 })
      .lean();

    res.json(
      audits.map(({ _id, edited_by, ...a }) => ({
        audit_id: _id,
        edited_by: edited_by?._id || null,
        edited_by_name: edited_by?.full_name || null,
        ...a,
      }))
    );
  } catch (err) {
    console.error("GET MAINTENANCE AUDIT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
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
    sr_number,
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
    const newRequest = await MaintenanceRequest.create({
      asset_id,
      reported_by,
      issue_description,
      request_date,
      priority,
      request_type: normalizeEmpty(request_type),
      location: normalizeEmpty(location),
      sublocation: normalizeEmpty(sublocation),
      department: normalizeEmpty(department),
      sr_number: normalizeEmpty(sr_number),
      last_edited_by: actor.userId && actor.userId !== 0 ? actor.userId : null,
    });

    await Asset.findByIdAndUpdate(asset_id, { status: "maintenance" });

    await writeAudit({
      requestId: newRequest._id,
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

    res.status(201).json({ message: "Maintenance request created successfully", request_id: newRequest._id });
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
      assigned_by: actor.userId && actor.userId !== 0 ? actor.userId : null,
      status: before.status === "resolved" ? "resolved" : "in_progress",
      last_edited_by: actor.userId && actor.userId !== 0 ? actor.userId : null,
    };

    await MaintenanceRequest.findByIdAndUpdate(id, update);

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
    last_edited_by: actor.userId && actor.userId !== 0 ? actor.userId : null,
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
    await MaintenanceRequest.findByIdAndUpdate(id, nextValues);

    await Asset.findByIdAndUpdate(nextValues.asset_id, {
      status: nextValues.status === "resolved" ? "available" : "maintenance",
    });

    const changes = buildChanges(before, nextValues);
    const action =
      nextValues.status === "resolved" && before.status !== "resolved" ? "resolved" : "updated";

    await writeAudit({
      requestId: id,
      action,
      actor,
      changes,
      notes: req.body.audit_note || "Service request edited",
    });

    res.json({
      message:
        action === "resolved"
          ? "Maintenance request resolved successfully"
          : "Maintenance request updated successfully",
    });
  } catch (err) {
    console.error("UPDATE MAINTENANCE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
