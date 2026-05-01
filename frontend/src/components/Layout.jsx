import React from "react";
import Sidebar from "./Sidebar";

const Layout = ({ children }) => {
  return (
    <div className="app-layout-pro">
      <Sidebar />
      <div className="main-content-pro">
        {children}
      </div>
    </div>
  );
};

export default Layout;
