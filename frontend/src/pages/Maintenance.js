import React, { useEffect, useState, useRef, useCallback } from "react";
import PageHeader from "../components/PageHeader";
import API from "../api";
import {
  FaPlus, FaSync, FaBell, FaBellSlash, FaStop,
  FaCheckCircle, FaTools, FaTimes, FaSave,
  FaExclamationTriangle, FaFilter, FaUserCog,
  FaEdit, FaHistory, FaClipboardCheck, FaLock, FaShieldAlt
} from "react-icons/fa";

const STATUS_CONFIG = {
  pending:     { label: "Pending",     color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  in_progress: { label: "In Progress", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  resolved:    { label: "Completed",   color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
};

const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", color: "#dc2626", bg: "#fef2f2" },
  normal: { label: "Normal", color: "#64748b", bg: "#f8fafc" },
};

const REFRESH_INTERVALS = [15, 30, 60, 120];

const generateSRNumber = () => {
  const num = Math.floor(80000 + Math.random() * 9999);
  return `SR-${num}`;
};

const Maintenance = () => {
  const [requests, setRequests]   = useState([]);
  const [assets, setAssets]       = useState([]);
  const [users, setUsers]         = useState([]);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm]   = useState(false);
  const [soundAlerts, setSoundAlerts]   = useState(true);
  const [autoRefresh, setAutoRefresh]   = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [countdown, setCountdown] = useState(30);
  const [lastRefresh, setLastRefresh]   = useState(new Date());
  const [saving, setSaving]       = useState(false);
  const [flash, setFlash]         = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [technicianDrafts, setTechnicianDrafts] = useState({});
  const [editingRequest, setEditingRequest] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [auditRequest, setAuditRequest] = useState(null);
  const [auditRows, setAuditRows] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  const storedUser = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; }
  }, []);
  const canManageRequests = ["admin", "technician"].includes(storedUser.role);

  const [form, setForm] = useState({
    asset_id: "",
    reported_by: storedUser.user_id || "",
    issue_description: "",
    request_date: new Date().toISOString().split("T")[0],
    priority: "normal",
    request_type: "",
    location: "",
    sublocation: "",
    department: "",
    sr_number: generateSRNumber(),
  });

  const technicians = users.filter((u) => ["technician", "admin"].includes(u.role));
  const visibleUsers = canManageRequests ? users : users.filter((u) => u.user_id === storedUser.user_id);

  const fetchAll = useCallback(async () => {
    try {
      const [mRes, aRes, uRes] = await Promise.all([
        API.get("/maintenance"),
        API.get("/assets"),
        canManageRequests ? API.get("/users") : Promise.resolve({ data: [] }),
      ]);
      setRequests(mRes.data);
      setAssets(aRes.data);
      if (canManageRequests) setUsers(uRes.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, [canManageRequests]);

  // Auto refresh
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => {
        fetchAll();
        setCountdown(refreshInterval);
      }, refreshInterval * 1000);

      countdownRef.current = setInterval(() => {
        setCountdown(c => (c <= 1 ? refreshInterval : c - 1));
      }, 1000);
    }
    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
    };
  }, [autoRefresh, refreshInterval, fetchAll]);

  const handleRefreshNow = () => {
    fetchAll();
    setCountdown(refreshInterval);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/maintenance", {
        asset_id: form.asset_id,
        reported_by: canManageRequests ? form.reported_by : storedUser.user_id,
        issue_description: form.issue_description,
        request_date: form.request_date,
        priority: form.priority,
        request_type: form.request_type,
        location: form.location,
        sublocation: form.sublocation,
        department: form.department,
      });
      setFlash({ type: "success", text: `Service request ${form.sr_number} created successfully!` });
      setShowForm(false);
      setForm({
        asset_id: "", reported_by: storedUser.user_id || "",
        issue_description: "", request_date: new Date().toISOString().split("T")[0],
        priority: "normal", request_type: "", location: "",
        sublocation: "", department: "", sr_number: generateSRNumber(),
      });
      fetchAll();
      setTimeout(() => setFlash(null), 4000);
    } catch (err) {
      setFlash({ type: "error", text: err.response?.data?.error || "Failed to create request" });
      setTimeout(() => setFlash(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await API.put(`/maintenance/${id}`, {
        status: "resolved",
        resolved_date: new Date().toISOString().split("T")[0],
        checked_by: storedUser.user_id || null,
        audit_note: "Request checked and resolved",
      });
      fetchAll();
    } catch (err) {
      setFlash({ type: "error", text: "Failed to resolve request." });
      setTimeout(() => setFlash(null), 4000);
    }
  };

  const handleInProgress = async (id) => {
    try {
      await API.put(`/maintenance/${id}`, { status: "in_progress" });
      fetchAll();
    } catch (err) {
      setFlash({ type: "error", text: "Failed to update status to In Progress." });
      setTimeout(() => setFlash(null), 4000);
    }
  };

  const handleAssign = async (requestId) => {
    const technicianId = technicianDrafts[requestId];
    if (!technicianId) {
      setFlash({ type: "error", text: "Please select a technician first." });
      setTimeout(() => setFlash(null), 3500);
      return;
    }

    setAssigningId(requestId);
    try {
      await API.put(`/maintenance/${requestId}/assign`, { technician_id: technicianId });
      setFlash({ type: "success", text: "Work assigned to technician." });
      await fetchAll();
    } catch (err) {
      setFlash({ type: "error", text: err.response?.data?.error || "Failed to assign technician" });
    } finally {
      setAssigningId(null);
      setTimeout(() => setFlash(null), 3500);
    }
  };

  const openEdit = (request) => {
    setEditingRequest(request);
    setEditForm({
      asset_id: request.asset_id || "",
      reported_by: request.reported_by || "",
      issue_description: request.issue_description || "",
      request_date: request.request_date?.split("T")[0] || new Date().toISOString().split("T")[0],
      priority: request.priority || "normal",
      request_type: request.request_type || "",
      location: request.location || "",
      sublocation: request.sublocation || "",
      department: request.department || "",
      technician_id: request.technician_id || "",
      status: request.status || "pending",
      resolution_notes: request.resolution_notes || "",
      resolved_date: request.resolved_date?.split("T")[0] || "",
      audit_note: "",
    });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editingRequest) return;

    setSaving(true);
    try {
      await API.put(`/maintenance/${editingRequest.request_id}`, {
        ...editForm,
        checked_by: editForm.status === "resolved" ? storedUser.user_id || null : editingRequest.checked_by || null,
      });
      setFlash({ type: "success", text: `Service request SR-${String(87000 + editingRequest.request_id).padStart(5, "0")} updated.` });
      setEditingRequest(null);
      setEditForm(null);
      await fetchAll();
    } catch (err) {
      setFlash({ type: "error", text: err.response?.data?.error || "Failed to update request" });
    } finally {
      setSaving(false);
      setTimeout(() => setFlash(null), 4000);
    }
  };

  const openAudit = async (request) => {
    setAuditRequest(request);
    setAuditRows([]);
    setAuditLoading(true);
    try {
      const res = await API.get(`/maintenance/${request.request_id}/audit`);
      setAuditRows(res.data);
    } catch (err) {
      setFlash({ type: "error", text: err.response?.data?.error || "Failed to load edit history" });
      setTimeout(() => setFlash(null), 3500);
    } finally {
      setAuditLoading(false);
    }
  };

  const filtered = requests.filter((r) => {
    const matchSearch = `${r.asset_name} ${r.reported_by_name} ${r.issue_description}`
      .toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || r.status === statusFilter.toLowerCase().replace(" ", "_");
    return matchSearch && matchStatus;
  });

  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    in_progress: requests.filter(r => r.status === "in_progress").length,
    resolved: requests.filter(r => r.status === "resolved").length,
  };

  const assignedToMe = requests.filter(r => String(r.technician_id || "") === String(storedUser.user_id || "") && r.status !== "resolved").length;
  const unassignedPending = requests.filter(r => !r.technician_id && r.status === "pending").length;

  const inputStyle = {
    width: "100%", padding: "9px 12px", border: "1px solid #d1d5db",
    borderRadius: "8px", fontSize: "0.88rem", color: "#0f172a",
    background: "#fff", outline: "none",
  };

  const labelStyle = {
    display: "block", fontWeight: 600, marginBottom: "5px",
    color: "#374151", fontSize: "0.83rem",
  };

  return (
    <div>
      <PageHeader title="Service Request" subtitle="Manage Service Requests" />

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "14px",
        marginBottom: "18px",
      }}>
        <div style={{
          background: canManageRequests ? "#eff6ff" : "#f8fafc",
          border: `1px solid ${canManageRequests ? "#bfdbfe" : "#e2e8f0"}`,
          borderRadius: "14px",
          padding: "16px",
          display: "flex",
          gap: "12px",
          alignItems: "center",
        }}>
          <div style={{
            width: "42px", height: "42px", borderRadius: "12px",
            background: canManageRequests ? "#dbeafe" : "#f1f5f9",
            color: canManageRequests ? "#2563eb" : "#64748b",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {canManageRequests ? <FaShieldAlt /> : <FaLock />}
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 800, color: "#0f172a" }}>
              {canManageRequests ? "Workflow Manager Access" : "Requester Access"}
            </p>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.86rem" }}>
              {canManageRequests
                ? "You can assign, edit, resolve, and review request history."
                : "You can create and track only your own requests."}
            </p>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "16px" }}>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.82rem", fontWeight: 700 }}>Open Work Queue</p>
          <h3 style={{ margin: "6px 0 0", color: "#0f172a", fontSize: "1.6rem" }}>{counts.pending + counts.in_progress}</h3>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "16px" }}>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.82rem", fontWeight: 700 }}>
            {canManageRequests ? "Unassigned Pending" : "Your Active Requests"}
          </p>
          <h3 style={{ margin: "6px 0 0", color: "#0f172a", fontSize: "1.6rem" }}>
            {canManageRequests ? unassignedPending : counts.pending + counts.in_progress}
          </h3>
        </div>
        {canManageRequests && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "16px" }}>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.82rem", fontWeight: 700 }}>Assigned To Me</p>
            <h3 style={{ margin: "6px 0 0", color: "#0f172a", fontSize: "1.6rem" }}>{assignedToMe}</h3>
          </div>
        )}
      </div>

      {/* Flash message */}
      {flash && (
        <div style={{
          padding: "12px 18px", borderRadius: "10px", marginBottom: "16px",
          background: flash.type === "success" ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${flash.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          color: flash.type === "success" ? "#15803d" : "#dc2626",
          display: "flex", alignItems: "center", gap: "10px", fontWeight: 600,
        }}>
          {flash.type === "success" ? <FaCheckCircle /> : <FaExclamationTriangle />}
          {flash.text}
        </div>
      )}

      {/* NEW FORM — slides in from top */}
      {showForm && (
        <div style={{
          background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0",
          boxShadow: "0 8px 32px rgba(15,23,42,0.1)", marginBottom: "24px",
          overflow: "hidden",
        }}>
          {/* Form Header */}
          <div style={{
            background: "linear-gradient(135deg, #1e293b, #334155)",
            padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <h3 style={{ margin: 0, color: "#fff", fontSize: "1.05rem", fontWeight: 700 }}>
                New Service Request
              </h3>
              <p style={{ margin: "3px 0 0", color: "#94a3b8", fontSize: "0.82rem" }}>
                {form.sr_number}
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "9px 20px", borderRadius: "9px", border: "none",
                  background: saving ? "#64748b" : "#2563eb", color: "#fff",
                  fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: "0.9rem",
                }}
              >
                <FaSave /> {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "9px 16px", borderRadius: "9px",
                  border: "1px solid #475569", background: "transparent",
                  color: "#cbd5e1", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
                }}
              >
                <FaTimes /> Close
              </button>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={labelStyle}>Request No.</label>
                <input style={{ ...inputStyle, background: "#f8fafc", color: "#94a3b8" }}
                  value={form.sr_number} disabled />
              </div>
              <div>
                <label style={labelStyle}>Request Status</label>
                <input style={{ ...inputStyle, background: "#fffbeb", color: "#f59e0b", fontWeight: 700 }}
                  value="Pending" disabled />
              </div>
              <div>
                <label style={labelStyle}>Request Type <span style={{ color: "#dc2626" }}>*</span></label>
                <select style={inputStyle} value={form.request_type}
                  onChange={e => setForm({ ...form, request_type: e.target.value })} required>
                  <option value="">Select request type</option>
                  <option value="Facility Complaint">Facility Complaint</option>
                  <option value="Hardware Issue">Hardware Issue</option>
                  <option value="Software Issue">Software Issue</option>
                  <option value="Network Issue">Network Issue</option>
                  <option value="Preventive Maintenance">Preventive Maintenance</option>
                  <option value="Installation">Installation</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priority <span style={{ color: "#dc2626" }}>*</span></label>
                <select style={{
                  ...inputStyle,
                  color: form.priority === "urgent" ? "#dc2626" : "#64748b",
                  fontWeight: 700,
                }}
                  value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value })}>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={labelStyle}>Asset <span style={{ color: "#dc2626" }}>*</span></label>
                <select style={inputStyle} value={form.asset_id}
                  onChange={e => setForm({ ...form, asset_id: e.target.value })} required>
                  <option value="">Select asset</option>
                  {assets.map(a => (
                    <option key={a.asset_id} value={a.asset_id}>
                      {a.asset_name} ({a.asset_tag})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Reported By <span style={{ color: "#dc2626" }}>*</span></label>
                <select style={{ ...inputStyle, background: canManageRequests ? "#fff" : "#f8fafc" }} value={canManageRequests ? form.reported_by : storedUser.user_id || ""}
                  onChange={e => setForm({ ...form, reported_by: e.target.value })} disabled={!canManageRequests} required>
                  <option value="">Select user</option>
                  {visibleUsers.map(u => (
                    <option key={u.user_id} value={u.user_id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <input style={inputStyle} placeholder="Please select location"
                  value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Sub Location</label>
                <input style={inputStyle} placeholder="Select Sub Location"
                  value={form.sublocation} onChange={e => setForm({ ...form, sublocation: e.target.value })} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={labelStyle}>Work Department <span style={{ color: "#dc2626" }}>*</span></label>
                <input style={inputStyle} placeholder="Select work department"
                  value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Preferred Date</label>
                <input type="date" style={inputStyle} value={form.request_date}
                  onChange={e => setForm({ ...form, request_date: e.target.value })} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Description / Complaint <span style={{ color: "#dc2626" }}>*</span></label>
                <textarea
                  style={{ ...inputStyle, height: "80px", resize: "vertical" }}
                  placeholder="Please enter Description / Complaint"
                  value={form.issue_description}
                  onChange={e => setForm({ ...form, issue_description: e.target.value })}
                  required
                />
              </div>
            </div>
          </form>
        </div>
      )}

      {canManageRequests && editingRequest && editForm && (
        <div style={{
          background: "#fff", borderRadius: "16px", border: "1px solid #bfdbfe",
          boxShadow: "0 8px 32px rgba(37,99,235,0.12)", marginBottom: "24px",
          overflow: "hidden",
        }}>
          <div style={{
            background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
            padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <h3 style={{ margin: 0, color: "#fff", fontSize: "1.05rem", fontWeight: 700 }}>
                Edit Service Request
              </h3>
              <p style={{ margin: "3px 0 0", color: "#dbeafe", fontSize: "0.82rem" }}>
                SR-{String(87000 + editingRequest.request_id).padStart(5, "0")} - all edits are stored in history
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setEditingRequest(null); setEditForm(null); }}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "9px 16px", borderRadius: "9px",
                border: "1px solid #93c5fd", background: "transparent",
                color: "#eff6ff", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem",
              }}
            >
              <FaTimes /> Close
            </button>
          </div>

          <form onSubmit={handleEditSave} style={{ padding: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={labelStyle}>Status</label>
                <select style={inputStyle} value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Technician</label>
                <select style={inputStyle} value={editForm.technician_id} onChange={e => setEditForm({ ...editForm, technician_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {technicians.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priority</label>
                <select style={inputStyle} value={editForm.priority} onChange={e => setEditForm({ ...editForm, priority: e.target.value })}>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Request Type</label>
                <select style={inputStyle} value={editForm.request_type} onChange={e => setEditForm({ ...editForm, request_type: e.target.value })}>
                  <option value="">Select request type</option>
                  <option value="Facility Complaint">Facility Complaint</option>
                  <option value="Hardware Issue">Hardware Issue</option>
                  <option value="Software Issue">Software Issue</option>
                  <option value="Network Issue">Network Issue</option>
                  <option value="Preventive Maintenance">Preventive Maintenance</option>
                  <option value="Installation">Installation</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={labelStyle}>Asset</label>
                <select style={inputStyle} value={editForm.asset_id} onChange={e => setEditForm({ ...editForm, asset_id: e.target.value })} required>
                  {assets.map(a => <option key={a.asset_id} value={a.asset_id}>{a.asset_name} ({a.asset_tag})</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Reported By</label>
                <select style={inputStyle} value={editForm.reported_by} onChange={e => setEditForm({ ...editForm, reported_by: e.target.value })} required>
                  {users.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Request Date</label>
                <input type="date" style={inputStyle} value={editForm.request_date} onChange={e => setEditForm({ ...editForm, request_date: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Resolved Date</label>
                <input type="date" style={inputStyle} value={editForm.resolved_date} onChange={e => setEditForm({ ...editForm, resolved_date: e.target.value })} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={labelStyle}>Location</label>
                <input style={inputStyle} value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Sub Location</label>
                <input style={inputStyle} value={editForm.sublocation} onChange={e => setEditForm({ ...editForm, sublocation: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Work Department</label>
                <input style={inputStyle} value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Audit Note</label>
                <input style={inputStyle} placeholder="Why was this edited?" value={editForm.audit_note} onChange={e => setEditForm({ ...editForm, audit_note: e.target.value })} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={labelStyle}>Description / Complaint</label>
                <textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }} value={editForm.issue_description} onChange={e => setEditForm({ ...editForm, issue_description: e.target.value })} required />
              </div>
              <div>
                <label style={labelStyle}>Resolution / Check Notes</label>
                <textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }} value={editForm.resolution_notes} onChange={e => setEditForm({ ...editForm, resolution_notes: e.target.value })} />
              </div>
            </div>

            <button type="submit" className="primary-btn-pro" disabled={saving}>
              <FaSave style={{ marginRight: "8px" }} />
              {saving ? "Saving..." : "Save Edit"}
            </button>
          </form>
        </div>
      )}

      {canManageRequests && auditRequest && (
        <div style={{
          background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0",
          boxShadow: "0 8px 32px rgba(15,23,42,0.08)", marginBottom: "24px",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center",
            borderBottom: "1px solid #e2e8f0", background: "#f8fafc",
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>Edit History</h3>
              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.86rem" }}>
                SR-{String(87000 + auditRequest.request_id).padStart(5, "0")} - who edited, assigned, checked, or resolved the request
              </p>
            </div>
            <button type="button" className="delete-btn-pro" onClick={() => setAuditRequest(null)}>
              <FaTimes />
            </button>
          </div>
          <div style={{ padding: "18px 24px" }}>
            {auditLoading ? (
              <p style={{ color: "#64748b" }}>Loading history...</p>
            ) : auditRows.length > 0 ? (
              <div style={{ display: "grid", gap: "12px" }}>
                {auditRows.map(row => {
                  let changes = {};
                  try { changes = JSON.parse(row.changes_json || "{}"); } catch { changes = {}; }
                  return (
                    <div key={row.audit_id} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px", background: "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
                        <strong style={{ textTransform: "capitalize", color: "#0f172a" }}>{row.action.replace("_", " ")}</strong>
                        <span style={{ color: "#64748b", fontSize: "0.82rem" }}>{new Date(row.created_at).toLocaleString()}</span>
                      </div>
                      <p style={{ margin: "0 0 8px", color: "#475569", fontSize: "0.86rem" }}>
                        By: <strong>{row.edited_by_name || "System/User"}</strong> {row.edited_role ? `(${row.edited_role})` : ""}
                      </p>
                      {row.notes ? <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: "0.86rem" }}>{row.notes}</p> : null}
                      <div style={{ display: "grid", gap: "6px" }}>
                        {Object.entries(changes).length > 0 ? Object.entries(changes).map(([field, value]) => (
                          <p key={field} style={{ margin: 0, color: "#334155", fontSize: "0.84rem" }}>
                            <strong>{field.replaceAll("_", " ")}:</strong> {String(value.from ?? "-")} -> {String(value.to ?? "-")}
                          </p>
                        )) : <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.84rem" }}>No field-level changes captured.</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: "#64748b" }}>No edit history available for this request yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div style={{
        background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0",
        padding: "16px 20px", marginBottom: "20px",
        boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
      }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {/* Stop/Start Auto Refresh */}
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                padding: "9px 16px", borderRadius: "9px", border: "none",
                background: autoRefresh ? "#dc2626" : "#16a34a",
                color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.88rem",
              }}
            >
              <FaStop style={{ fontSize: "0.75rem" }} />
              {autoRefresh ? "Stop Auto Refresh" : "Start Auto Refresh"}
            </button>

            {/* Refresh Now */}
            <button
              type="button"
              onClick={handleRefreshNow}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                padding: "9px 16px", borderRadius: "9px",
                border: "1px solid #2563eb", background: "#eff6ff",
                color: "#2563eb", fontWeight: 700, cursor: "pointer", fontSize: "0.88rem",
              }}
            >
              <FaSync style={{ fontSize: "0.78rem" }} /> Refresh Now
            </button>

            {/* Sound Alerts */}
            <button
              type="button"
              onClick={() => setSoundAlerts(!soundAlerts)}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                padding: "9px 16px", borderRadius: "9px",
                border: `1px solid ${soundAlerts ? "#f59e0b" : "#d1d5db"}`,
                background: soundAlerts ? "#fffbeb" : "#f8fafc",
                color: soundAlerts ? "#d97706" : "#94a3b8",
                fontWeight: 700, cursor: "pointer", fontSize: "0.88rem",
              }}
            >
              {soundAlerts ? <FaBell /> : <FaBellSlash />}
              Sound Alerts
            </button>

            {/* Auto refresh status */}
            {autoRefresh && (
              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "9px 14px", borderRadius: "9px",
                background: "#f0fdf4", border: "1px solid #bbf7d0",
                color: "#15803d", fontSize: "0.85rem", fontWeight: 600,
              }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#16a34a", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                Auto-refresh active
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {/* Refresh interval */}
            <select
              value={refreshInterval}
              onChange={e => { setRefreshInterval(Number(e.target.value)); setCountdown(Number(e.target.value)); }}
              style={{
                padding: "9px 12px", borderRadius: "9px", border: "1px solid #d1d5db",
                background: "#fff", fontSize: "0.88rem", color: "#374151", cursor: "pointer",
              }}
            >
              {REFRESH_INTERVALS.map(s => (
                <option key={s} value={s}>Every {s} seconds</option>
              ))}
            </select>

            {/* New button */}
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                padding: "9px 18px", borderRadius: "9px", border: "none",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.88rem",
                boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
              }}
            >
              <FaPlus style={{ fontSize: "0.78rem" }} /> New
            </button>
          </div>
        </div>

        {/* Status filter tabs + search */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            {[
              { key: "All", count: counts.all, color: "#64748b" },
              { key: "Pending", count: counts.pending, color: "#f59e0b" },
              { key: "In Progress", count: counts.in_progress, color: "#2563eb" },
              { key: "Resolved", count: counts.resolved, color: "#16a34a" },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  padding: "7px 14px", borderRadius: "8px", border: "none",
                  background: statusFilter === tab.key ? tab.color : "#f1f5f9",
                  color: statusFilter === tab.key ? "#fff" : "#64748b",
                  fontWeight: 700, cursor: "pointer", fontSize: "0.83rem",
                  transition: "all 0.2s",
                }}
              >
                {tab.key} ({tab.count})
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <FaFilter style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "0.78rem" }} />
              <input
                type="text"
                placeholder="Search requests..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  padding: "9px 12px 9px 32px", border: "1px solid #d1d5db",
                  borderRadius: "9px", fontSize: "0.88rem", width: "220px",
                  background: "#f8fafc", outline: "none",
                }}
              />
            </div>
            <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
              Last: {lastRefresh.toLocaleTimeString()}
              {autoRefresh && ` · Next in ${countdown}s`}
            </span>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div style={{
        background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0",
        boxShadow: "0 2px 8px rgba(15,23,42,0.05)", overflow: "hidden",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.87rem" }}>
            <thead>
              <tr style={{ background: "linear-gradient(135deg, #1e293b, #334155)" }}>
                {["Request Status","Request No.","Request Date","Asset","Priority","Technician","Assigned By","Checked By","Request Type","Reported By","Description","Action"].map(h => (
                  <th key={h} style={{
                    padding: "13px 14px", color: "#e2e8f0", fontWeight: 700,
                    textAlign: "left", whiteSpace: "nowrap", fontSize: "0.82rem",
                    letterSpacing: "0.02em",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((r, i) => {
                const statusCfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                const priority = r.priority || "normal";
                const priorityCfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
                const srNum = `SR-${String(87000 + r.request_id).padStart(5, "0")}`;

                return (
                  <tr key={r.request_id} style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: i % 2 === 0 ? "#fff" : "#fafafa",
                    transition: "background 0.15s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f0f9ff"}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa"}
                  >
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{
                        padding: "4px 10px", borderRadius: "6px", fontWeight: 700,
                        fontSize: "0.78rem", color: statusCfg.color,
                        background: statusCfg.bg, border: `1px solid ${statusCfg.border}`,
                        whiteSpace: "nowrap",
                      }}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", color: "#2563eb", fontWeight: 700, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                      {srNum}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#64748b", whiteSpace: "nowrap" }}>
                      {r.request_date?.split("T")[0]}<br />
                      <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                        {new Date(r.created_at || r.request_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: "#0f172a", maxWidth: "150px" }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.asset_name || "Not Available"}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: "6px", fontWeight: 700,
                        fontSize: "0.78rem", color: priorityCfg.color, background: priorityCfg.bg,
                        border: `1px solid ${priorityCfg.color}30`,
                      }}>
                        {priorityCfg.label}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", minWidth: "190px" }}>
                      {canManageRequests && r.status === "pending" ? (
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <select
                            value={technicianDrafts[r.request_id] || r.technician_id || ""}
                            onChange={e => setTechnicianDrafts({ ...technicianDrafts, [r.request_id]: e.target.value })}
                            style={{
                              width: "130px", padding: "6px 8px", borderRadius: "7px",
                              border: "1px solid #d1d5db", fontSize: "0.78rem", color: "#334155",
                            }}
                          >
                            <option value="">Technician</option>
                            {technicians.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleAssign(r.request_id)}
                            disabled={assigningId === r.request_id}
                            title="Assign work"
                            style={{
                              padding: "6px 8px", borderRadius: "7px", border: "none",
                              background: "#eff6ff", color: "#2563eb", cursor: "pointer",
                            }}
                          >
                            {assigningId === r.request_id ? "..." : <FaUserCog />}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#0f172a", fontWeight: 600 }}>
                          {r.technician_name || "Unassigned"}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#64748b" }}>
                      {r.assigned_by_name || "-"}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#64748b" }}>
                      {r.checked_by_name || "-"}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#475569" }}>
                      {r.request_type || "Facility Complaint"}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#0f172a", fontWeight: 500 }}>
                      {r.reported_by_name}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#475569", maxWidth: "200px" }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.issue_description}>
                        {r.issue_description}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {canManageRequests && r.status === "pending" && (
                          <button
                            onClick={() => handleInProgress(r.request_id)}
                            style={{
                              padding: "5px 10px", borderRadius: "7px", border: "none",
                              background: "#eff6ff", color: "#2563eb",
                              fontWeight: 700, cursor: "pointer", fontSize: "0.78rem",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <FaTools style={{ marginRight: "4px", fontSize: "0.7rem" }} />
                            Start
                          </button>
                        )}
                        {canManageRequests && r.status === "in_progress" && (
                          <button
                            onClick={() => handleResolve(r.request_id)}
                            style={{
                              padding: "5px 10px", borderRadius: "7px", border: "none",
                              background: "#f0fdf4", color: "#16a34a",
                              fontWeight: 700, cursor: "pointer", fontSize: "0.78rem",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <FaCheckCircle style={{ marginRight: "4px", fontSize: "0.7rem" }} />
                            Resolve
                          </button>
                        )}
                        {r.status === "resolved" && (
                          <span style={{ color: "#16a34a", fontWeight: 700, fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "4px" }}>
                            <FaCheckCircle /> Done
                          </span>
                        )}
                        {canManageRequests && (
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          title="Edit request"
                          style={{
                            padding: "5px 9px", borderRadius: "7px", border: "none",
                            background: "#f8fafc", color: "#475569",
                            fontWeight: 700, cursor: "pointer", fontSize: "0.78rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <FaEdit />
                        </button>
                        )}
                        {canManageRequests && (
                        <button
                          type="button"
                          onClick={() => openAudit(r)}
                          title="View edit history"
                          style={{
                            padding: "5px 9px", borderRadius: "7px", border: "none",
                            background: "#fefce8", color: "#a16207",
                            fontWeight: 700, cursor: "pointer", fontSize: "0.78rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <FaHistory />
                        </button>
                        )}
                        {canManageRequests && r.status === "in_progress" && (
                          <button
                            type="button"
                            onClick={() => openEdit({ ...r, status: "resolved" })}
                            title="Check and add resolution notes"
                            style={{
                              padding: "5px 9px", borderRadius: "7px", border: "none",
                              background: "#ecfdf5", color: "#15803d",
                              fontWeight: 700, cursor: "pointer", fontSize: "0.78rem",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <FaClipboardCheck />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="12" style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>
                    <FaTools style={{ fontSize: "2rem", marginBottom: "12px", display: "block", margin: "0 auto 12px" }} />
                    No service requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px", borderTop: "1px solid #f1f5f9",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "#f8fafc",
        }}>
          <span style={{ color: "#64748b", fontSize: "0.83rem" }}>
            Showing <strong>{filtered.length}</strong> of <strong>{requests.length}</strong> requests
          </span>
          <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
            {autoRefresh ? `⟳ Auto-refreshing every ${refreshInterval}s` : "Auto-refresh paused"}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default Maintenance;
