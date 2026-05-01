import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { FaLaptop, FaEye, FaEyeSlash, FaSignInAlt } from "react-icons/fa";

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/auth/login", form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/dashboard");
    } catch (err) {
      // backend sends { message: "..." } — handle both shapes
      setError(err.response?.data?.message || err.response?.data?.error || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-clean">
      <div className="login-card-clean">
        <div className="login-logo-clean"><FaLaptop /></div>
        <h2 className="login-title-clean">IT Asset Management</h2>
        <p className="login-subtitle-clean">Admin Login Panel</p>

        {error && <div className="login-error-clean">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="login-group-clean">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="login-group-clean">
            <label>Password</label>
            <div className="password-wrapper-clean">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
              <span className="password-toggle-clean" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          <button type="submit" className="login-btn-clean" disabled={loading}>
            {loading ? "Logging in..." : <><FaSignInAlt style={{ marginRight: "8px" }} />Login</>}
          </button>
        </form>

        <div className="login-footer-clean">
          Final Year Project • Smart IT Asset Management System
          <br />
          <span className="designer-credit-login" style={{ fontWeight: 700, color: "#475569" }}>
            Designed by KUNAL NARWAT
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
