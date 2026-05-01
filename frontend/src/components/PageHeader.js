import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaSignOutAlt, FaUserCircle, FaChevronDown
} from "react-icons/fa";

const PageHeader = ({ title, subtitle }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; }
  })();

  const initials = user.full_name
    ? user.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "A";

  const roleColors = {
    admin:      { bg: "linear-gradient(135deg,#2563eb,#1d4ed8)", badge: "#dbeafe", badgeText: "#1d4ed8" },
    technician: { bg: "linear-gradient(135deg,#7c3aed,#6d28d9)", badge: "#ede9fe", badgeText: "#6d28d9" },
    user:       { bg: "linear-gradient(135deg,#16a34a,#15803d)", badge: "#dcfce7", badgeText: "#15803d" },
  };
  const roleStyle = roleColors[user.role] || roleColors.admin;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const menuItems = [
    {
      icon: <FaUserCircle style={{ fontSize: "0.95rem" }} />,
      label: "My Profile",
      sublabel: user.email || "",
      onClick: () => { navigate("/settings"); setOpen(false); },
      dividerAfter: true,
    },
    {
      icon: <FaSignOutAlt style={{ fontSize: "0.9rem" }} />,
      label: "Sign Out",
      sublabel: "End your session",
      onClick: handleSignOut,
      danger: true,
      dividerAfter: false,
    },
  ];

  return (
    <div className="page-header-pro" style={{ position: "relative", zIndex: 100 }}>
      {/* Left: Title */}
      <div>
        <h1 className="page-title-pro">{title}</h1>
        {subtitle && <p className="page-subtitle-pro">{subtitle}</p>}
      </div>

      {/* Right: Profile Button */}
      <div ref={dropdownRef} style={{ position: "relative" }}>
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            background: open ? "#f1f5f9" : "#fff",
            border: `1.5px solid ${open ? "#2563eb" : "#e2e8f0"}`,
            borderRadius: "14px", padding: "8px 14px 8px 8px",
            cursor: "pointer", transition: "all 0.2s",
            boxShadow: open ? "0 0 0 4px rgba(37,99,235,0.08)" : "0 2px 8px rgba(15,23,42,0.06)",
            userSelect: "none", 
          }}
          onMouseEnter={e => {
            if (!open) e.currentTarget.style.borderColor = "#2563eb";
          }}
          onMouseLeave={e => {
            if (!open) e.currentTarget.style.borderColor = "#e2e8f0";
          }}
        >
          {/* Avatar */}
          <div style={{
            width: "38px", height: "38px", borderRadius: "10px",
            background: roleStyle.bg,
            color: "#fff", display: "flex", alignItems: "center",
            justifyContent: "center", fontWeight: 800, fontSize: "0.95rem",
            boxShadow: "0 4px 10px rgba(37,99,235,0.25)",
            flexShrink: 0, letterSpacing: "-0.5px",
          }}>
            {initials}
          </div>

          {/* Name + Role */}
          <div style={{ textAlign: "left" }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", lineHeight: 1.2 }}>
              {user.full_name?.split(" ")[0] || "Admin"}
            </p>
            <span style={{
              display: "inline-block", padding: "1px 7px", borderRadius: "999px",
              background: roleStyle.badge, color: roleStyle.badgeText,
              fontSize: "0.72rem", fontWeight: 700, textTransform: "capitalize",
              lineHeight: 1.6,
            }}>
              {user.role || "admin"}
            </span>
          </div>

          {/* Chevron */}
          <FaChevronDown style={{
            color: "#94a3b8", fontSize: "0.75rem", marginLeft: "2px",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }} />
        </button>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 10px)",
            width: "260px",
            background: "#fff", borderRadius: "18px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 20px 60px rgba(15,23,42,0.15), 0 4px 16px rgba(15,23,42,0.08)",
            overflow: "hidden",
            animation: "dropIn 0.18s ease",
          }}>
            {/* User info header */}
            <div style={{
              padding: "16px 18px",
              background: "linear-gradient(135deg, #f8fafc, #f1f5f9)",
              borderBottom: "1px solid #f1f5f9",
              display: "flex", alignItems: "center", gap: "12px",
            }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "12px",
                background: roleStyle.bg, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: "1.1rem",
                boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                flexShrink: 0,
              }}>
                {initials}
              </div>
              <div style={{ overflow: "hidden" }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
                  {user.full_name || "Admin User"}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.email || ""}
                </p>
              </div>
            </div>

            {/* Menu items */}
            <div style={{ padding: "8px" }}>
              {menuItems.map((item, i) => (
                <React.Fragment key={i}>
                  <button
                    type="button"
                    onClick={item.onClick}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: "12px",
                      padding: "10px 12px", borderRadius: "12px", border: "none",
                      background: "transparent", cursor: "pointer",
                      transition: "background 0.15s", textAlign: "left",
                      color: item.danger ? "#dc2626" : "#374151",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = item.danger ? "#fef2f2" : "#f8fafc";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div style={{
                      width: "34px", height: "34px", borderRadius: "9px",
                      background: item.danger ? "#fef2f2" : "#f1f5f9",
                      color: item.danger ? "#dc2626" : "#64748b",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, transition: "all 0.15s",
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <p style={{
                        margin: 0, fontWeight: 700, fontSize: "0.88rem",
                        color: item.danger ? "#dc2626" : "#0f172a",
                      }}>
                        {item.label}
                      </p>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: item.danger ? "#f87171" : "#94a3b8" }}>
                        {item.sublabel}
                      </p>
                    </div>
                  </button>
                  {item.dividerAfter && (
                    <div style={{ height: "1px", background: "#f1f5f9", margin: "6px 4px" }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default PageHeader;