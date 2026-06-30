import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaMoon,
  FaShieldAlt,
  FaSignOutAlt,
  FaSyncAlt,
  FaTable,
  FaUser,
  FaServer,
} from "react-icons/fa";
import API from "../api";
import PageHeader from "../components/PageHeader";

const PREFERENCES_KEY = "app_preferences";

const readJson = (key, fallback = {}) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};

const formatUptime = (seconds = 0) => {
  if (!seconds) return "Just started";

  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);

  if (days) return `${days}d ${hrs % 24}h`;
  if (hrs) return `${hrs}h ${mins % 60}m`;
  if (mins) return `${mins}m`;
  return `${seconds}s`;
};

const Toggle = ({ checked, onChange, label, description, icon }) => (
  <button
    type="button"
    className="settings-toggle"
    onClick={() => onChange(!checked)}
    aria-pressed={checked}
  >
    <span className="settings-toggle-icon">{icon}</span>
    <span className="settings-toggle-copy">
      <strong>{label}</strong>
      <small>{description}</small>
    </span>
    <span className={`settings-switch${checked ? " is-on" : ""}`}>
      <span />
    </span>
  </button>
);

const DetailRow = ({ label, value }) => (
  <div className="settings-detail-row">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

export default function Settings() {
  const navigate = useNavigate();
  const user = useMemo(() => readJson("user"), []);
  const [preferences, setPreferences] = useState(() => readJson(PREFERENCES_KEY));
  const [health, setHealth] = useState(null);
  const [healthState, setHealthState] = useState("idle");

  const profile = {
    name: user.full_name || user.name || "User",
    email: user.email || "Not available",
    role: user.role || "user",
  };

  const initials = profile.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  useEffect(() => {
    document.body.classList.toggle(
      "compact-table-density",
      Boolean(preferences.compactTables)
    );
    document.body.classList.toggle(
      "dark-mode",
      Boolean(preferences.darkMode)
    );
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const updatePreference = (key) => (value) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const checkHealth = async () => {
    setHealthState("loading");
    try {
      const response = await API.get("/health");
      setHealth(response.data);
      setHealthState("ok");
    } catch (err) {
      setHealth({
        error:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Unable to reach API",
      });
      setHealthState("error");
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const apiOnline = healthState === "ok";

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage your account, session, and workspace preferences"
      />

      <div className="settings-grid">
        <section className="settings-card settings-account-card">
          <div className="settings-avatar" aria-hidden="true">{initials}</div>
          <div className="settings-account-copy">
            <p>Signed in as</p>
            <h2>{profile.name}</h2>
            <span>{profile.email}</span>
          </div>
          <span className={`settings-role settings-role-${profile.role}`}>
            {profile.role}
          </span>
        </section>

        <section className="settings-card">
          <div className="settings-card-header">
            <span><FaUser /></span>
            <div>
              <h3>Account</h3>
              <p>Core identity details from your authenticated session.</p>
            </div>
          </div>

          <div className="settings-detail-list">
            <DetailRow label="Name" value={profile.name} />
            <DetailRow label="Email" value={profile.email} />
            <DetailRow label="Role" value={profile.role} />
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-header">
            <span><FaTable /></span>
            <div>
              <h3>Preferences</h3>
              <p>Only active settings that currently change the application.</p>
            </div>
          </div>

          <Toggle
            icon={<FaMoon />}
            label="Dark mode"
            description="Switch the entire app to a dark colour scheme."
            checked={Boolean(preferences.darkMode)}
            onChange={updatePreference("darkMode")}
          />
          <Toggle
            icon={<FaTable />}
            label="Compact table density"
            description="Use tighter spacing in data tables."
            checked={Boolean(preferences.compactTables)}
            onChange={updatePreference("compactTables")}
          />
        </section>

        <section className="settings-card">
          <div className="settings-card-header">
            <span><FaShieldAlt /></span>
            <div>
              <h3>Security</h3>
              <p>End this browser session when you are finished.</p>
            </div>
          </div>

          <div className="settings-status-card is-secure">
            <FaCheckCircle />
            <div>
              <strong>Session active</strong>
              <span>Your request authorization is active for this device.</span>
            </div>
          </div>

          <button type="button" className="settings-danger-btn" onClick={handleSignOut}>
            <FaSignOutAlt />
            Sign out
          </button>
        </section>

        <section className="settings-card">
          <div className="settings-card-header settings-card-header-row">
            <span><FaServer /></span>
            <div>
              <h3>System Status</h3>
              <p>Quick API availability check for the current deployment.</p>
            </div>
            <button
              type="button"
              className="settings-icon-btn"
              onClick={checkHealth}
              disabled={healthState === "loading"}
              title="Refresh status"
            >
              <FaSyncAlt />
            </button>
          </div>

          <div className={`settings-status-card ${apiOnline ? "is-secure" : "is-warning"}`}>
            {apiOnline ? <FaCheckCircle /> : <FaExclamationCircle />}
            <div>
              <strong>{apiOnline ? "API online" : healthState === "loading" ? "Checking API" : "API unavailable"}</strong>
              <span>
                {apiOnline
                  ? `Uptime ${formatUptime(health?.uptime)}`
                  : health?.error || "Waiting for status check."}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
