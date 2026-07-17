import React from "react";
import { Link } from "react-router-dom";
import "./navbar.css";
import NotificationBell from "./notifications/NotificationBell";
import { useAuth } from "../authContext";
import GlobalSearch from "./search/GlobalSearch";
import BrandLogo from "./common/BrandLogo";
import ThemeToggle from "./common/ThemeToggle";
import { useChat } from "../context/ChatContext";

const Navbar = () => {
  const { isAuthenticated } = useAuth() || {};
  const chat = useChat();
  return (
    <nav className="codehub-navbar">
      <BrandLogo />
      {isAuthenticated && <GlobalSearch />}
      <div className="codehub-navbar__links">
        {isAuthenticated && <Link to="/explore"><p>Explore</p></Link>}
        {isAuthenticated && <Link to="/contribute"><p>Contribute</p></Link>}
        {isAuthenticated && <Link to="/invitations"><p>Invitations</p></Link>}
        {isAuthenticated && <Link className="navbar-chat-link" to="/chat" aria-label={`Chat, ${chat?.totalUnread || 0} unread messages`}><p>Chat</p>{chat?.totalUnread > 0 && <span>{chat.totalUnread}</span>}</Link>}
        <ThemeToggle />
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


