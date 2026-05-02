import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FaRobot } from "react-icons/fa";

const AIFloatingButton = () => {
  const location = useLocation();
  const active = location.pathname === "/ai-agent";

  return (
    <Link
      to="/ai-agent"
      className={`ai-floating-button${active ? " active" : ""}`}
      title="Open AI Troubleshooter"
      aria-label="Open AI Troubleshooter"
    >
      <FaRobot />
      <span>AI</span>
    </Link>
  );
};

export default AIFloatingButton;
