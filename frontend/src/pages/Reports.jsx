import React, { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import API, { getApiErrorMessage } from "../api";
import {
  FaBrain,
  FaChartLine,
  FaExclamationTriangle,
  FaFileExport,
  FaLightbulb,
  FaSyncAlt,
} from "react-icons/fa";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, XAxis, YAxis, Bar } from "recharts";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];

const emptySmartInsights = {
  healthScore: 100,
  riskAssets: [],
  repeatedMaintenance: [],
  overdueAssignments: [],
  recommendations: [],
};

const toDateOnly = (value) => {
  if (!value) return "";
  return String(value).split("T")[0];
};

const buildSmartInsights = (assets, maintenanceRequests, assignments) => {
  const today = new Date().toISOString().split("T")[0];
  const assetMap = new Map(assets.map((asset) => [String(asset.asset_id), asset]));
  const maintenanceByAsset = maintenanceRequests.reduce((acc, request) => {
    const key = String(request.asset_id);
    const current = acc[key] || {
      assetId: key,
      assetName: request.asset_name || assetMap.get(key)?.asset_name || "Unknown asset",
      assetTag: assetMap.get(key)?.asset_tag || "",
      total: 0,
      open: 0,
      latestDate: "",
    };
    current.total += 1;
    if ((request.status || "pending") !== "resolved") current.open += 1;
    const requestDate = toDateOnly(request.request_date || request.created_at);
    if (requestDate > current.latestDate) current.latestDate = requestDate;
    acc[key] = current;
    return acc;
  }, {});

  const activeOverdueAssignments = assignments
    .filter((assignment) => {
      const status = assignment.assignment_status || "active";
      return status !== "returned" && assignment.expected_return_date && toDateOnly(assignment.expected_return_date) < today;
    })
    .map((assignment) => ({
      id: assignment.assignment_id,
      assetName: assignment.asset_name || "Unknown asset",
      assetTag: assignment.asset_tag || "",
      userName: assignment.full_name || "Unassigned user",
      expectedReturnDate: toDateOnly(assignment.expected_return_date),
    }))
    .slice(0, 5);

  const overdueAssetIds = new Set(
    assignments
      .filter((assignment) => {
        const status = assignment.assignment_status || "active";
        return status !== "returned" && assignment.expected_return_date && toDateOnly(assignment.expected_return_date) < today;
      })
      .map((assignment) => String(assignment.asset_id))
  );

  const riskAssets = Object.values(maintenanceByAsset)
    .map((item) => {
      const asset = assetMap.get(item.assetId);
      const score =
        item.total * 18 +
        item.open * 28 +
        (asset?.status === "maintenance" ? 24 : 0) +
        (overdueAssetIds.has(item.assetId) ? 18 : 0);

      return {
        ...item,
        status: asset?.status || "unknown",
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const repeatedMaintenance = Object.values(maintenanceByAsset)
    .filter((item) => item.total > 1)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const openMaintenance = maintenanceRequests.filter((request) => (request.status || "pending") !== "resolved").length;
  const assignedAssets = assets.filter((asset) => asset.status === "assigned").length;
  const maintenanceAssets = assets.filter((asset) => asset.status === "maintenance").length;
  const healthScore = Math.max(
    0,
    Math.min(
      100,
      100 - openMaintenance * 6 - activeOverdueAssignments.length * 8 - repeatedMaintenance.length * 4 - maintenanceAssets * 5
    )
  );

  const recommendations = [];
  if (riskAssets.length > 0) {
    recommendations.push(`Review ${riskAssets[0].assetName}; it has the highest maintenance risk score.`);
  }
  if (openMaintenance > 0) {
    recommendations.push(`Close or assign ${openMaintenance} open maintenance request${openMaintenance === 1 ? "" : "s"} to reduce backlog.`);
  }
  if (activeOverdueAssignments.length > 0) {
    recommendations.push(`Follow up on ${activeOverdueAssignments.length} overdue return${activeOverdueAssignments.length === 1 ? "" : "s"}.`);
  }
  if (assignedAssets > assets.length * 0.7 && assets.length > 0) {
    recommendations.push("Asset allocation is high; check available inventory before approving new requests.");
  }
  if (repeatedMaintenance.length > 0) {
    recommendations.push("Repeated maintenance items may need replacement planning or vendor inspection.");
  }
  if (recommendations.length === 0) {
    recommendations.push("System health looks stable. Keep monitoring maintenance and return dates.");
  }

  return {
    healthScore,
    riskAssets,
    repeatedMaintenance,
    overdueAssignments: activeOverdueAssignments,
    recommendations,
  };
};

const Reports = () => {
  const [stats, setStats] = useState({
    assets: 0,
    assignedAssets: 0,
    openMaintenance: 0,
    users: 0,
    activeAssignments: 0,
    overdueReturns: 0,
  });
  const [assetStatusData, setAssetStatusData] = useState([]);
  const [maintenanceStatusData, setMaintenanceStatusData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [summaryRows, setSummaryRows] = useState([]);
  const [smartInsights, setSmartInsights] = useState(emptySmartInsights);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [assetsResult, usersResult, maintenanceResult, assignmentsResult] = await Promise.allSettled([
        API.get("/assets"),
        API.get("/users"),
        API.get("/maintenance"),
        API.get("/assignments"),
      ]);

      const assets = assetsResult.status === "fulfilled" ? assetsResult.value.data : [];
      const users = usersResult.status === "fulfilled" ? usersResult.value.data : [];
      const maintenanceRequests = maintenanceResult.status === "fulfilled" ? maintenanceResult.value.data : [];
      const assignments = assignmentsResult.status === "fulfilled" ? assignmentsResult.value.data : [];

      const today = new Date().toISOString().split("T")[0];
      const assignedAssets = assets.filter((a) => a.status === "assigned").length;
      const openMaintenance = maintenanceRequests.filter((m) => m.status !== "resolved").length;
      const activeAssignments = assignments.filter((a) => (a.assignment_status || "active") !== "returned").length;
      const overdueReturns = assignments.filter((a) => {
        const status = a.assignment_status || "active";
        return status !== "returned" && a.expected_return_date && a.expected_return_date.split("T")[0] < today;
      }).length;

      setStats({
        assets: assets.length,
        assignedAssets,
        openMaintenance,
        users: users.length,
        activeAssignments,
        overdueReturns,
      });

      const statusCounts = assets.reduce((acc, asset) => {
        const status = asset.status || "unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      setAssetStatusData(
        Object.entries(statusCounts).map(([name, value]) => ({
          name: name.replace("_", " "),
          value,
        }))
      );

      const maintenanceCounts = maintenanceRequests.reduce((acc, request) => {
        const status = request.status || "pending";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      setMaintenanceStatusData(
        Object.entries(maintenanceCounts).map(([name, value]) => ({
          name: name.replace("_", " "),
          value,
        }))
      );

      const categoryCounts = assets.reduce((acc, asset) => {
        const category = asset.category_name || "Uncategorized";
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});
      const sortedCategories = Object.entries(categoryCounts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      setCategoryData(sortedCategories);

      const generatedInsights = buildSmartInsights(assets, maintenanceRequests, assignments);
      setSmartInsights(generatedInsights);

      setSummaryRows([
        { label: "Total Assets", value: assets.length },
        { label: "Assigned Assets", value: assignedAssets },
        { label: "Open Maintenance Requests", value: openMaintenance },
        { label: "Total Users", value: users.length },
        { label: "Active Assignments", value: activeAssignments },
        { label: "Overdue Returns", value: overdueReturns },
        { label: "Asset Health Score", value: `${generatedInsights.healthScore}%` },
      ]);

      if (
        assetsResult.status === "rejected" ||
        usersResult.status === "rejected" ||
        maintenanceResult.status === "rejected" ||
        assignmentsResult.status === "rejected"
      ) {
        setError("Some report data could not be loaded. Showing available metrics.");
      }
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      console.error("Reports fetch error:", err);
      setError(getApiErrorMessage(err, "Failed to load report metrics."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const exportSummary = () => {
    const rows = [
      ["Metric", "Value"],
      ...summaryRows.map((row) => [row.label, row.value]),
      [],
      ["Smart Recommendation", "Value"],
      ...smartInsights.recommendations.map((item, index) => [`Recommendation ${index + 1}`, item]),
      ["Last Updated", lastUpdated || new Date().toLocaleString()],
    ];
    const csv = rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "report-summary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Reports & Analytics" subtitle="Monitor system performance and insights" />
      {error ? <p className="text-danger mb-2">{error}</p> : null}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
          Last updated: {lastUpdated || "—"}
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button type="button" className="primary-btn-pro" onClick={fetchData} disabled={loading}>
            <FaSyncAlt style={{ marginRight: "8px" }} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button type="button" className="primary-btn-pro" onClick={exportSummary}>
            <FaFileExport style={{ marginRight: "8px" }} />
            Export Summary
          </button>
        </div>
      </div>

      <div className="stats-grid-pro">
        {[
          { label: "Total Assets", value: stats.assets },
          { label: "Assigned Assets", value: stats.assignedAssets },
          { label: "Open Maintenance", value: stats.openMaintenance },
          { label: "Total Users", value: stats.users },
          { label: "Active Assignments", value: stats.activeAssignments },
          { label: "Overdue Returns", value: stats.overdueReturns },
        ].map((s) => (
          <div key={s.label} className="stat-card-pro">
            <p className="stat-label">{s.label}</p>
            <h2 className="stat-value">{s.value}</h2>
          </div>
        ))}
      </div>

      <div className="page-card-pro">
        <div className="table-header-pro">
          <div>
            <h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <FaBrain style={{ color: "#2563eb" }} />
              Smart Insights
            </h3>
            <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "0.9rem" }}>
              Rule-based AI-style analysis generated from current asset, maintenance, and assignment data.
            </p>
          </div>
          <div style={{
            minWidth: "150px",
            padding: "14px 18px",
            borderRadius: "16px",
            background: smartInsights.healthScore >= 75 ? "#ecfdf5" : smartInsights.healthScore >= 45 ? "#fffbeb" : "#fef2f2",
            border: `1px solid ${smartInsights.healthScore >= 75 ? "#bbf7d0" : smartInsights.healthScore >= 45 ? "#fde68a" : "#fecaca"}`,
          }}>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.8rem", fontWeight: 700 }}>Health Score</p>
            <h2 style={{ margin: "4px 0 0", color: "#0f172a", fontSize: "2rem" }}>{smartInsights.healthScore}%</h2>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "16px", marginBottom: "22px" }}>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "18px", background: "#fff" }}>
            <h4 style={{ margin: "0 0 12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <FaExclamationTriangle style={{ color: "#dc2626" }} /> High Risk Assets
            </h4>
            {smartInsights.riskAssets.length > 0 ? smartInsights.riskAssets.slice(0, 3).map((asset) => (
              <div key={asset.assetId} style={{ padding: "10px 0", borderTop: "1px solid #f1f5f9" }}>
                <strong>{asset.assetName}</strong>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.86rem" }}>
                  Score {asset.score} - {asset.open} open, {asset.total} total requests
                </p>
              </div>
            )) : (
              <p style={{ margin: 0, color: "#64748b" }}>No risky assets detected.</p>
            )}
          </div>

          <div style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "18px", background: "#fff" }}>
            <h4 style={{ margin: "0 0 12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <FaChartLine style={{ color: "#7c3aed" }} /> Repeated Maintenance
            </h4>
            {smartInsights.repeatedMaintenance.length > 0 ? smartInsights.repeatedMaintenance.slice(0, 3).map((asset) => (
              <div key={asset.assetId} style={{ padding: "10px 0", borderTop: "1px solid #f1f5f9" }}>
                <strong>{asset.assetName}</strong>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.86rem" }}>
                  {asset.total} requests, latest {asset.latestDate || "not dated"}
                </p>
              </div>
            )) : (
              <p style={{ margin: 0, color: "#64748b" }}>No repeated maintenance pattern found.</p>
            )}
          </div>

          <div style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "18px", background: "#fff" }}>
            <h4 style={{ margin: "0 0 12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <FaExclamationTriangle style={{ color: "#f59e0b" }} /> Overdue Returns
            </h4>
            {smartInsights.overdueAssignments.length > 0 ? smartInsights.overdueAssignments.slice(0, 3).map((assignment) => (
              <div key={assignment.id} style={{ padding: "10px 0", borderTop: "1px solid #f1f5f9" }}>
                <strong>{assignment.assetName}</strong>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.86rem" }}>
                  {assignment.userName} - due {assignment.expectedReturnDate}
                </p>
              </div>
            )) : (
              <p style={{ margin: 0, color: "#64748b" }}>No overdue active returns.</p>
            )}
          </div>
        </div>

        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "18px" }}>
          <h4 style={{ margin: "0 0 12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <FaLightbulb style={{ color: "#16a34a" }} /> Recommendations
          </h4>
          <div style={{ display: "grid", gap: "10px" }}>
            {smartInsights.recommendations.map((item, index) => (
              <div key={item} style={{ display: "flex", gap: "10px", alignItems: "flex-start", color: "#334155" }}>
                <span style={{
                  minWidth: "26px",
                  height: "26px",
                  borderRadius: "8px",
                  background: "#eff6ff",
                  color: "#2563eb",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "0.78rem",
                }}>
                  {index + 1}
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3 style={{ marginBottom: "20px", fontWeight: 700 }}>Asset Status Distribution</h3>
          {assetStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={assetStatusData} dataKey="value" outerRadius={92} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {assetStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: "#64748b", textAlign: "center", paddingTop: "90px" }}>No asset status data available</p>
          )}
        </div>

        <div className="chart-card">
          <h3 style={{ marginBottom: "20px", fontWeight: 700 }}>Maintenance Status Mix</h3>
          {maintenanceStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={maintenanceStatusData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: "#64748b", textAlign: "center", paddingTop: "90px" }}>No maintenance data available</p>
          )}
        </div>
      </div>

      <div className="page-card-pro">
        <div className="table-header-pro">
          <h3>Category Utilization (Top 8)</h3>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
            {loading ? "Loading..." : "Use this view to identify high-volume asset groups."}
          </p>
        </div>
        <div className="table-wrapper-pro">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Assets</th>
              </tr>
            </thead>
            <tbody>
              {categoryData.length > 0 ? (
                categoryData.map((row) => (
                  <tr key={row.category}>
                    <td>{row.category}</td>
                    <td>{row.count}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="2" className="empty-state-cell">No category-level insights available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
