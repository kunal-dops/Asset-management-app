import React, { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import API from "../api";
import { FaPlusCircle, FaTrash } from "react-icons/fa";

const initialFormState = {
  asset_name: "",
  asset_tag: "",
  serial_number: "",
  category_id: "",
  brand: "",
  model: "",
  purchase_date: "",
  purchase_cost: "",
  vendor: "",
  warranty_expiry: "",
  status: "available",
  location: "",
  description: ""
};

const Assets = () => {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState(initialFormState);

  useEffect(() => {
    fetchAssets();
    fetchCategories();
  }, []);

  const fetchAssets = async () => {
    setIsLoadingAssets(true);
    setErrorMessage("");
    try {
      const res = await API.get("/assets");
      setAssets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching assets:", err);
      setErrorMessage("Unable to load assets right now. Please try again.");
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await API.get("/categories");
      setCategories(res.data);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
    if (errorMessage) setErrorMessage("");
    if (successMessage) setSuccessMessage("");
  };

  const validateForm = () => {
    const errors = {};
    if (!form.asset_name.trim()) errors.asset_name = "Asset name is required";
    if (!form.asset_tag.trim()) errors.asset_tag = "Asset tag is required";
    if (!form.category_id) errors.category_id = "Category is required";
    if (form.purchase_cost !== "") {
      const cost = Number(form.purchase_cost);
      if (!Number.isFinite(cost) || cost < 0) {
        errors.purchase_cost = "Purchase cost must be a valid non-negative number";
      }
    }
    if (form.warranty_expiry && form.purchase_date && form.warranty_expiry < form.purchase_date) {
      errors.warranty_expiry = "Warranty expiry cannot be before purchase date";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const payload = {
        ...form,
        category_id: form.category_id ? Number(form.category_id) : form.category_id,
        purchase_cost: form.purchase_cost === "" ? "" : Number(form.purchase_cost),
      };
      await API.post("/assets", payload);
      setForm(initialFormState);
      setFieldErrors({});
      setSuccessMessage("Asset added successfully.");
      await fetchAssets();
    } catch (err) {
      console.error("Error adding asset:", err);
      const msg =
        err?.response?.data?.details ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to add asset";
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const assetToDelete = assets.find((asset) => asset.asset_id === id);
    const assetLabel = assetToDelete?.asset_name || `#${id}`;
    const confirmed = window.confirm(`Delete asset "${assetLabel}"? This action cannot be undone.`);
    if (!confirmed) return;

    setIsDeletingId(id);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await API.delete(`/assets/${id}`);
      await fetchAssets();
      setSuccessMessage("Asset deleted successfully.");
    } catch (err) {
      console.error("Error deleting asset:", err);
      const msg =
        err?.response?.data?.details ||
        err?.response?.data?.error ||
        err?.message ||
        "Delete failed";
      setErrorMessage(msg);
    } finally {
      setIsDeletingId(null);
    }
  };

  const filteredAssets = assets.filter((asset) =>
    `${asset.asset_name} ${asset.asset_tag} ${asset.brand} ${asset.model} ${asset.location}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const getStatusClass = (status) => {
    switch (status) {
      case "available":
        return "status-badge available";
      case "assigned":
        return "status-badge assigned";
      case "maintenance":
        return "status-badge maintenance";
      case "retired":
        return "status-badge retired";
      default:
        return "status-badge";
    }
  };

  return (
    <div>
      <PageHeader
        title="Asset Inventory"
        subtitle="Manage, monitor, and organize your organization's IT assets"
      />

        {/* Add Asset Card */}
        <div className="page-card-pro">
          <div className="section-header-pro">
            <h3>Register New Asset</h3>
            <p>Add hardware and IT resources into your digital inventory</p>
          </div>

          {errorMessage ? <p className="text-danger mb-2">{errorMessage}</p> : null}
          {successMessage ? <p className="text-success mb-2">{successMessage}</p> : null}

          <form className="premium-form-grid" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Asset Name"
              value={form.asset_name}
              onChange={(e) => handleInputChange("asset_name", e.target.value)}
              required
            />
            {fieldErrors.asset_name ? <small className="text-danger">{fieldErrors.asset_name}</small> : null}

            <input
              type="text"
              placeholder="Asset Tag"
              value={form.asset_tag}
              onChange={(e) => handleInputChange("asset_tag", e.target.value)}
              required
            />
            {fieldErrors.asset_tag ? <small className="text-danger">{fieldErrors.asset_tag}</small> : null}

            <input
              type="text"
              placeholder="Serial Number"
              value={form.serial_number}
              onChange={(e) => handleInputChange("serial_number", e.target.value)}
            />

            <select
              value={form.category_id}
              onChange={(e) => handleInputChange("category_id", e.target.value)}
              required
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.category_name}
                </option>
              ))}
            </select>
            {fieldErrors.category_id ? <small className="text-danger">{fieldErrors.category_id}</small> : null}

            <input
              type="text"
              placeholder="Brand"
              value={form.brand}
              onChange={(e) => handleInputChange("brand", e.target.value)}
            />

            <input
              type="text"
              placeholder="Model"
              value={form.model}
              onChange={(e) => handleInputChange("model", e.target.value)}
            />

            <input
              type="date"
              value={form.purchase_date}
              onChange={(e) => handleInputChange("purchase_date", e.target.value)}
            />

            <input
              type="number"
              placeholder="Purchase Cost"
              value={form.purchase_cost}
              onChange={(e) => handleInputChange("purchase_cost", e.target.value)}
              min="0"
              step="0.01"
            />
            {fieldErrors.purchase_cost ? <small className="text-danger">{fieldErrors.purchase_cost}</small> : null}

            <input
              type="text"
              placeholder="Vendor"
              value={form.vendor}
              onChange={(e) => handleInputChange("vendor", e.target.value)}
            />

            <input
              type="date"
              value={form.warranty_expiry}
              onChange={(e) => handleInputChange("warranty_expiry", e.target.value)}
            />
            {fieldErrors.warranty_expiry ? <small className="text-danger">{fieldErrors.warranty_expiry}</small> : null}

            <select
              value={form.status}
              onChange={(e) => handleInputChange("status", e.target.value)}
            >
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>

            <input
              type="text"
              placeholder="Location"
              value={form.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
            />

            <textarea
              placeholder="Asset Description"
              value={form.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
            />

            <button type="submit" className="primary-btn-pro" disabled={isSaving}>
              <FaPlusCircle className="me-2" />
              {isSaving ? "Adding..." : "Add Asset"}
            </button>
          </form>
        </div>

        {/* Asset Table */}
        <div className="page-card-pro">
          <div className="table-header-pro">
            <h3>Asset Inventory Records</h3>
            <input
              type="text"
              placeholder="Search assets..."
              className="table-search-pro"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="table-responsive">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Tag</th>
                  <th>Category</th>
                  <th>Brand</th>
                  <th>Model</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingAssets ? (
                  <tr>
                    <td colSpan="9" className="empty-state-cell">
                      Loading assets...
                    </td>
                  </tr>
                ) : filteredAssets.length > 0 ? (
                  filteredAssets.map((asset) => (
                    <tr key={asset.asset_id}>
                      <td>{asset.asset_id}</td>
                      <td>{asset.asset_name}</td>
                      <td>{asset.asset_tag}</td>
                      <td>{asset.category_name || "N/A"}</td>
                      <td>{asset.brand || "N/A"}</td>
                      <td>{asset.model || "N/A"}</td>
                      <td>
                        <span className={getStatusClass(asset.status)}>
                          {asset.status}
                        </span>
                      </td>
                      <td>{asset.location || "N/A"}</td>
                      <td>
                        <button
                          className="delete-btn-pro"
                          onClick={() => handleDelete(asset.asset_id)}
                          disabled={isDeletingId === asset.asset_id}
                        >
                          {isDeletingId === asset.asset_id ? "..." : <FaTrash />}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="empty-state-cell">
                      No assets found. Start by registering your first IT asset.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
};

export default Assets;