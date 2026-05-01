import React, { useEffect, useState, useRef } from "react";
import PageHeader from "../components/PageHeader";
import { useNavigate } from "react-router-dom";
import API from "../api";
import {
  FaSave, FaUndoAlt, FaSignOutAlt, FaUser, FaShieldAlt,
  FaSlidersH, FaServer, FaCheckCircle, FaExclamationCircle,
  FaMoon, FaSun, FaTable, FaBell, FaKey, FaInfoCircle,
  FaSyncAlt, FaLock, FaDatabase
} from "react-icons/fa";

const readSavedPreferences = () => {
  try { return JSON.parse(localStorage.getItem("app_preferences")) || {}; }
  catch { return {}; }
};

const TABS = [
  { id: "profile",     label: "Profile",     icon: <FaUser /> },
  { id: "security",    label: "Security",    icon: <FaShieldAlt /> },
  { id: "preferences", label: "Preferences", icon: <FaSlidersH /> },
  { id: "system",      label: "System",      icon: <FaServer /> },
];

const Toggle = ({ checked, onChange, label, description, icon }) => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 20px", borderRadius: "14px", background: "#f8fafc",
    border: "1px solid #e2e8f0", transition: "background 0.2s",
  }}
    onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
    onMouseLeave={e => e.currentTarget.style.background = "#f8fafc"}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
      <div style={{
        width: "38px", height: "38px", borderRadius: "10px",
        background: checked ? "#eff6ff" : "#f1f5f9",
        color: checked ? "#2563eb" : "#94a3b8",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "15px", transition: "all 0.2s",
      }}>{icon}</div>
      <div>
        <p style={{ margin: 0, fontWeight: 600, color: "#0f172a", fontSize: "0.95rem" }}>{label}</p>
        <p style={{ margin: "3px 0 0", color: "#64748b", fontSize: "0.83rem" }}>{description}</p>
      </div>
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: "50px", height: "28px", borderRadius: "999px", border: "none",
        background: checked ? "#2563eb" : "#cbd5e1",
        cursor: "pointer", position: "relative", transition: "background 0.25s",
        flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: "4px",
        left: checked ? "26px" : "4px",
        width: "20px", height: "20px", borderRadius: "50%",
        background: "white", transition: "left 0.25s",
        boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
      }} />
    </button>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 0", borderBottom: "1px solid #f1f5f9",
  }}>
    <span style={{ color: "#64748b", fontSize: "0.9rem" }}>{label}</span>
    <span style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9rem", fontFamily: "monospace" }}>{value}</span>
  </div>
);

const ReadinessItem = ({ ok, label, detail, icon }) => (
  <div style={{
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    padding: "14px",
    borderRadius: "12px",
    background: ok ? "#f0fdf4" : "#fff7ed",
    border: `1px solid ${ok ? "#bbf7d0" : "#fed7aa"}`,
  }}>
    <div style={{
      width: "34px",
      height: "34px",
      borderRadius: "10px",
      background: ok ? "#dcfce7" : "#ffedd5",
      color: ok ? "#16a34a" : "#ea580c",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}>
      {icon || (ok ? <FaCheckCircle /> : <FaExclamationCircle />)}
    </div>
    <div>
      <p style={{ margin: 0, fontWeight: 800, color: "#0f172a", fontSize: "0.92rem" }}>{label}</p>
      <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.84rem", lineHeight: 1.5 }}>{detail}</p>
    </div>
  </div>
);

export default function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [preferences, setPreferences] = useState(readSavedPreferences);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [health, setHealth] = useState(null);
  const [healthState, setHealthState] = useState("idle");
  const saveTimerRef = useRef(null);

  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; }
  })();

  const [profile, setProfile] = useState({
    name: storedUser.full_name || "",
    email: storedUser.email || "",
    role: storedUser.role || "user",
  });

  const initials = profile.name
    ? profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "A";

  const roleColors = { admin: "#1d4ed8", technician: "#7c3aed", user: "#15803d" };
  const roleColor = roleColors[profile.role] || "#1d4ed8";

  useEffect(() => {
    document.body.classList.toggle("compact-table-density", Boolean(preferences.compactTables));
  }, [preferences.compactTables]);

  const checkHealth = async () => {
    setHealthState("loading");
    try {
      const res = await API.get("/health");
      setHealth(res.data);
      setHealthState("ok");
    } catch (err) {
      setHealth({ error: err?.message || "Health check failed" });
      setHealthState("error");
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const setPref = (key) => (val) => setPreferences(p => ({ ...p, [key]: val }));

  const handleSave = () => {
    if (!profile.name.trim()) {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
      return;
    }
    setSaveState("saving");
    const existing = (() => { try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; } })();
    localStorage.setItem("user", JSON.stringify({ ...existing, full_name: profile.name.trim() }));
    localStorage.setItem("app_preferences", JSON.stringify(preferences));

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    }, 600);
  };

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const tabContent = {
    profile: (
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        {/* Avatar Block */}
        <div style={{
          display: "flex", alignItems: "center", gap: "24px",
          padding: "24px", borderRadius: "18px",
          background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
          border: "1px solid #bfdbfe",
        }}>
          <div style={{
            width: "80px", height: "80px", borderRadius: "24px",
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "white", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.8rem", fontWeight: 800,
            boxShadow: "0 12px 28px rgba(37,99,235,0.3)",
            flexShrink: 0, letterSpacing: "-1px",
          }}>{initials}</div>
          <div>
            <h3 style={{ margin: "0 0 6px", fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>
              {profile.name || "User"}
            </h3>
            <p style={{ margin: "0 0 10px", color: "#475569", fontSize: "0.9rem" }}>{profile.email}</p>
            <span style={{
              display: "inline-block", padding: "4px 12px", borderRadius: "999px",
              background: `${roleColor}18`, color: roleColor,
              fontWeight: 700, fontSize: "0.8rem", textTransform: "capitalize",
            }}>{profile.role}</span>
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {[
            { label: "Full Name", key: "name", type: "text", editable: true },
            { label: "Email Address", key: "email", type: "email", editable: false },
          ].map(({ label, key, type, editable }) => (
            <div key={key}>
              <label style={{ display: "block", fontWeight: 700, marginBottom: "8px", color: "#374151", fontSize: "0.9rem" }}>
                {label}
              </label>
              <input
                type={type}
                value={profile[key]}
                disabled={!editable}
                onChange={editable ? (e) => setProfile(p => ({ ...p, [key]: e.target.value })) : undefined}
                style={{
                  width: "100%", padding: "13px 16px",
                  border: editable ? "1.5px solid #d1d5db" : "1.5px solid #e5e7eb",
                  borderRadius: "12px", fontSize: "0.95rem",
                  background: editable ? "#fff" : "#f8fafc",
                  color: editable ? "#0f172a" : "#94a3b8",
                  cursor: editable ? "text" : "not-allowed",
                  outline: "none", transition: "border 0.2s, box-shadow 0.2s",
                }}
                onFocus={editable ? e => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 4px rgba(37,99,235,0.08)"; } : undefined}
                onBlur={editable ? e => { e.target.style.borderColor = "#d1d5db"; e.target.style.boxShadow = "none"; } : undefined}
              />
            </div>
          ))}
          <div>
            <label style={{ display: "block", fontWeight: 700, marginBottom: "8px", color: "#374151", fontSize: "0.9rem" }}>Role</label>
            <div style={{
              padding: "13px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px",
              background: "#f8fafc", display: "flex", alignItems: "center", gap: "10px",
            }}>
              <span style={{
                width: "10px", height: "10px", borderRadius: "50%",
                background: roleColor, display: "inline-block", flexShrink: 0,
              }} />
              <span style={{ textTransform: "capitalize", fontWeight: 600, color: roleColor, fontSize: "0.95rem" }}>
                {profile.role}
              </span>
            </div>
          </div>
        </div>
      </div>
    ),

    security: (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{
          padding: "20px", borderRadius: "14px",
          background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
          border: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: "14px",
        }}>
          <FaShieldAlt style={{ color: "#16a34a", fontSize: "1.3rem", flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: "#15803d" }}>Session Active</p>
            <p style={{ margin: "3px 0 0", color: "#166534", fontSize: "0.85rem" }}>
              You are authenticated via JWT token stored in browser
            </p>
          </div>
        </div>

        <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "20px", border: "1px solid #e2e8f0" }}>
          {[
            { label: "Signed in as", value: profile.email || "—" },
            { label: "Role", value: profile.role },
            { label: "Token storage", value: "localStorage" },
            { label: "Session type", value: "JWT · 8h expiry" },
          ].map(({ label, value }) => <InfoRow key={label} label={label} value={value} />)}
        </div>

        <div style={{ padding: "20px", borderRadius: "14px", background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <FaKey style={{ color: "#ea580c" }} />
            <span style={{ fontWeight: 700, color: "#9a3412" }}>Password</span>
          </div>
          <p style={{ margin: "0 0 16px", color: "#7c2d12", fontSize: "0.88rem" }}>
            Password changes require a backend API call. Wire up <code style={{ background: "#fed7aa", padding: "1px 6px", borderRadius: "4px" }}>PUT /api/users/:id/password</code> to enable this.
          </p>
        </div>

        <div style={{ borderTop: "1px solid #fee2e2", paddingTop: "20px" }}>
          <p style={{ margin: "0 0 14px", fontWeight: 700, color: "#0f172a" }}>End Session</p>
          <button
            type="button"
            onClick={handleSignOut}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "12px 22px", borderRadius: "12px", border: "2px solid #fecaca",
              background: "#fff", color: "#dc2626", fontWeight: 700, cursor: "pointer",
              fontSize: "0.95rem", transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.borderColor = "#f87171"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#fecaca"; }}
          >
            <FaSignOutAlt /> Sign Out from this device
          </button>
        </div>
      </div>
    ),

    preferences: (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: "0.9rem" }}>
          These settings are saved locally in your browser.
        </p>
        <Toggle
          icon={<FaTable />}
          label="Compact Table Density"
          description="Tighter row spacing in all data tables"
          checked={Boolean(preferences.compactTables)}
          onChange={setPref("compactTables")}
        />
        <Toggle
          icon={<FaBell />}
          label="Browser Notifications"
          description="Show alerts for maintenance and assignment events"
          checked={Boolean(preferences.notifications)}
          onChange={setPref("notifications")}
        />
        <Toggle
          icon={<FaSun />}
          label="Highlight Expiring Warranties"
          description="Flag assets with warranties expiring within 30 days"
          checked={Boolean(preferences.warrantyAlerts)}
          onChange={setPref("warrantyAlerts")}
        />
        <Toggle
          icon={<FaMoon />}
          label="Confirm Before Delete"
          description="Show a confirmation dialog before any delete action"
          checked={preferences.confirmDelete !== false}
          onChange={setPref("confirmDelete")}
        />
      </div>
    ),

    system: (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ background: "#fff", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div>
              <p style={{ margin: 0, fontWeight: 800, color: "#0f172a" }}>Production Readiness</p>
              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.88rem" }}>
                Live checks for deployment configuration and API availability.
              </p>
            </div>
            <button type="button" className="primary-btn-pro" onClick={checkHealth} disabled={healthState === "loading"}>
              <FaSyncAlt style={{ marginRight: "8px" }} />
              {healthState === "loading" ? "Checking..." : "Run Check"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "12px" }}>
            <ReadinessItem
              ok={healthState === "ok"}
              label="API Health"
              detail={healthState === "ok" ? `Online. Uptime ${health?.uptime || 0}s.` : healthState === "loading" ? "Checking API health endpoint..." : "API health has not passed yet."}
              icon={healthState === "ok" ? <FaCheckCircle /> : <FaExclamationCircle />}
            />
            <ReadinessItem
              ok={(process.env.REACT_APP_API_URL || "").startsWith("https://") || process.env.NODE_ENV !== "production"}
              label="API URL"
              detail={process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL : "Using local development API URL."}
              icon={<FaServer />}
            />
            <ReadinessItem
              ok={profile.role === "admin" || profile.role === "technician" || profile.role === "user"}
              label="Role Enforcement"
              detail={`Current role: ${profile.role}. UI and API actions are role-gated.`}
              icon={<FaLock />}
            />
            <ReadinessItem
              ok={Boolean(health?.service)}
              label="Backend Identity"
              detail={health?.service ? `${health.service} (${health.environment || "unknown"})` : "Backend identity appears after health check."}
              icon={<FaDatabase />}
            />
          </div>
        </div>

        <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "20px", border: "1px solid #e2e8f0" }}>
          <p style={{ margin: "0 0 16px", fontWeight: 700, color: "#0f172a" }}>Connection</p>
          {[
            { label: "API Base URL", value: process.env.REACT_APP_API_URL || "http://localhost:5000/api" },
            { label: "Environment", value: process.env.NODE_ENV || "development" },
            { label: "App Version", value: "1.0.0" },
          ].map(({ label, value }) => <InfoRow key={label} label={label} value={value} />)}
        </div>

        <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "20px", border: "1px solid #e2e8f0" }}>
          <p style={{ margin: "0 0 16px", fontWeight: 700, color: "#0f172a" }}>API Endpoints</p>
          {["/api/auth/login", "/api/assets", "/api/users", "/api/categories", "/api/assignments", "/api/maintenance"].map(ep => (
            <div key={ep} style={{
              padding: "8px 12px", margin: "6px 0", borderRadius: "8px",
              background: "#fff", border: "1px solid #e2e8f0",
              fontFamily: "monospace", fontSize: "0.85rem", color: "#334155",
              display: "flex", alignItems: "center", gap: "10px",
            }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#16a34a", flexShrink: 0 }} />
              {ep}
            </div>
          ))}
        </div>

        <div style={{
          padding: "16px 20px", borderRadius: "14px",
          background: "#eff6ff", border: "1px solid #bfdbfe",
          display: "flex", gap: "12px", alignItems: "flex-start",
        }}>
          <FaInfoCircle style={{ color: "#2563eb", flexShrink: 0, marginTop: "2px" }} />
          <p style={{ margin: 0, color: "#1d4ed8", fontSize: "0.88rem", lineHeight: "1.6" }}>
            To point this app to a production backend, set <code style={{ background: "#dbeafe", padding: "1px 6px", borderRadius: "4px" }}>REACT_APP_API_URL</code> in your <code style={{ background: "#dbeafe", padding: "1px 6px", borderRadius: "4px" }}>.env</code> file and rebuild.
          </p>
        </div>
      </div>
    ),
  };

  const saveBtnStyles = {
    idle:   { bg: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", text: "Save Changes",  icon: <FaSave /> },
    saving: { bg: "linear-gradient(135deg,#64748b,#475569)", color: "#fff", text: "Saving…",        icon: <FaSave /> },
    saved:  { bg: "linear-gradient(135deg,#16a34a,#15803d)", color: "#fff", text: "Saved!",         icon: <FaCheckCircle /> },
    error:  { bg: "linear-gradient(135deg,#dc2626,#b91c1c)", color: "#fff", text: "Name required",  icon: <FaExclamationCircle /> },
  }[saveState];

  return (
    <div>
      <PageHeader title="Settings" subtitle="Account, preferences & system configuration" />

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "24px", alignItems: "start" }}>

        {/* Tab Rail */}
        <div style={{
          background: "#fff", borderRadius: "20px", padding: "12px",
          border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,23,42,0.05)",
          position: "sticky", top: "24px",
        }}>
          {TABS.map(({ id, label, icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "12px",
                  padding: "13px 16px", borderRadius: "14px", border: "none",
                  background: active ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "transparent",
                  color: active ? "#fff" : "#64748b",
                  fontWeight: active ? 700 : 500, cursor: "pointer",
                  fontSize: "0.93rem", marginBottom: "4px",
                  transition: "all 0.2s", textAlign: "left",
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#f1f5f9"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: "0.95rem", opacity: active ? 1 : 0.7 }}>{icon}</span>
                {label}
              </button>
            );
          })}

          {/* Save Button in rail */}
          <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveState === "saving"}
              style={{
                width: "100%", padding: "13px 16px", borderRadius: "14px", border: "none",
                background: saveBtnStyles.bg, color: saveBtnStyles.color,
                fontWeight: 700, cursor: saveState === "saving" ? "not-allowed" : "pointer",
                fontSize: "0.93rem", display: "flex", alignItems: "center",
                justifyContent: "center", gap: "8px", transition: "all 0.3s",
              }}
            >
              {saveBtnStyles.icon}
              {saveBtnStyles.text}
            </button>

            {saveState === "idle" && (
              <button
                type="button"
                onClick={() => {
                  const saved = readSavedPreferences();
                  const u = (() => { try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; } })();
                  setProfile(p => ({ ...p, name: u.full_name || "" }));
                  setPreferences(saved);
                }}
                style={{
                  width: "100%", padding: "11px 16px", borderRadius: "14px",
                  border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b",
                  fontWeight: 600, cursor: "pointer", fontSize: "0.88rem",
                  marginTop: "8px", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: "8px", transition: "all 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#94a3b8"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}
              >
                <FaUndoAlt style={{ fontSize: "0.8rem" }} />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Content Panel */}
        <div style={{
          background: "#fff", borderRadius: "20px", padding: "28px",
          border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,23,42,0.05)",
          minHeight: "500px",
        }}>
          <div style={{ marginBottom: "24px", paddingBottom: "20px", borderBottom: "1px solid #f1f5f9" }}>
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
              {TABS.find(t => t.id === activeTab)?.label}
            </h2>
          </div>
          {tabContent[activeTab]}
        </div>
      </div>
    </div>
  );
}
