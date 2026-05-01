import React, { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { FaTrash, FaFileExport } from "react-icons/fa";
import API, { getApiErrorMessage } from "../api";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", role: "", department: "", phone: "",
  });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Fetch users error:", err);
      setError(getApiErrorMessage(err, "Failed to load users."));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password) {
      setError("Name, email and password are required.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await API.post("/users", form);
      setForm({ full_name: "", email: "", password: "", role: "", department: "", phone: "" });
      setSuccess("User added successfully.");
      await fetchUsers();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add user"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    setDeletingId(id);
    setError("");
    setSuccess("");
    try {
      await API.delete(`/users/${id}`);
      setSuccess("User deleted successfully.");
      await fetchUsers();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete user"));
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = users.filter((u) =>
    `${u.full_name} ${u.email} ${u.department}`.toLowerCase().includes(search.toLowerCase())
  );

  const exportCsv = () => {
    const rows = [
      ["Name", "Email", "Role", "Department", "Phone"],
      ...filtered.map((u) => [u.full_name, u.email, u.role || "", u.department || "", u.phone || ""]),
    ];
    const csv = rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "users.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Users Management" subtitle="Create, organize, and manage system users" />
      {error ? <p className="text-danger mb-2">{error}</p> : null}
      {success ? <p className="text-success mb-2">{success}</p> : null}

      <div className="page-card-pro">
        <div className="section-header-pro">
          <h3>Add New User</h3>
          <p>Register authorized personnel into the platform</p>
        </div>

        <form className="premium-form-grid users-form-pro" onSubmit={handleSubmit}>
          <input type="text" name="full_name" placeholder="Full Name" value={form.full_name} onChange={handleChange} required />
          <input type="email" name="email" placeholder="Email Address" value={form.email} onChange={handleChange} required />
          <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} required />
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="">Select Role</option>
            <option value="admin">Admin</option>
            <option value="technician">Technician</option>
            <option value="user">User</option>
          </select>
          <input type="text" name="department" placeholder="Department" value={form.department} onChange={handleChange} />
          <input type="text" name="phone" placeholder="Phone Number" value={form.phone} onChange={handleChange} />
          <button type="submit" className="primary-btn-pro user-submit-btn" disabled={saving}>
            {saving ? "Adding..." : "Add User"}
          </button>
        </form>
      </div>

      <div className="page-card-pro">
        <div className="table-header-pro">
          <h3>Registered Personnel</h3>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input type="text" className="table-search-pro" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Phone</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="empty-state-cell">Loading users...</td></tr>
              ) : filtered.length > 0 ? (
                filtered.map((u) => (
                  <tr key={u.user_id}>
                    <td>{u.full_name}</td>
                    <td>{u.email}</td>
                    <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                    <td>{u.department || "—"}</td>
                    <td>{u.phone || "—"}</td>
                    <td>
                      <button className="delete-btn-pro" onClick={() => handleDelete(u.user_id)} disabled={deletingId === u.user_id}>
                        {deletingId === u.user_id ? "..." : <FaTrash />}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="empty-state-cell">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Users;
