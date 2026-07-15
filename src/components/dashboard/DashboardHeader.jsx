import React from "react";
import { FiPlus } from "react-icons/fi";
import { Link } from "react-router-dom";

const DashboardHeader = ({ username = "Developer" }) => (
  <header className="dashboard-header">
    <div>
      <p className="dashboard-header__eyebrow">Dashboard</p>
      <h1>Welcome back, {username}</h1>
      <p>Manage your repositories and recent CodeHub activity.</p>
    </div>
    <Link className="dashboard-primary-button" to="/create">
      <FiPlus aria-hidden="true" />
      New repository
    </Link>
  </header>
);

export default DashboardHeader;
