import React from "react";
import { Link } from "react-router-dom";
import "./navbar.css";
import NotificationBell from "./notifications/NotificationBell";
import { useAuth } from "../authContext";
import GlobalSearch from "./search/GlobalSearch";
import BrandLogo from "./common/BrandLogo";

const Navbar = () => {
  const { isAuthenticated } = useAuth() || {};
  return (
    <nav className="codehub-navbar">
      <BrandLogo />
      {isAuthenticated && <GlobalSearch />}
      <div className="codehub-navbar__links">
        {isAuthenticated && <Link to="/explore"><p>Explore</p></Link>}
        {isAuthenticated && <Link to="/invitations"><p>Invitations</p></Link>}
        <NotificationBell />
        {isAuthenticated && <Link to="/create">
          <p>Create a Repository</p>
        </Link>}
        {isAuthenticated && <Link to="/profile">
          <p>Profile</p>
        </Link>}
      </div>
    </nav>
  );
};

export default Navbar;


