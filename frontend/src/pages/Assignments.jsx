import React, { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import API, { getApiErrorMessage } from "../api";
import { FaPlusCircle, FaUndo, FaFileExport } from "react-icons/fa";

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [returningId, setReturningId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    asset_id: "",
    user_id: "",
    assigned_date: "",
    expected_return_date: "",
    remarks: "",
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [asgRes, assetRes, userRes] = await Promise.all([
        API.get("/assignments"),
        API.get("/assets"),
        API.get("/users"),
      ]);
      setAssignments(asgRes.data);
      setAssets(assetRes.data.filter((a) => a.status === "available"));
      setUsers(userRes.data);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(getApiErrorMessage(err, "Failed to load assignment data."));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.asset_id || !form.user_id || !form.assigned_date) {
      setError("Asset, User and Assigned Date are required.");
      return;
    }
    if (form.expected_return_date && form.expected_return_date < form.assigned_date) {
      setError("Expected return date cannot be before assigned date.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await API.post("/assignments", form);
      setForm({ asset_id: "", user_id: "", assigned_date: "", expected_return_date: "", remarks: "" });
      setSuccess("Asset assigned successfully.");
      await fetchAll();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to assign asset"));
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async (id) => {
    const date = new Date().toISOString().split("T")[0];
    setReturningId(id);
    setError("");
    setSuccess("");
    try {
      await API.put(`/assignments/return/${id}`, { actual_return_date: date });
      setSuccess("Asset marked as returned.");
      await fetchAll();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to return asset"));
    } finally {
      setReturningId(null);
    }
  };

  const filtered = assignments.filter((a) => {
    const matchesSearch = `${a.asset_name} ${a.full_name} ${a.asset_tag}`.toLowerCase().includes(search.toLowerCase());
    const normalizedStatus = a.assignment_status || "active";
    const matchesStatus = statusFilter === "all" ? true : normalizedStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportCsv = () => {
    const rows = [
      ["Asset", "Tag", "User", "Assigned", "Expected Return", "Status"],
      ...filtered.map((a) => [
        a.asset_name || "",
        a.asset_tag || "",
        a.full_name || "",
        a.assigned_date?.split("T")[0] || "",
        a.expected_return_date?.split("T")[0] || "",
        a.assignment_status || "active",
      ]),
    ];
    const csv = rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "assignments.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Allocation Records" subtitle="Track asset assignments and returns" />
      {error ? <p className="text-danger mb-2">{error}</p> : null}
      {success ? <p className="text-success mb-2">{success}</p> : null}

      <div className="page-card-pro">
        <div className="section-header-pro">
          <h3>Assign Asset</h3>
          <p>Create a new asset allocation entry</p>
        </div>

        <form className="premium-form-grid" onSubmit={handleSubmit}>
          <select value={form.asset_id} onChange={(e) => setForm({ ...form, asset_id: e.target.value })} required>
            <option value="">Select Asset</option>
            {assets.map((a) => (
              <option key={a.asset_id} value={a.asset_id}>
                {a.asset_name} ({a.asset_tag})
              </option>
            ))}
          </select>

          <select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} required>
            <option value="">Select User</option>
            {users.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.full_name}
              </option>
            ))}
          </select>

          <input type="date" value={form.assigned_date} onChange={(e) => setForm({ ...form, assigned_date: e.target.value })} required />
          <input type="date" placeholder="Expected Return" value={form.expected_return_date} onChange={(e) => setForm({ ...form, expected_return_date: e.target.value })} />

          <textarea
            placeholder="Remarks (optional)"
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
          />

          <button type="submit" className="primary-btn-pro" disabled={saving}>
            <FaPlusCircle style={{ marginRight: "8px" }} />
            {saving ? "Assigning..." : "Assign"}
          </button>
        </form>
      </div>

      <div className="page-card-pro">
        <div className="table-header-pro">
          <h3>Assignment History</h3>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input type="text" className="table-search-pro" placeholder="Search assignments..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="returned">Returned</option>
            </select>
            <button type="button" className="primary-btn-pro" onClick={exportCsv}>
              <FaFileExport style={{ marginRight: "8px" }} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="table-wrapper-pro">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Tag</th>
                <th>User</th>
                <th>Assigned</th>
                <th>Expected Return</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="empty-state-cell">Loading assignments...</td></tr>
              ) : filtered.length > 0 ? (
                filtered.map((a) => (
                  <tr key={a.assignment_id}>
                    <td>{a.asset_name}</td>
                    <td>{a.asset_tag}</td>
                    <td>{a.full_name}</td>
                    <td>{a.assigned_date?.split("T")[0]}</td>
                    <td>{a.expected_return_date?.split("T")[0] || "—"}</td>
                    <td>
                      <span className={`status-badge ${a.assignment_status === "returned" ? "available" : "assigned"}`}>
                        {a.assignment_status || "active"}
                      </span>
                    </td>
                    <td>
                      {a.assignment_status !== "returned" && (
                        <button className="delete-btn-pro" title="Mark as returned" onClick={() => handleReturn(a.assignment_id)} disabled={returningId === a.assignment_id}>
                          {returningId === a.assignment_id ? "..." : <FaUndo />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7" className="empty-state-cell">No assignments found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Assignments;
