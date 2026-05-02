import React from "react";
import { NavLink } from "react-router-dom";
import {
  FaTachometerAlt,
  FaUsers,
  FaBoxOpen,
  FaTags,
  FaClipboardList,
  FaTools,
  FaChartBar,
  FaCog,
  FaLaptopCode,
  FaRobot,
} from "react-icons/fa";

const Sidebar = () => {
  return (
    <div className="sidebar-pro">
      <div className="sidebar-top">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <FaLaptopCode />
          </div>
          <div>
            <h3>AssetSphere Pro</h3>
            <p>Enterprise Control</p>
          </div>
        </div>

        {/* Nav Links */}
        <div className="sidebar-menu">
          <NavLink to="/dashboard" className="sidebar-link">
            <FaTachometerAlt className="sidebar-icon" />
            <span>Control Center</span>
          </NavLink>

          <NavLink to="/users" className="sidebar-link">
            <FaUsers className="sidebar-icon" />
            <span>Users</span>
          </NavLink>

          <NavLink to="/assets" className="sidebar-link">
            <FaBoxOpen className="sidebar-icon" />
            <span>Asset Inventory</span>
          </NavLink>

          <NavLink to="/categories" className="sidebar-link">
            <FaTags className="sidebar-icon" />
            <span>Asset Categories</span>
          </NavLink>

          <NavLink to="/assignments" className="sidebar-link">
            <FaClipboardList className="sidebar-icon" />
            <span>Allocation Records</span>
          </NavLink>

          <NavLink to="/maintenance" className="sidebar-link">
            <FaTools className="sidebar-icon" />
            <span>Service Desk</span>
          </NavLink>

          <NavLink to="/reports" className="sidebar-link">
            <FaChartBar className="sidebar-icon" />
            <span>Reports & Analytics</span>
          </NavLink>

          <NavLink to="/ai-agent" className="sidebar-link">
            <FaRobot className="sidebar-icon" />
            <span>AI Troubleshooter</span>
          </NavLink>

          <NavLink to="/settings" className="sidebar-link">
            <FaCog className="sidebar-icon" />
            <span>Settings</span>
          </NavLink>
        </div>
      </div>

      {/* Footer — designer credit only, no sign out button */}
      <div className="sidebar-footer">
        <div className="designer-credit">
          Designed by <span>KUNAL NARWAT</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
