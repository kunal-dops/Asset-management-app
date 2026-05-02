import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./styles.css";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Assets from "./pages/Assets";
import Categories from "./pages/Categories";
import Assignments from "./pages/Assignments";
import Maintenance from "./pages/Maintenance";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import AIAgent from "./pages/AIAgent";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        {[
          { path: "/dashboard", element: <Dashboard /> },
          { path: "/users", element: <Users /> },
          { path: "/assets", element: <Assets /> },
          { path: "/categories", element: <Categories /> },
          { path: "/assignments", element: <Assignments /> },
          { path: "/maintenance", element: <Maintenance /> },
          { path: "/reports", element: <Reports /> },
          { path: "/ai-agent", element: <AIAgent /> },
          { path: "/settings", element: <Settings /> },
        ].map(({ path, element }) => (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Layout>{element}</Layout>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
        ))}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
