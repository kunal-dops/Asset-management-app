import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { getApiErrorMessage } from "../api";
import PageHeader from "../components/PageHeader";
import { FaBoxOpen, FaUserCheck, FaTools, FaUsers, FaSyncAlt } from "react-icons/fa";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#16a34a", "#2563eb", "#f59e0b", "#dc2626"];

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ assets: 0, assigned: 0, maintenance: 0, users: 0 });
  const [pieData, setPieData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    setError("");
    try {
      const [assetsRes, usersRes, maintenanceRes] = await Promise.all([
        API.get("/assets"),
        API.get("/users"),
        API.get("/maintenance"),
      ]);

      const assets = assetsRes.data;
      const available = assets.filter((a) => a.status === "available").length;
      const assigned = assets.filter((a) => a.status === "assigned").length;
      const maintenance = assets.filter((a) => a.status === "maintenance").length;
      const retired = assets.filter((a) => a.status === "retired").length;

      setStats({
        assets: assets.length,
        assigned,
        maintenance: maintenanceRes.data.filter((m) => m.status !== "resolved").length,
        users: usersRes.data.length,
      });

      setPieData([
        { name: "Available", value: available },
        { name: "Assigned", value: assigned },
        { name: "Maintenance", value: maintenance },
        { name: "Retired", value: retired },
      ].filter((d) => d.value > 0));
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(getApiErrorMessage(err, "Unable to load dashboard data."));
    } finally {
      setLoading(false);
    }
  };

  const lineData = [
    { month: "Jan", assets: Math.floor(stats.assets * 0.4) },
    { month: "Feb", assets: Math.floor(stats.assets * 0.6) },
    { month: "Mar", assets: Math.floor(stats.assets * 0.8) },
    { month: "Now", assets: stats.assets },
  ];

  if (loading) return <div className="loader" style={{ padding: "40px", textAlign: "center" }}>Loading dashboard...</div>;

  return (
    <div>
      <PageHeader title="Operational Dashboard" subtitle="Real-time insights into your IT assets" />
      {error ? <p className="text-danger mb-2">{error}</p> : null}
      <div style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>Last updated: {lastUpdated || "—"}</p>
        <button type="button" className="primary-btn-pro" onClick={fetchDashboard}>
          <FaSyncAlt style={{ marginRight: "8px" }} />
          Refresh
        </button>
      </div>

      <div className="quick-actions" style={{ marginBottom: "24px", display: "flex", gap: "12px" }}>
        <button className="primary-btn-pro" onClick={() => navigate("/assets")}>+ Add Asset</button>
        <button className="primary-btn-pro" onClick={() => navigate("/users")}>+ Add User</button>
      </div>

      <div className="stats-grid-pro">
        {[
          { icon: <FaBoxOpen />, value: stats.assets, label: "Total Assets", path: "/assets", color: "#eff6ff", iconColor: "#2563eb" },
          { icon: <FaUserCheck />, value: stats.assigned, label: "Assigned Assets", path: "/assignments", color: "#dcfce7", iconColor: "#16a34a" },
          { icon: <FaTools />, value: stats.maintenance, label: "Open Service Requests", path: "/maintenance", color: "#fff7ed", iconColor: "#ea580c" },
          { icon: <FaUsers />, value: stats.users, label: "Active Users", path: "/users", color: "#faf5ff", iconColor: "#7c3aed" },
        ].map((card) => (
          <div key={card.label} className="stat-card-pro" onClick={() => navigate(card.path)} style={{ cursor: "pointer" }}>
            <div className="stat-card-top">
              <div>
                <p className="stat-label">{card.label}</p>
                <h2 className="stat-value">{card.value}</h2>
              </div>
              <div className="stat-icon-pro" style={{ background: card.color, color: card.iconColor }}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3 style={{ marginBottom: "20px", fontWeight: 700 }}>Asset Growth Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={lineData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="assets" stroke="#2563eb" strokeWidth={2} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 style={{ marginBottom: "20px", fontWeight: 700 }}>Asset Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: "#64748b", textAlign: "center", paddingTop: "80px" }}>No asset data yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
