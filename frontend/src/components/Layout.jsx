import React from "react";
import Sidebar from "./Sidebar";
import AIFloatingButton from "./AIFloatingButton";

const Layout = ({ children }) => {
  return (
    <div className="app-layout-pro">
      <Sidebar />
      <div className="main-content-pro">
        {children}
      </div>
      <AIFloatingButton />
    </div>
  );
};

export default Layout;
