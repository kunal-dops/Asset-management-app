import React, { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import API, { getApiErrorMessage } from "../api";
import { FaTrash, FaPlusCircle, FaFileExport } from "react-icons/fa";

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ category_name: "", description: "" });

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/categories");
      setCategories(res.data);
    } catch (err) {
      console.error("Fetch categories error:", err);
      setError(getApiErrorMessage(err, "Failed to load categories."));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category_name.trim()) { setError("Category name is required."); return; }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await API.post("/categories", form);
      setForm({ category_name: "", description: "" });
      setSuccess("Category created successfully.");
      await fetchCategories();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add category"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    setDeletingId(id);
    setError("");
    setSuccess("");
    try {
      await API.delete(`/categories/${id}`);
      setSuccess("Category deleted successfully.");
      await fetchCategories();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete category"));
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = categories.filter((c) =>
    c.category_name.toLowerCase().includes(search.toLowerCase())
  );

  const exportCsv = () => {
    const rows = [
      ["ID", "Category", "Description"],
      ...filtered.map((c) => [c.category_id, c.category_name, c.description || ""]),
    ];
    const csv = rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "categories.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Asset Categories" subtitle="Organize assets into structured categories" />
      {error ? <p className="text-danger mb-2">{error}</p> : null}
      {success ? <p className="text-success mb-2">{success}</p> : null}

      <div className="page-card-pro">
        <div className="section-header-pro">
          <h3>Create Category</h3>
          <p>Define groups for better asset organization</p>
        </div>

        <form className="premium-form-grid" onSubmit={handleSubmit} style={{ gridTemplateColumns: "1fr 1fr auto" }}>
          <input
            type="text"
            placeholder="Category Name"
            value={form.category_name}
            onChange={(e) => setForm({ ...form, category_name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <button type="submit" className="primary-btn-pro" disabled={saving}>
            <FaPlusCircle style={{ marginRight: "8px" }} />
            {saving ? "Adding..." : "Add"}
          </button>
        </form>
      </div>

      <div className="page-card-pro">
        <div className="table-header-pro">
          <h3>Category Directory</h3>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input type="text" className="table-search-pro" placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                <th>ID</th>
                <th>Category</th>
                <th>Description</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="empty-state-cell">Loading categories...</td></tr>
              ) : filtered.length > 0 ? (
                filtered.map((c) => (
                  <tr key={c.category_id}>
                    <td>{c.category_id}</td>
                    <td>{c.category_name}</td>
                    <td>{c.description || "—"}</td>
                    <td>
                      <button className="delete-btn-pro" onClick={() => handleDelete(c.category_id)} disabled={deletingId === c.category_id}>
                        {deletingId === c.category_id ? "..." : <FaTrash />}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" className="empty-state-cell">No categories found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Categories;
