import React from "react";
import { Link } from "react-router-dom";
import NotificationItem from "./NotificationItem";

const NotificationDropdown = ({ notifications, loading, error, onOpen, onMarkRead, onMarkAll }) => (
  <section className="notification-dropdown" aria-label="Notifications">
    <header><h2>Notifications</h2><button type="button" onClick={onMarkAll} disabled={!notifications.some((item) => !item.read)}>Mark all as read</button></header>
    {loading && <p className="notification-dropdown__state" role="status">Loading notifications…</p>}
    {error && <p className="notification-dropdown__state notification-dropdown__state--error" role="alert">{error}</p>}
    {!loading && !error && !notifications.length && <p className="notification-dropdown__state">You’re all caught up.</p>}
    <div className="notification-dropdown__list">
      {notifications.map((item) => <NotificationItem key={item._id} notification={item} compact onOpen={onOpen} onMarkRead={onMarkRead} />)}
    </div>
    <Link className="notification-dropdown__all" to="/notifications">View all notifications</Link>
  </section>
);

export default NotificationDropdown;
