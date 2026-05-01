import React from "react";
import { FaExclamationTriangle, FaRedo } from "react-icons/fa";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("UI error boundary caught an error:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
      }}>
        <div style={{
          width: "100%",
          maxWidth: "560px",
          background: "#fff",
          border: "1px solid #fecaca",
          borderRadius: "20px",
          padding: "28px",
          boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)",
          textAlign: "center",
        }}>
          <div style={{
            width: "58px",
            height: "58px",
            borderRadius: "18px",
            background: "#fef2f2",
            color: "#dc2626",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.4rem",
            marginBottom: "16px",
          }}>
            <FaExclamationTriangle />
          </div>
          <h2 style={{ margin: "0 0 8px", color: "#0f172a", fontSize: "1.35rem" }}>
            Something went wrong
          </h2>
          <p style={{ margin: "0 0 20px", color: "#64748b", lineHeight: 1.6 }}>
            The page hit an unexpected error. Reloading usually restores the session.
          </p>
          <button type="button" className="primary-btn-pro" onClick={this.handleReload}>
            <FaRedo style={{ marginRight: "8px" }} />
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
